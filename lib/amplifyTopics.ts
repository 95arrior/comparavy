import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";
import type { TrendTopic } from "./trendTopics";
import { pickHookPattern, OPEN_LOOP_GUIDE, containsBanned } from "./hookPatterns";

// ★트렌드 씨앗 × 개인화 증식(C단계) — 같은 씨앗·롱테일이라도 유저마다 '앵글 브리프'가 달라 다른 글이 나온다.
//  무중복 원리: 토픽(키워드)은 겹쳐도 되고, 글의 방향·구조·톤·독자가 달라야 홈판 피드에서 노출된다.
//  구조 조합(의도×서두×전개×마무리×톤)은 코드가 userId로 결정론적 분산 → 무중복 보장(스케일 안전).
//  창작(제목·독자 페르소나·훅)은 LLM이 그 조합 안에서. 검증(gap·momentum)은 씨앗층에서 끝났다.

export interface AngleBrief {
  intent: string;   // 의도
  opening: string;  // 서두 유형
  flow: string;     // 전개 순서
  closing: string;  // 마무리 방식
  tone: string;     // 톤·문장 리듬
  reader: string;   // 독자 페르소나(LLM)
  hook: string;     // 첫 문단 훅(LLM)
  coreWord: string; // 시의성 코어(제목 필수)
  verdict?: string;    // ★편집력: 한 문장 판결(독자가 지금 할 행동/선택)
  cutList?: string[];  // ★다루지 않을 하위 소재 1~3(+짧은 이유)
  branchAxis?: string; // ★독자 상황 분기 축+분기 2~4(예: "가구형태: 1인→A / 맞벌이→B")
}
// 대표이미지 합성 카피 — 코드가 렌더(절대 안 깨짐). 길이 상한은 축소 썸네일 가독 기준.
export interface ThumbCopy {
  mainCopy: string;   // 1~2줄, 20자 이내. \n으로 줄 구분
  subCopy: string;    // 15자 이내(선택)
  badge: string;      // 카테고리 배지
}
export interface AmplifiedTopic {
  keyword: string;       // 실검증 롱테일
  title: string;         // 홈피드(홈판) 최적화 후킹 제목 — 트렌드 종족의 주 싸움터(훅 패턴 적용)
  titleSearch: string;   // 검색형 제목(롱테일 포함)
  newsContext: string | null;
  sourceTitle?: string | null;
  brief: AngleBrief;
  briefText: string; // brief를 엔진 주입용 지시문으로 직렬화(클라 스레딩용)
  hookKey: string;   // 적용된 훅 패턴 key
  thumb: ThumbCopy;  // 대표이미지 합성 카피
  source?: string;   // 씨앗 출처(news/season/discover) — 배지 분리
  // ★시리즈(수익 증폭 Part 1) — 성립 기준 통과 씨앗만. 미달=단발(강제 금지 — 억지 4부작이 더 나쁘다).
  series?: { title: string; arc: { role: string; angle: string }[] } | null;
}

// ── 앵글 차원(구조 지문) — 스펙 최소치: 서두6·전개6·마무리5·톤5·의도6 ──
const INTENT = ["정보 정리", "경험 공유", "비교 분석", "체크리스트", "문답(FAQ)", "시간순 가이드"];
const OPENING = ["오해 깨기 반전", "공감 상황 훅", "결론 선공개", "의외의 숫자 제시", "질문 던지기", "실패담 도입"];
const FLOW = ["문제→원인→해결", "단계별 순서", "비교표 중심", "자주 묻는 질문 나열", "시간순 흐름", "상황별 분기"];
const CLOSING = ["핵심 요약", "이런 분께 도움", "다음 행동 안내", "놓치기 쉬운 주의점", "한 줄 정리와 응원"];
const TONE = ["짧은 문장 위주", "차분한 설명형", "문답 교차", "담백한 기록형", "친근한 조언형"];

// 조합 공간 크기(구조만) = 6×6×6×5×5 = 5,400. × 롱테일 선택(~6) = 32,400.
// 여기에 유저 온보딩으로 갈리는 '독자 페르소나'(LLM)까지 곱하면, 온보딩이 다른 실제 유저 간엔 사실상 무한.
// 온보딩이 동일한 유저 1만 명이 '같은 씨앗'에 몰려도 구조×롱테일 32,400 > 10,000이라 대부분 무중복.
export const ANGLE_COMBO_SPACE = INTENT.length * OPENING.length * FLOW.length * CLOSING.length * TONE.length;

function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// ★결정론적 구조 조합 배정 — (userId, 씨앗, 날짜)로 의도·서두·전개·마무리·톤을 분산. 유저 간 상이.
export function assignAngle(userId: string, seedKeyword: string, day: string): Pick<AngleBrief, "intent" | "opening" | "flow" | "closing" | "tone"> {
  const h = fnv(`${userId}|${seedKeyword}|${day}`);
  return {
    intent: INTENT[h % INTENT.length],
    opening: OPENING[(h >>> 3) % OPENING.length],
    flow: FLOW[(h >>> 6) % FLOW.length],
    closing: CLOSING[(h >>> 9) % CLOSING.length],
    tone: TONE[(h >>> 12) % TONE.length],
  };
}

// ★프롬프트 조립 공통 규칙 — 값이 비면 그 줄을 '주입하지 않는다'(빈 문자열 주입 금지). 구조적.
//  section(label, value): value가 빈 값이면 null 반환 → 조립부에서 filter로 제거.
function section(template: (v: string) => string, value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v ? template(v) : null;
}
// 앵글 브리프 → 생성 엔진 주입용 지시문(순수 함수). 빈 필드는 섹션 자체를 생략.
export function briefToDirective(b: AngleBrief): string {
  const lines = [
    "[앵글 브리프 — 이 글만의 방향(구조 지문)]",
    section((v) => `- 의도: ${v}`, b.intent),
    section((v) => `- 독자: ${v}`, b.reader),
    section((v) => `- 서두: ${v}로 시작한다`, b.opening),
    section((v) => `- 전개: ${v} 순서로 푼다`, b.flow),
    section((v) => `- 마무리: ${v}로 끝낸다`, b.closing),
    section((v) => `- 톤·문장 리듬: ${v}`, b.tone),
    section((v) => `- 첫 문단 훅: ${v}`, b.hook),
    section((v) => `- 시의성 코어 '${v}'는 제목과 도입에 반드시 살린다.`, b.coreWord),
    section((v) => `- ★판결(verdict): "${v}" — 리드 직후 '바쁘면 이것만' 결론 블록의 핵심으로 쓴다.`, b.verdict),
    section((v) => `- ★덜어냄(cut): 다음 소재는 본문에서 다루지 않는다(범위 선언 1회만): ${v}`, (b.cutList ?? []).join(" / ")),
    section((v) => `- ★상황 분기: ${v} — 자격·조건 섹션 근처에 분기 블록 1회.`, b.branchAxis),
    "위 방향을 이 글의 뼈대로 삼되, 엔진의 안전·품질·모바일 포맷 규칙은 그대로 지킨다.",
  ];
  return lines.filter((l): l is string => Boolean(l)).join("\n");
}

// ★썸네일 메인 카피 유효성 — 최대 2줄, 줄당 10자 이내, 전체 20자 이내, 느낌표·금지어 없음.
//  자르기가 아니라 통과/반려 판정. 통과한 카피만 렌더된다(미완성 문구 렌더 불가).
export function validThumbMain(s: string): boolean {
  const t = (s ?? "").trim();
  if (!t) return false;
  if (/!/.test(t)) return false;
  if (containsBanned(t)) return false;
  const lines = t.split("\n").map((l) => [...l.trim()].length);
  if (lines.length > 2) return false;
  if (lines.some((n) => n < 1 || n > 10)) return false; // 줄당 10자 초과 금지
  return lines.reduce((a, c) => a + c, 0) <= 20;         // 전체 20자 이내
}

export interface AmplifyProfile {
  sub_category?: string | null;
  audience?: string[] | null;
  target?: string | null;
  biz_address?: string | null;
}

function userAxis(profile: AmplifyProfile | null): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.sub_category) parts.push(`세부 주제: ${profile.sub_category}`);
  const aud = Array.isArray(profile.audience) ? profile.audience.filter((a) => a && a !== "전체") : [];
  if (aud.length) parts.push(`대상 독자: ${aud.join("·")}`);
  if (profile.target) parts.push(`타깃: ${profile.target}`);
  if (profile.biz_address) {
    const region = String(profile.biz_address).split(/\s+/).slice(0, 2).join(" ");
    if (region) parts.push(`지역: ${region}`);
  }
  return parts.join(" / ");
}

// 시의성 코어 추출 — 씨앗 제목/키워드에서 '지금인 이유' 단어.
function coreOf(text: string): string {
  const m = /(확대|개편|신설|인상|인하|동결|마감|출시|시행|개정|폐지|신청|변경|이번|2026)/.exec(text);
  return m ? m[1] : "";
}

/**
 * 신선·검증된 씨앗들 × 유저 개인화 → 무중복 글감 N개(앵글 브리프 포함).
 * 구조 조합은 코드가 결정론적 배정(무중복), 창작은 LLM. 실패 시 [].
 */
export async function amplifyForUser(
  seeds: TrendTopic[],
  profile: AmplifyProfile | null,
  userId: string,
  want = 3,
): Promise<AmplifiedTopic[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || seeds.length === 0) return [];

  const day = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const axis = userAxis(profile);
  const rotated = [...seeds].sort((a, b) => (fnv(a.keyword + userId) % 997) - (fnv(b.keyword + userId) % 997));
  const picks = rotated.slice(0, Math.min(want, rotated.length));

  const badge = (profile?.sub_category || "정보").toString().slice(0, 10);
  // 각 씨앗에 구조 조합 + 훅 패턴(코드 배정, 배치 내 직전 제외) + 실검증 롱테일을 붙여 LLM에 브리핑
  const usedHooks: string[] = [];
  const briefs = picks.map((s) => {
    const angle = assignAngle(userId, s.keyword, day);
    const lts = (s.longtails ?? []).map((l) => l.kw).slice(0, 6);
    const core = coreOf(`${s.title} ${s.keyword}`);
    const hook = pickHookPattern(userId, s.keyword, day, usedHooks, `${s.title} ${s.keyword}`);
    usedHooks.unshift(hook.key);
    return { seed: s, angle, lts, core, hook };
  });
  const validLongtails = new Set<string>();
  for (const b of briefs) for (const kw of b.lts) validLongtails.add(kw.replace(/\s+/g, ""));

  const seedList = briefs.map((b, i) => [
    `${i + 1}번 씨앗:`,
    `  실검증검색어=[${b.lts.join(", ") || "(없음)"}]`,
    `  시의성코어="${b.core || "(없음)"}"`,
    `  배정된 구조: 의도=${b.angle.intent} / 서두=${b.angle.opening} / 전개=${b.angle.flow} / 마무리=${b.angle.closing} / 톤=${b.angle.tone}`,
    `  배정된 제목 훅 패턴: ${b.hook.name} — ${b.hook.guide}`,
  ].join("\n")).join("\n");

  const client = new Anthropic({ apiKey });
  const prompt = `이 블로그 운영자에게 맞춘 글감 ${briefs.length}개를 만들어라. 각 글감은 아래 '배정된 구조·훅'을 그대로 따르고, 창작 부분만 채운다.\n★이 글감들은 '지금 뜨는 트렌드' 종족 — title은 네이버 홈피드(홈판) 노출이 주 싸움터다. [제목 규칙] (1)앞 15자 안에 클릭 유도 요소 1개를 배치한다 — 구체 숫자(월 20만원), 대상 지목(~라면·~인 사람), 긴급성(오늘 마감·이번 주까지), 궁금증 유발 중 하나. 낚시성 금지. (2)검색 키워드는 제목에서 빠지지 않되 위치는 유연하게 — 훅이 문을 열고 키워드가 뒤를 받친다. (3)제목에 쓰는 숫자·금액·날짜는 씨앗 자료(뉴스·브리프)에 근거가 있는 값만 — 근거 없는 숫자는 만들지 않는다. 자리표시(OO만원·N만원·□□ 등) 절대 금지: 금액을 확인 못 하면 금액 없는 제목으로 쓴다(예: '서울시 출산 가구 주거비 지원, 신청 조건과 방법'). (4)이 종족은 기간제(스파이크) 글이므로 날짜·마감 훅 허용 — 단 실제 날짜가 자료에 있을 때만. titleSearch는 반대로 검색창·AI 브리핑용 — 키워드 선두 배치, 의도 완결, 후킹 금지.

[운영자 개인화 축]
${axis || "(일반)"}

[씨앗 + 배정된 구조/훅 — 구조·훅 패턴은 바꾸지 말 것]
${seedList}

${OPEN_LOOP_GUIDE}

★출력 규칙(반드시):
- keyword: 그 씨앗의 실검증검색어 목록에서 그대로 하나 고른다(새로 지어내지 않는다). 목록이 없으면 비운다.
- titleClick: 홈 피드 클릭형 제목 — 배정된 훅 패턴을 적용하고 열린 고리 원칙을 지킨다(답 숨김).
- titleSearch: 검색형 제목 — 고른 keyword를 자연스럽게 포함(여긴 훅보다 검색 적합 우선).
- reader: 온보딩 축 기반 독자 한 문장 페르소나.
- hook: 첫 문단이 잡을 긴장 한 줄(배정된 서두 유형에 맞게).
- thumbMain: 대표이미지 메인 카피. 1~2줄, 전체 20자 이내, 줄바꿈은 \\n. 제목을 그대로 복사하지 말고 압축/보완. 열린 고리(답 숨기고 궁금증만). 느낌표 금지.
- thumbSub: 대표이미지 서브 카피 15자 이내(없으면 빈 문자열).
- verdict: 이 글의 한 문장 판결 — 독자가 지금 해야 할 행동/선택(예: "오늘 6시 전 카드사 앱 신청이 결론"). 판단은 조건 비교의 분석 판단만 — 경험 지어내기·보장 표현 금지.
- cutList: 이 글에서 다루지 않을 하위 소재 1~3개(각각 "소재 — 짧은 이유"). ★적합한 게 없으면 빈 배열 — 억지로 채우지 않는다.
- branchAxis: 독자 상황 분기 축과 분기 2~4개 한 줄(예: "가구형태: 1인→13만 기준 / 맞벌이→+1 기준"). ★글감이 분기에 안 맞으면 빈 문자열.
- series: ★씨앗이 '하위 주제 3개 이상으로 자연 분해'될 때만 3~4화 시리즈 아크를 설계(제목+각 화의 역할·각도). 분해가 억지스러우면 null — 시리즈 강제 금지.
  아크는 씨앗 성격에 맞게 설계하되 참고 패턴(고정 아님): ①정책·혜택형=개요·훅→자격·조건→신청 단계→거절·사후 ②정보·비교형=고르는 기준→후보 비교→상황별 선택→활용·관리 ③리뷰·경험형=고르는 기준→스펙·첫인상 정보→사용자 후기 종합→총평·추천 대상.
  ★role은 그 화의 역할 명사(예: "자격·조건", "신청 단계") — 패턴 이름("정책·혜택형")을 넣지 마라.
  ★리뷰형이라도 '직접 써봤다' 류 1인칭 경험을 요구하는 angle 금지(경험 지어내기 금지) — 후기·스펙 종합 분석으로 설계한다.
  각 화 angle은 그 화만 읽어도 완결되게(시리즈는 연결 장치일 뿐 의존 금지).
- 시의성코어가 있으면 제목과 thumbMain에 살린다.
- 금지: 무조건·100%·보장·충격류, 본문이 못 지킬 약속.
- JSON 배열만: [{"seedIndex":1,"keyword":"...","titleClick":"...","titleSearch":"...","reader":"...","hook":"...","thumbMain":"...","thumbSub":"...","verdict":"...","cutList":["..."],"branchAxis":"...","series":{"title":"...","arc":[{"role":"...","angle":"..."}]} 또는 null}]`;

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1100,
      messages: [{ role: "user", content: prompt }],
    });
    void logUsage({ userId, model: "claude-haiku-4-5", kind: "amplify", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const text = res.content[0]?.type === "text" ? res.content[0].text : "";
    const m = /\[[\s\S]*\]/.exec(text);
    if (!m) return [];
    const parsed = JSON.parse(m[0]) as { seedIndex?: number; keyword?: string; titleClick?: string; titleSearch?: string; reader?: string; hook?: string; thumbMain?: string; thumbSub?: string; verdict?: string; cutList?: string[]; branchAxis?: string; series?: { title?: string; arc?: { role?: string; angle?: string }[] } | null }[];
    const out: AmplifiedTopic[] = [];
    const seen = new Set<string>();
    for (const it of parsed) {
      const b = briefs[(Number(it.seedIndex) || 1) - 1] ?? briefs[0];
      // ★플레이스홀더 게이트(실측: '최대 OO만원' 제목 노출) — 미확인 수치 자리표시가 있으면 카드 폐기
      const PLACEHOLDER = /(OO|ОО|○○|◯◯|□□|XX|NN|몇\s?만\s?원|[０-９]*＿+|\bN\s?(?=만\s?원|원|개|%|년|월|일))/;
      if (PLACEHOLDER.test(String(it.titleClick ?? "")) || PLACEHOLDER.test(String(it.titleSearch ?? ""))) continue;
      if (!b) continue;
      let kw = (it.keyword ?? "").trim().slice(0, 60);
      if (validLongtails.size > 0 && !validLongtails.has(kw.replace(/\s+/g, ""))) {
        kw = b.lts.find((l) => !seen.has(l.replace(/\s+/g, ""))) ?? b.seed.keyword;
      }
      if (!kw) kw = b.seed.keyword;
      const nk = kw.replace(/\s+/g, "");
      if (seen.has(nk)) continue;
      seen.add(nk);
      // ★금지어 필터 — 어그로/약속류가 든 제목·카피는 안전한 씨앗 제목으로 폴백.
      let titleClick = (it.titleClick ?? b.seed.title).trim().slice(0, 80);
      if (containsBanned(titleClick)) titleClick = b.seed.title.slice(0, 80);
      const titleSearch = (it.titleSearch ?? b.seed.title).trim().slice(0, 80);
      // ★자르지 않는다 — 원문 그대로 받고 뒤에서 검증(초과 시 재생성→반려). 금지어·느낌표만 즉시 제거.
      let thumbMain = (it.thumbMain ?? "").replace(/!/g, "").trim();
      if (containsBanned(thumbMain)) thumbMain = "";
      let thumbSub = (it.thumbSub ?? "").trim();
      if (containsBanned(thumbSub)) thumbSub = "";
      const verdict = containsBanned(it.verdict ?? "") ? "" : (it.verdict ?? "").trim().slice(0, 120);
      const cutList = (Array.isArray(it.cutList) ? it.cutList : []).map((c) => String(c).trim().slice(0, 60)).filter(Boolean).slice(0, 3);
      const branchAxis = (it.branchAxis ?? "").trim().slice(0, 200);
      const brief = { ...b.angle, reader: (it.reader ?? "").trim().slice(0, 120), hook: (it.hook ?? "").trim().slice(0, 160), coreWord: b.core, verdict, cutList, branchAxis };
      out.push({
        keyword: kw,
        title: titleClick,
        titleSearch,
        newsContext: b.seed.newsContext ?? null,
        sourceTitle: b.seed.title ?? null, // ★카드별 진짜 혈통(씨앗 제목) — 근거 표시용(배치 공통 뉴스 뭉치와 달리 카드 귀속 확실)
        brief,
        briefText: briefToDirective(brief),
        hookKey: b.hook.key,
        thumb: { mainCopy: thumbMain, subCopy: thumbSub, badge },
        source: b.seed.source,
        series: (() => { // 성립 기준: arc 3~4화 + 각 화 role·angle 완비. 미달 = null(단발)
          const sr = it.series;
          if (!sr || !sr.title || !Array.isArray(sr.arc)) return null;
          const arc = sr.arc.map((e) => ({ role: String(e?.role ?? "").trim().slice(0, 40), angle: String(e?.angle ?? "").trim().slice(0, 90) })).filter((e) => e.role && e.angle);
          if (arc.length < 3 || arc.length > 4) return null;
          if (containsBanned(sr.title) || arc.some((e) => containsBanned(e.angle))) return null;
          return { title: String(sr.title).trim().slice(0, 60), arc };
        })(),
      });
      if (out.length >= want) break;
    }

    // ★썸네일 카피 검증 — 초과(줄당 10자/전체 20자/2줄 초과)면 재생성 1회, 그래도 안 되면 반려(빈 카피). 절대 자르지 않는다.
    const invalid = out.filter((o) => !validThumbMain(o.thumb.mainCopy));
    if (invalid.length > 0) {
      try {
        const fixPrompt = `아래 각 글감의 대표이미지 메인 카피만 다시 만들어라. 엄격 규칙: 최대 2줄(줄바꿈은 \\n), 줄당 10자 이내, 전체 20자 이내, 느낌표·과장·보장류 금지, 답을 숨긴 '열린 카피'.\n${invalid.map((o, i) => `${i + 1}. 주제: ${o.title}`).join("\n")}\nJSON 배열만: [{"i":1,"thumbMain":"...","thumbSub":"..."}]`;
        const r = await client.messages.create({ model: "claude-haiku-4-5", max_tokens: 500, messages: [{ role: "user", content: fixPrompt }] });
        void logUsage({ userId, model: "claude-haiku-4-5", kind: "amplify_thumb_fix", inputTokens: r.usage?.input_tokens, outputTokens: r.usage?.output_tokens });
        const jt = r.content[0]?.type === "text" ? r.content[0].text : "";
        const arr = JSON.parse((/\[[\s\S]*\]/.exec(jt) ?? ["[]"])[0]) as { i?: number; thumbMain?: string; thumbSub?: string }[];
        for (const f of arr) {
          const o = invalid[(Number(f.i) || 0) - 1];
          if (!o) continue;
          const mm = (f.thumbMain ?? "").replace(/!/g, "").trim();
          if (validThumbMain(mm)) { o.thumb.mainCopy = mm; const ss = (f.thumbSub ?? "").trim(); if (!containsBanned(ss)) o.thumb.subCopy = ss; }
        }
      } catch { /* 재생성 실패 → 반려로 */ }
    }
    // 여전히 유효하지 않으면 반려 — 빈 카피(렌더러는 카피 없이 배경+배지만, 깨진 문구는 렌더 불가).
    for (const o of out) if (!validThumbMain(o.thumb.mainCopy)) o.thumb.mainCopy = "";
    return out;
  } catch {
    return [];
  }
}
