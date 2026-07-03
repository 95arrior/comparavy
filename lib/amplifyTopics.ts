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
}
// 대표이미지 합성 카피 — 코드가 렌더(절대 안 깨짐). 길이 상한은 축소 썸네일 가독 기준.
export interface ThumbCopy {
  mainCopy: string;   // 1~2줄, 20자 이내. \n으로 줄 구분
  subCopy: string;    // 15자 이내(선택)
  badge: string;      // 카테고리 배지
}
export interface AmplifiedTopic {
  keyword: string;       // 실검증 롱테일
  title: string;         // 홈판 클릭형 제목(훅 패턴 적용)
  titleSearch: string;   // 검색형 제목(롱테일 포함)
  newsContext: string | null;
  brief: AngleBrief;
  briefText: string; // brief를 엔진 주입용 지시문으로 직렬화(클라 스레딩용)
  hookKey: string;   // 적용된 훅 패턴 key
  thumb: ThumbCopy;  // 대표이미지 합성 카피
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

// 앵글 브리프 → 생성 엔진 주입용 지시문(순수 함수).
export function briefToDirective(b: AngleBrief): string {
  return [
    "[앵글 브리프 — 이 글만의 방향(구조 지문)]",
    `- 의도: ${b.intent}`,
    `- 독자: ${b.reader}`,
    `- 서두: ${b.opening}로 시작한다`,
    `- 전개: ${b.flow} 순서로 푼다`,
    `- 마무리: ${b.closing}로 끝낸다`,
    `- 톤·문장 리듬: ${b.tone}`,
    `- 첫 문단 훅: ${b.hook}`,
    b.coreWord ? `- 시의성 코어 '${b.coreWord}'는 제목과 도입에 반드시 살린다.` : "", // 빈 코어는 줄 생략
    "위 방향을 이 글의 뼈대로 삼되, 엔진의 안전·품질·모바일 포맷 규칙은 그대로 지킨다.",
  ].filter(Boolean).join("\n");
}

// 카피를 max자 이내로 — 단어(어절) 중간에서 자르지 않는다(미완성 카피 방지). 줄바꿈 유지.
function clampCopy(raw: string, max: number): string {
  const s = raw.replace(/\s*\n\s*/g, "\n").trim();
  const visible = (t: string) => [...t.replace(/\n/g, "")].length;
  if (visible(s) <= max) return s;
  const tokens = s.split(/(\n| )/); // 구분자 유지
  let out = "", count = 0;
  for (const tok of tokens) {
    if (tok === " " || tok === "\n") { out += tok; continue; }
    const len = [...tok].length;
    if (count + len > max) break;
    out += tok; count += len;
  }
  out = out.replace(/[\n ]+$/g, "").trim();
  return out || [...s].slice(0, max).join(""); // 첫 어절도 max 초과면 어쩔 수 없이 자름
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
  const prompt = `이 블로그 운영자에게 맞춘 글감 ${briefs.length}개를 만들어라. 각 글감은 아래 '배정된 구조·훅'을 그대로 따르고, 창작 부분만 채운다.

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
- 시의성코어가 있으면 제목과 thumbMain에 살린다.
- 금지: 무조건·100%·보장·충격류, 본문이 못 지킬 약속.
- JSON 배열만: [{"seedIndex":1,"keyword":"...","titleClick":"...","titleSearch":"...","reader":"...","hook":"...","thumbMain":"...","thumbSub":"..."}]`;

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
    const parsed = JSON.parse(m[0]) as { seedIndex?: number; keyword?: string; titleClick?: string; titleSearch?: string; reader?: string; hook?: string; thumbMain?: string; thumbSub?: string }[];
    const out: AmplifiedTopic[] = [];
    const seen = new Set<string>();
    for (const it of parsed) {
      const b = briefs[(Number(it.seedIndex) || 1) - 1] ?? briefs[0];
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
      let thumbMain = clampCopy((it.thumbMain ?? "").replace(/!/g, ""), 20);
      if (!thumbMain || containsBanned(thumbMain)) thumbMain = clampCopy(titleClick, 18);
      let thumbSub = clampCopy((it.thumbSub ?? ""), 15);
      if (containsBanned(thumbSub)) thumbSub = "";
      const brief = { ...b.angle, reader: (it.reader ?? "").trim().slice(0, 120), hook: (it.hook ?? "").trim().slice(0, 160), coreWord: b.core };
      out.push({
        keyword: kw,
        title: titleClick,
        titleSearch,
        newsContext: b.seed.newsContext ?? null,
        brief,
        briefText: briefToDirective(brief),
        hookKey: b.hook.key,
        thumb: { mainCopy: thumbMain, subCopy: thumbSub, badge },
      });
      if (out.length >= want) break;
    }
    return out;
  } catch {
    return [];
  }
}
