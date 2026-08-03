// ★홈판 배팅 카드(2026-07-15 유저 확정 "해보자") — 검색이 아니라 네이버 홈피드(홈판) 폭발을 노리는 1일 1장.
//  배경(유저 관찰): 일 7만~20만 블로그들은 홈판에서 터진 유형을 반복한다. 검색=수요를 받아먹는 게임(상한=검색량),
//  홈판=반응을 터뜨리는 게임(상한 없음). 검색 바닥은 기존 트랙이 담당하고, 이 카드는 스파이크 배팅.
//  원칙: ①거짓 사연 금지 — 통계·계산·제도 '실데이터 기반' 유형만 ②경제 축 안에서만(C-Rank 보호) ③1일 1장 상한.
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logUsage } from "./usageLog";
import { containsBanned } from "./hookPatterns";
import { fetchNews } from "./newsTopics";
import { getTrendTopics } from "./trendTopics";
import { normalizeKeyword } from "./diversity";
import { readSignals, pickTitleType, titleTypeDirective } from "./titleTypes";
import { coreKeywordOf } from "./editorial";
import { validateHomefeedTitle, staleMonthIn } from "./titleRules";

export interface HomefeedBet {
  keyword: string;   // 주제 앵커(검색 키워드가 아니라 소재 — 예: "30대 평균 저축액")
  title: string;     // 홈판 훅 제목(호기심·반전·숫자)
  thumbCopy: string; // 썸네일 훅 문구(12자 이내)
  briefText: string; // 생성 엔진에 넘길 홈판 지시
  betType: string;   // 오늘의 유형 라벨
  titleType?: string; // ★적합도로 고른 제목 유형 key(2026-08-02) — 본문 생성이 같은 유형을 이어받는다
}

// 8유형 로테이션(2026-07-15 합의 6종 + 2026-08-01 유저 추가 2종) — 전부 사실 기반으로 쓸 수 있는 유형만.
// ★2026-08-01 유저 전략: "우리는 연애 블로그가 아니라 결핍을 긁는 블로그다. 특히 돈 벌고 싶은 사람."
//  주식·시장은 결핍이 가장 센 축이면서 경제 채널 주제와 정확히 일치한다 — 연예·건강처럼 C-Rank를 깨지 않고
//  홈판 클릭률을 가져올 수 있는 유일한 소재축. 단 종목 추천으로 넘어가면 자본시장법 리스크라 '번역'에서 멈춘다.
const BET_TYPES = [
  { key: "평균 위치확인", hint: "통계청·한국은행 등 공식 통계로 '평균/중위값'을 까서 독자가 자기 위치를 확인하게 하는 주제(예: 30대 평균 저축액·40대 평균 연금 납입액). 댓글 유발형." },
  { key: "몰라서 못 받는 돈", hint: "조회만 하면 찾아가는 돈(미환급금·숨은 보험금·카드 포인트·통신비 환급 등) — '5분 조회, 즉시 보상' 구조. 저장·공유형." },
  { key: "계산 충격", hint: "누구나 궁금하지만 직접 계산 안 해본 것을 대신 계산해 보여주는 주제(국민연금 예상 수령액·퇴직금·전월세 전환 손익). ★'계산기'라는 단어는 키워드·제목에 절대 금지(계산해봤다·계산 결과로 표현)." },
  { key: "통념 파괴", hint: "다들 믿는 돈 상식이 사실과 다른 지점(적금 이자에서 빠지는 세금·연금 수령 시점의 함정·무이자 할부의 비용). 반전 훅." },
  { key: "손해 공포 마감", hint: "지금 안 하면 실제로 손해가 확정되는 것(이번 달 세금 가산·마감 임박 혜택·자동 해지되는 권리). 시점은 실제 제도 일정만." },
  { key: "인생 이벤트 돈 타임라인", hint: "이직·퇴사·결혼·출산·이사 앞뒤로 챙길 돈 체크리스트 — '그때 가서 알면 늦는' 순서 정리. 저장형." },
  // ★유저 추가(2026-08-01) — 결핍이 가장 센 축. 단 '해설·번역'까지만 간다.
  { key: "시장 급변 번역", hint: "이번 주 실제로 벌어진 증시·환율·금리·물가 뉴스 하나를 골라 '그래서 내 통장에 무슨 뜻인지'로 번역하는 주제(예: 환율이 오르면 내 장바구니·해외직구·연금계좌에 생기는 일). ★종목·테마주를 고르거나 오른다/사라고 하지 않는다 — 뉴스를 '내 돈의 언어'로 옮기는 해설이다. 실제 보도된 사실만 소재로 쓴다." },
  { key: "돈 격차 자극", hint: "같은 월급·같은 나이인데 왜 자산이 벌어지는지, 그 갈림길이 되는 구체적 선택 하나를 숫자로 보여주는 주제(예: 같은 300만 원인데 5년 뒤 차이를 만든 한 가지). 결핍 직격 + 자기 대입형. ★특정 상품·종목을 정답으로 제시하지 않는다 — 습관·제도·세금 구조가 답이다." },
] as const;

// ★투자권유 오인 하드 게이트(프롬프트는 방향, 코드는 한계선 — CLAUDE.md).
//  주식 유형이 들어오면서 '오른다·사라·수익률 보장'류가 제목에 섞일 경로가 생겼다. 본문은 complianceFilter가 보지만
//  홈판 카드 제목은 그 앞단이라 여기서 막는다. 걸리면 그 카드만 버린다(파이프 무영향).
const INVEST_PUSH_RE = /(?:매수|사)\s*(?:하세요|하라|해야|타이밍)|오릅니다|상승\s*확실|급등\s*예상|목표\s*주가|수익률\s*(?:보장|확정)|무조건\s*(?:오|벌)|지금\s*사/;

// ★'시장 급변 번역'은 실제 보도에 물려야 한다 — 실시간을 표방하면서 모델 기억으로 쓰면 지어낸 시황이 된다.
//  뉴스가 안 잡히면 그 장은 만들지 않는다(빈손이 거짓보다 낫다).
const NEWS_GROUNDED: Record<string, string> = { "시장 급변 번역": "증시 환율 금리" };

// ★실데이터 그라운딩(2026-08-03 유저 지적 — "홈판도 트렌드 키워드로 만들어야 한다").
//  ★우리는 청약홈·보조금24·기업마당·DART를 이미 수확하고 있는데, 홈판은 그걸 하나도 안 쓰고 있었다.
//   일반 뉴스 검색(fetchNews)만 보고, 그것도 일부 유형만 받았다. 나머지는 뉴스 없이 만들어졌다.
//   그 결과 홈판 카드가 '환율'·'자산 격차'·'저축액'처럼 전부 일반론이 됐다 — 지금 벌어지는 일이 아니다.
//  ★홈피드는 시의성·이슈성이 노출 요인이다. 공고·공시는 '마감이 있는 지금 일'이라 그 축에서 가장 강하다
//   (유저 제공 상위 글 4편도 전부 날짜가 박힌 실데이터였다: 8월 배당 지급일·시총 돌파·재산세 상승).
//  ★단 홈판 keyword는 검색어가 아니라 주제 앵커다 — 씨앗을 '소재'로 주되 키워드를 그대로 베끼게 하지 않는다.
async function liveSeedBlock(sub: string, exclude: Set<string>): Promise<string | null> {
  try {
    const seeds = await getTrendTopics(sub || "경제·재테크");
    if (!seeds.length) return null;
    const now = Date.now();
    // 행동 창(접수·마감)이 살아 있는 공고를 앞에 세운다 — 홈피드에서 가장 강한 건 '지금 안 하면 끝'이다.
    const scored = seeds
      .filter((t) => !exclude.has(normalizeKeyword(t.keyword)))
      .map((t) => {
        const end = t.actionEnd ? new Date(`${t.actionEnd}T23:59:59+09:00`).getTime() : null;
        const live = end != null && end >= now;
        const soon = live && end - now <= 7 * 86400_000;
        return { t, score: (soon ? 3 : live ? 2 : 0) + (t.source && t.source !== "news" ? 1 : 0) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    if (!scored.length) return null;
    return [
      `★[오늘 수확한 실제 이슈 — 이 안에서 소재를 고른다] 공고·공시·뉴스에서 실제로 확인된 것들이다.`,
      `여기 없는 일정·금액·기관은 만들지 않는다. 하나를 골라 '그래서 내 돈에 무슨 뜻인지'로 번역한다.`,
      `★키워드를 그대로 베끼지 마라 — 홈판 제목은 검색어가 아니라 사람을 멈추게 하는 문장이다.`,
      ...scored.map(({ t }) => {
        const win = t.actionEnd ? ` (마감 ${t.actionEnd})` : "";
        return `- [${t.source ?? "news"}] ${t.title || t.keyword}${win}`;
      }),
    ].join("\n");
  } catch {
    return null; // 실데이터 실패 = 기존 뉴스 경로로 폴백(파이프 무영향)
  }
}

async function marketNewsBlock(betKey: string): Promise<string | null> {
  const q = NEWS_GROUNDED[betKey];
  if (!q) return null;
  try {
    const items = (await fetchNews(q)).slice(0, 6);
    if (!items.length) return null;
    return [
      `★[오늘의 실제 보도 — 이 안에서만 소재를 고른다] 아래 기사에 실제로 있는 사실만 쓴다.`,
      `여기 없는 수치·종목·전망은 만들지 않는다. 쓸 만한 게 없으면 억지로 고르지 말고 가장 생활에 가까운 항목 하나를 골라 '내 돈에 무슨 뜻인지'로 번역한다.`,
      ...items.map((it) => `- ${it.title}`),
    ].join("\n");
  } catch {
    return null;
  }
}

/**
 * 오늘의 홈판 배팅 카드 — 유저·날짜별 캐시(api_cache 24h). 실패 = 빈 배열(파이프 무영향).
 * ★1장 고정 → n장(2026-08-01): 홈판이 배합 40%의 정식 레인이 되면서 하루 몫만큼 뽑는다.
 *  유형은 날짜 오프셋으로 회전시켜 서로 다른 n종을 배정한다 — 같은 날 같은 유형이 겹치면 홈판에서 서로 잡아먹는다.
 */
export async function pickHomefeedBets(
  db: SupabaseClient, userId: string, sub: string, usedKeywords: Set<string>, n = 1,
  opts?: {
    /** 발행한 글과 유사한가(제목까지 본다). ★호출측 게이트를 여기로 끌어온 이유는 아래 캐시 설명 참고. */
    isDup?: (title: string, keyword: string) => boolean;
    /** 최근 발행 제목 — 모델에게 '이런 제목은 이미 썼다'를 보여준다. 키워드만 주면 제목이 겹친다(실측). */
    recentTitles?: string[];
  },
): Promise<HomefeedBet[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const want = Math.max(0, Math.min(n, BET_TYPES.length));
  if (!apiKey || want === 0) return [];
  const kstDay = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  // ★캐시 키에 버전을 둔다 — 판정 규칙이 바뀌면 옛 캐시는 '규칙 이전에 통과한 것'이라 못 믿는다.
  //  v2(2026-08-02): 발행글 유사 판정을 캐시 이전으로 옮겼다. 그 전 캐시는 걸러지지 않은 상태라 무효.
  const cacheKey = `homebet:v2:${userId}:${kstDay}:${want}`;
  try {
    const { data: c } = await db.from("api_cache").select("value, expires_at").eq("key", cacheKey).maybeSingle();
    if (c?.value && new Date(String(c.expires_at)).getTime() > Date.now()) return c.value as HomefeedBet[];
  } catch { /* 캐시 조회 실패 — 생성으로 */ }

  // ★여유분을 뽑는다(2026-08-01 실측: 4장 요청에 1장만 나왔다).
  //  개별 생성은 여러 이유로 떨어진다 — 뉴스 없음(시장 유형), 금지어, 투자권유 표현, JSON 파싱 실패.
  //  딱 want개만 시도하면 한 장만 떨어져도 열이 빈다. 유형은 8종이니 넉넉히 시도해 먼저 성공한 want개를 쓴다.
  const dayIdx = Math.floor(Date.now() / 86400_000) % BET_TYPES.length;
  const tryN = Math.min(BET_TYPES.length, want + 3);
  const picked = Array.from({ length: tryN }, (_, i) => BET_TYPES[(dayIdx + i) % BET_TYPES.length]!);
  const settled = await Promise.all(picked.map((bet) => genOne(apiKey, userId, sub, usedKeywords, bet, opts?.recentTitles)));
  let got = settled.filter((x): x is HomefeedBet => x !== null);
  // ★발행한 글과의 유사 판정을 '캐시에 넣기 전에' 한다(2026-08-02 실측 사고).
  //  종전엔 호출측(topics/route)이 캐시에서 꺼낸 뒤 걸렀다. 그러면 이렇게 된다:
  //   생성 4장 → 캐시 저장 → 호출측이 4장 전부 '이미 쓴'으로 탈락 → 홈판 0장
  //   → 다시 뽑아도 같은 캐시가 나와 또 0장 → ★내일까지 복구 불가.
  //  실측 로그: "[lane-quota:short] 홈판 미달 0/4 — 하류 탈락(이미쓴 4·게이트 0·중복 0)"
  //  ★거르는 자리와 캐시하는 자리가 어긋나면 캐시는 '실패를 굳히는 장치'가 된다.
  if (opts?.isDup) {
    const before = got.length;
    got = got.filter((b) => !opts.isDup!(b.title, b.keyword));
    if (got.length < before) console.log(`[homebet] 발행글과 유사 — 제외 ${before - got.length}장`);
  }
  // ★소재 중복 제거(2026-08-02 유저: "중복 글은 절대 안 돼요 — 저품질 낙인").
  //  카드 n장은 Promise.all로 '동시에' 만들어져 서로를 보지 못한다. 유형은 8종으로 갈라 두었지만
  //  유형이 달라도 소재는 겹칠 수 있다(계산 충격도 전기요금, 손해 공포 마감도 전기요금).
  //  같은 소재 두 장이 같은 날 나가면 네이버에서 서로 잡아먹고, 반복되면 유사문서로 읽힌다.
  //  앵커의 핵심어로 판정한다 — 표기가 달라도('7월 전기요금'·'전기요금 폭탄') 핵심어는 같다.
  const deduped: HomefeedBet[] = [];
  const usedCores = new Set<string>();
  for (const b of got) {
    const core = coreKeywordOf(b.keyword);
    if (usedCores.has(core)) {
      console.log(`[homebet] 소재 중복 — 제외: ${b.betType} / ${b.keyword} (핵심어 ${core})`);
      continue;
    }
    usedCores.add(core);
    deduped.push(b);
  }
  const out = deduped.slice(0, want);
  if (got.length < tryN || deduped.length < got.length) {
    const failed = picked.filter((_, i) => settled[i] == null).map((b) => b.key);
    console.log(`[homebet] ${got.length}/${tryN} 생성 성공 — 실패 유형: ${failed.join(", ") || "없음"} / 소재중복 제외 ${got.length - deduped.length}장`);
  }
  if (out.length) {
    // ★부분 결과를 하루 종일 물고 있으면 안 된다(이번 사고의 직접 원인).
    //  쿼터를 채웠을 때만 24시간 캐시하고, 미달이면 1시간만 — 다음 호출에서 다시 채워 본다.
    const full = out.length >= want;
    const ttlMs = full ? 24 * 3600_000 : 1 * 3600_000;
    try { await db.from("api_cache").upsert({ key: cacheKey, value: out, expires_at: new Date(Date.now() + ttlMs).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
    if (!full) console.log(`[homebet] 쿼터 미달 ${out.length}/${want} — 1시간 뒤 재시도(짧은 캐시)`);
  }
  return out;
}

/** 유형 1개 → 카드 1장. 개별 실패는 그 장만 버린다(나머지는 살린다). */
async function genOne(
  apiKey: string,
  userId: string,
  sub: string,
  usedKeywords: Set<string>,
  bet: (typeof BET_TYPES)[number],
  recentTitles?: string[],
): Promise<HomefeedBet | null> {
  try {
    // 뉴스 그라운딩이 필요한 유형인데 기사를 못 받았으면 그 장은 포기한다(지어낸 시황 방지).
    const newsBlock = await marketNewsBlock(bet.key);
    if (NEWS_GROUNDED[bet.key] && !newsBlock) {
      console.error("[homebet] 뉴스 없음 — 시장 유형 스킵:", bet.key);
      return null;
    }
    // ★실데이터 씨앗을 모든 유형에 준다(2026-08-03) — 뉴스 그라운딩은 일부 유형만 받아서
    //  나머지 유형이 일반론으로 흘렀다. 공고·공시는 유형과 무관하게 '지금 일'을 준다.
    const seedBlock = await liveSeedBlock(sub, usedKeywords);
    if (seedBlock) console.log(`[homebet] 실데이터 씨앗 주입 — ${bet.key}`);
    // ★제목 유형은 추첨이 아니라 이 글감에 맞는 것을 고른다(2026-08-02) — 유형 신호는 소재 힌트·오늘 기사에서 읽는다.
    //  경험형은 여기서 뽑히지 않는다(카드 생성 시점엔 운영자 실경험이 없다) — 그 유형은 본문 생성 단계에서 열린다.
    const kstNow = new Date(Date.now() + 9 * 3600_000);
    const todayKst = kstNow.toISOString().slice(0, 10);
    const curMonth = kstNow.getUTCMonth() + 1;
    const prevMonth = ((curMonth + 10) % 12) + 1;
    const signals = readSignals(`${bet.key} ${bet.hint} ${newsBlock ?? ""} ${seedBlock ?? ""}`, { userExperience: false });
    const titleType = pickTitleType(signals);
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: [
          `네이버 홈피드(홈판)에서 폭발적 반응을 노리는 경제 블로그 글감 1개를 만든다. 검색 SEO용이 아니다 — 홈피드는 '노출 실험 → 클릭률·체류로 판정' 구조라 스크롤을 멈추게 하는 제목이 전부다.`,
          `블로그 세부 분야: ${sub || "경제·재테크"}`,
          `오늘의 유형: [${bet.key}] — ${bet.hint}`,
          seedBlock ?? "",
          newsBlock ?? "",
          // ★오늘 날짜 주입(2026-08-02 검거) — 종전엔 kstDay를 캐시 키에만 쓰고 프롬프트엔 안 넘겼다.
          //  모델은 오늘이 며칠인지 모른 채 '이 달'을 찍었고, 8월 2일에 4장 전부 7월 소재가 나왔다.
          `★오늘은 ${todayKst}(한국시간)이다. 지금은 ${curMonth}월이다. ★지난 달(${prevMonth}월) 일을 지금 벌어지는 일처럼 쓰지 마라 — 시의성은 반드시 이번 달(${curMonth}월) 또는 앞으로 올 일 기준이다. 달을 제목·키워드에 넣을 거면 ${curMonth}월 이후만 쓴다.`,
          `★시의성 결합(2026-07-16 개정 — 홈판은 '지금의 파도'를 탄다): 이 유형을 지금 이 계절·이 달의 상황(폭염 전기요금, 휴가비, 월급날, 세금 고지서 등 요즘 사람들이 실제로 겪는 일)과 반드시 결합하라. 계절과 무관한 무시간 주제 금지.`,
          `절대 원칙: ①거짓 사연·지어낸 경험 금지 — 공식 통계·실제 제도·계산으로만 성립하는 주제 ②전 국민 이해관계(대상이 넓을수록 좋다) ③이미 쓴 주제 제외: ${[...usedKeywords].slice(0, 40).join(", ") || "(없음)"}`,
          // ★키워드만 주면 제목이 겹친다(2026-08-02 실측: 홈판 4장이 전부 '이미 쓴'으로 탈락).
          //  모델은 주제를 피해도 같은 각도·같은 문장 틀로 돌아온다 — 실제 제목을 보여줘야 피한다.
          (recentTitles ?? []).length
            ? `★이미 쓴 제목들(이것과 비슷한 각도·소재·문장 틀은 전부 피하라 — 비슷하면 버려진다):\n${(recentTitles ?? []).slice(0, 15).map((t) => `- ${t}`).join("\n")}`
            : "",
          `제목 규격: 검색 키워드 나열이 아니라 사람이 말하듯 흐르는 '문장형'. 아래 지정 유형의 결로 쓴다 — 유형은 이 글감의 신호를 읽어 고른 것이므로 바꾸지 마라.`,
          titleTypeDirective(titleType),
          `길이는 20~45자. 느낌표·물음표는 각각 최대 1개까지 쓸 수 있다(훅이 살아난다 — 다만 2개 이상은 유튜브식 어그로라 실격). 숫자·반전 중 1개 이상 결합.`,
          `★금지선(계정 지속 — 절대): 본문이 100% 이행 못 할 약속(낚시), "안 사면 평생 후회·무조건·100%" 류 단정·공포 마케팅, 충격·경악 남발.`,
          `★토너먼트 자기검증(내부 심사 — 과정 출력 금지): 제목·썸네일 문구 후보를 각각 10개 이상 만들어 스스로 물어라 — '스크롤하다 내가 정말 멈출까?', '왜 멈추는지 한 문장으로 설명되는가?', '제목과 썸네일이 같은 말을 하고 있진 않은가?'. 통과 못 하면 폐기하고 다시. 최강 1세트만 출력한다 — 이건 경쟁이다.`,
          `JSON만 출력: {"keyword":"주제 앵커(15자 이내)","title":"훅 제목(32자 이내)","thumbCopy":"썸네일 문구(6자 이내 초단문 — 글자가 적을수록 유리. ★제목을 반복하지 말고 개념 하나만 던진다: 썸네일이 질문, 제목이 답 — '검색 끝.' 결)","angle":"본문이 다룰 핵심 각도 2문장"}`,
        ].join("\n"),
      }],
    });
    void logUsage({ userId, model: "claude-sonnet-4-6", kind: "homefeed_bet", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const text = res.content.map((x) => (x.type === "text" ? x.text : "")).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const raw = JSON.parse(m[0]) as { keyword?: string; title?: string; thumbCopy?: string; angle?: string };
    if (!raw.keyword || !raw.title) return null;
    // ★문구 게이트(2026-07-17 PTRP) — 감정 과잉·과장 어휘는 텍스트 카드에서 역효과 실증. 제목 위반=오늘 배팅 스킵, 문구 위반=키워드 폴백.
    if (containsBanned(raw.title)) { console.error("[homebet] 금지어 제목 — 스킵:", raw.title.slice(0, 30)); return null; }
    // ★투자권유 오인 — 주식 유형 추가(2026-08-01)로 생긴 경로. 제목·각도 어디에 있어도 그 장은 버린다.
    if (INVEST_PUSH_RE.test(raw.title) || INVEST_PUSH_RE.test(raw.angle ?? "")) {
      console.error("[homebet] 투자권유 오인 표현 — 스킵:", raw.title.slice(0, 30));
      return null;
    }
    // ★홈판 제목 규격 게이트(2026-08-02) — 프롬프트는 방향, 코드는 한계선.
    //  길이·부호 남용·키워드 실종을 여기서 잡는다. 걸리면 그 장만 버린다(다른 유형이 자리를 채운다).
    // ★지난 달 시의성 — 프롬프트로 날짜를 줘도 모델은 틀릴 수 있다. 걸리면 그 장만 버린다.
    const stale = staleMonthIn(`${raw.title} ${raw.keyword} ${raw.angle ?? ""}`);
    if (stale !== null) {
      console.error(`[homebet] 지난 달(${stale}월) 소재 — 스킵: ${raw.title.slice(0, 40)}`);
      return null;
    }
    const tv = validateHomefeedTitle(raw.title, raw.keyword);
    if (!tv.ok) {
      console.error(`[homebet] 제목 규격 위반(${tv.reason}) — 스킵: 앵커="${raw.keyword}" 제목="${raw.title.slice(0, 40)}"`);
      return null;
    }
    const thumbCopy0 = (raw.thumbCopy ?? raw.keyword).slice(0, 14);
    const out: HomefeedBet = {
      keyword: raw.keyword.slice(0, 30),
      title: raw.title.slice(0, 60),
      thumbCopy: containsBanned(thumbCopy0) ? raw.keyword.slice(0, 14) : thumbCopy0,
      betType: bet.key,
      titleType: titleType.key,
      briefText: [
        `[홈판 배팅 지시] 이 글은 검색 노출이 아니라 네이버 홈피드(홈판) 확산을 노린다 — 제목은 검색 질문형이 아니라 위 훅 제목을 그대로(또는 더 강하게) 쓴다.`,
        `유형: ${bet.key} / 제목 유형: ${titleType.name} — ★본문 이행 의무: ${titleType.payoff}`,
        `핵심 각도: ${(raw.angle ?? "").slice(0, 300)}`,
        `규칙: ①모든 수치는 공식 통계·실제 제도 기반 — 출처와 기준 시점 명시, 지어낸 사연 금지 ②도입 3문장 안에 '멈춤 포인트'(반전 수치·의외 사실)를 박는다 — 홈판은 3초 안에 스크롤이 지나간다 ③독자가 자기 상황을 대입할 분기(나이대·상황별)를 반드시 넣는다 ④마무리에 저장 유도(체크리스트·계산 순서) — 홈판 글의 승부는 공감·저장 반응이다.`,
        `⑤★댓글 유도(2026-07-16 개정 — 댓글·체류가 홈피드 노출 점수): 마무리 직전에 독자 의견을 묻는 진짜 질문 1개를 자연스럽게 넣는다(예: "여러분은 무이자 할부, 한 달에 몇 번이나 쓰세요?") — '댓글 달아주세요' 류 부탁 금지, 대답하고 싶어지는 질문이어야 한다 ⑥크리에이터 시각 1곳 — 뻔한 정리가 아니라 이 데이터를 보는 나만의 해석 한 단락('제가 이 통계에서 진짜 놀란 건 평균이 아니라 격차예요' 결).`,
      ].join("\n"),
    };
    return out;
  } catch (e) {
    console.error("[homebet] 생성 실패(이 장만 스킵):", e instanceof Error ? e.message : e);
    return null;
  }
}
