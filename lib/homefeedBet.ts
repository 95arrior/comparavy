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
  /** ★이 카드가 실제로 근거한 수확 이슈(2026-08-03 유저 요청: "출처를 써줘야 진짜인지 안다").
   *  빈 값이면 실데이터 없이 만들어진 카드다 — 그것도 화면에 드러나야 판단할 수 있다. */
  sourceTitle?: string;
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
      // ★discover(자동완성 발굴) 씨앗은 홈판 근거로 쓰지 않는다(2026-08-05 유저 화면에서 검거).
      //  실물: 홈판 카드 근거가 '[discover] 전기차 추천, 지금 확인할 것들'이었다 — 그건 '꾸준한 수요'
      //  씨앗이지 오늘의 이슈가 아니다. 홈피드의 생명은 시의성인데 근거에 시의성이 없으면 앞뒤가 안 맞는다.
      .filter((t) => t.source !== "discover")
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
      `★src에는 위 목록에서 실제로 쓴 줄의 '키워드 부분'을 그대로 옮긴다(유저가 이 카드가 어느 씨앗에서 나왔는지 눈으로 검증한다).`,
      // ★키워드를 함께 준다(2026-08-05 유저: "어떤 키워드로 글감이 생성됐는지 그 키워드만 보여줘").
      //  모델이 src에 이 줄을 그대로 옮기므로, 키워드가 줄 안에 있어야 화면에서 검증이 된다.
      ...scored.map(({ t }) => {
        const win = t.actionEnd ? ` (마감 ${t.actionEnd})` : "";
        const kw = (t.keyword || "").trim();
        return `- [${t.source ?? "news"}] ${kw ? `${kw} — ` : ""}${t.title || kw}${win}`;
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
/** ★마지막 홈판 생성 진단(2026-08-04) — debug 응답이 읽어 간다. '홈판 2/5'의 이유가 화면에 보여야 한다. */
export let lastHomebetDiag: {
  want: number; tryN: number; round1: number; round2: number; dupDropped: number; out: number;
  failBy: Record<string, number>; cached: boolean; at: string;
} | null = null;

export async function pickHomefeedBets(
  db: SupabaseClient, userId: string, sub: string, usedKeywords: Set<string>, n = 1,
  opts?: {
    /** 발행한 글과 유사한가(제목까지 본다). ★호출측 게이트를 여기로 끌어온 이유는 아래 캐시 설명 참고. */
    isDup?: (title: string, keyword: string) => boolean;
    /** 최근 발행 제목 — 모델에게 '이런 제목은 이미 썼다'를 보여준다. 키워드만 주면 제목이 겹친다(실측). */
    recentTitles?: string[];
    /** ★최근 14일 글의 키워드 — 소재(핵심어) 반복을 코드가 막는다(2026-08-05).
     *  프롬프트의 '이미 쓴 주제 제외' 목록만으로는 모델이 '엔화 폭등 내 돈'을 피해도 '엔화 지갑'으로 돌아온다. */
    recentKeywords?: string[];
  },
): Promise<HomefeedBet[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const want = Math.max(0, Math.min(n, BET_TYPES.length));
  if (!apiKey || want === 0) return [];
  const kstDay = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  // ★캐시 키에 버전을 둔다 — 판정 규칙이 바뀌면 옛 캐시는 '규칙 이전에 통과한 것'이라 못 믿는다.
  //  v2(2026-08-02): 발행글 유사 판정을 캐시 이전으로 옮겼다. 그 전 캐시는 걸러지지 않은 상태라 무효.
  // ★v3(2026-08-03) — 실데이터 씨앗 주입 + 출처 표기가 들어갔다. 버전을 안 올리면 24h 캐시가
  //  옛 카드를 그대로 서빙해서 "코드는 고쳤는데 화면은 그대로"가 된다(유저 실측으로 확인).
  // ★v4(2026-08-04) — 보충 라운드가 생겼다. 옛 캐시는 '한 번만 시도하고 끝낸' 결과라 미달이 굳어 있다.
  // ★v5(2026-08-05) — 유형 회전이 KST 자정 기준으로 바뀌고, 최근 소재 차단이 생겼다.
  //  옛 캐시는 '어제 유형 · 어제 소재'로 만들어진 세트라 그대로 두면 오늘도 같은 카드가 선다.
  // ★v6(2026-08-05) — 캐시에서 꺼낼 때도 '최근 소재 반복'을 거르도록 바꿨다.
  //  옛 캐시는 그 필터 이전에 저장된 세트라, 버전을 안 올리면 발행한 소재(엔화)가 하루 종일 남는다.
  const cacheKey = `homebet:v7:${userId}:${kstDay}:${want}`;
  let alive: HomefeedBet[] = []; // 캐시에서 살아남은(아직 안 쓴) 카드 — 부족분만 새로 만든다
  // ★최근 소재 기억(2026-08-05 — 엔화가 세 번째로 떴다. 앞선 두 번의 수리가 다 뚫렸다).
  //  왜 뚫렸나: 판정 재료가 '발행한 글'뿐이었다. 그런데 카드는 발행 안 해도 이미 보여준 소재다.
  //  게다가 표기가 흔들리면(엔화 → 엔·원 동조 → 환율) 토큰이 안 겹쳐 매번 새 소재로 보였다.
  //  ★그래서 '보여준 카드'를 3일간 DB에 누적해 제외 목록에 얹는다. 발행 여부와 무관하다.
  const recentKey = `homebet:recent:${userId}`;
  let shownRecently: string[] = [];
  try {
    const { data: rc } = await db.from("api_cache").select("value, expires_at").eq("key", recentKey).maybeSingle();
    if (rc?.value && new Date(String(rc.expires_at)).getTime() > Date.now()) shownRecently = (rc.value as string[]) ?? [];
  } catch { /* 기억 조회 실패 — 이번 판은 기억 없이 간다 */ }
  // ★소재 반복은 '핵심어 한 개'로는 못 막는다(2026-08-05 재발: 엔화 글을 쓴 다음 날 또 엔화 카드).
  //  coreKeywordOf는 가장 긴 토큰을 고르는데, '엔화 오를수록 통장'이면 '오를수록'이 뽑혀 소재를 못 가리킨다.
  //  ★그래서 최근에 쓴 글의 '실질 토큰'을 통째로 들고, 새 카드가 그 중 하나라도 품으면 같은 소재로 본다.
  const TOPIC_STOP = new Set(["지원금", "신청", "방법", "조건", "기준", "정리", "총정리", "혜택", "제도", "정책", "현실", "이유", "기한", "안내", "변경", "개편", "확대", "얼마", "누구", "지금", "올해", "내년", "이번", "통장", "사람", "경우", "차이", "구조", "선택", "기회", "가지"]);
  const topicTokens = (t: string) => String(t || "").split(/[\s·,]+/)
    .map((w) => w.replace(/[^가-힣a-zA-Z0-9]/g, ""))
    .filter((w) => [...w].length >= 2 && !TOPIC_STOP.has(w) && !/^\d+$/.test(w));
  // ★두 기억을 나눈다(2026-08-05 실측: round1 4장 → dupDropped 4 → out 0, 홈판 전멸).
  //  종전엔 '토큰 하나만 겹쳐도 중복'이었다. 3일치가 쌓이면 토큰 집합이 커져서 뭘 만들어도 걸린다 —
  //  중복을 막으려던 규칙이 생산 자체를 막고 있었다.
  //  ★쓴 글과 보여만 준 카드는 무게가 다르다:
  //   · 발행한 글 → 같은 말이 하나만 겹쳐도 곤란하다(내 글끼리 잡아먹는다)
  //   · 보여만 준 카드 → 독자는 본 적이 없다. 하나 겹쳤다고 버리면 재고가 마른다.
  const publishedTokens = new Set<string>([
    ...(opts?.recentKeywords ?? []).flatMap(topicTokens),
    ...(opts?.recentTitles ?? []).flatMap(topicTokens),
  ]);
  const shownTokens = new Set<string>(shownRecently.flatMap(topicTokens));
  const recentTopicTokens = new Set<string>([...publishedTokens, ...shownTokens]);
  // ★주제 축 — 표기가 흔들려도 같은 얘기인 것들을 한 묶음으로 본다(2026-08-05).
  //  실측: '엔화 폭등' → '엔·원 동조' → '환율 1400원대'. 토큰은 매번 다른데 독자에겐 같은 소재다.
  //  ★사전을 크게 만들지 않는다 — 실제로 반복된 축만 넣고, 새 반복이 관측되면 그때 추가한다.
  const TOPIC_AXES: RegExp[] = [
    /(엔화|엔·원|엔원|환율|원달러|달러|엔저)/,
    /(전기차|충전|충전비)/,
    /(포인트|캐시백|적립)/,
    /(청약|분양|무순위)/,
  ];
  const axisOf = (t: string): number => TOPIC_AXES.findIndex((re) => re.test(t));
  const recentAxes = new Set<number>(
    [...(opts?.recentKeywords ?? []), ...(opts?.recentTitles ?? []), ...shownRecently]
      .map(axisOf).filter((i) => i >= 0),
  );
  const repeatsRecent = (b: HomefeedBet): string | null => {
    const text = `${b.keyword} ${b.title}`;
    const toks = topicTokens(text);
    // ① 발행한 글과 겹치면 한 개라도 막는다 — 다만 두 글자 흔한 말은 제외(우연히 겹친다)
    for (const w of toks) if ([...w].length >= 3 && publishedTokens.has(w)) return w;
    // ② 보여만 준 카드는 두 개 이상 겹쳐야 같은 소재로 본다
    const shownHits = toks.filter((w) => shownTokens.has(w));
    if (shownHits.length >= 2) return shownHits.slice(0, 2).join("+");
    // ③ 주제 축은 표기가 흔들려도 같은 얘기다 — 이건 하나만 걸려도 막는다(정밀한 판정이라)
    const ax = axisOf(text);
    if (ax >= 0 && recentAxes.has(ax)) return `같은 주제 축(${TOPIC_AXES[ax]!.source.slice(1, 12)}…)`;
    return null;
  };
  const seededCores = recentTopicTokens.size;
  try {
    const { data: c } = await db.from("api_cache").select("value, expires_at").eq("key", cacheKey).maybeSingle();
    if (c?.value && new Date(String(c.expires_at)).getTime() > Date.now()) {
      const cached = c.value as HomefeedBet[];
      // ★캐시 히트도 진단에 남긴다 — 안 남기면 '오늘은 생성이 안 돌았다'와 '생성이 실패했다'가 구분되지 않는다.
      //  ★그리고 생성 당시의 진단을 되살린다 — 캐시가 이유까지 덮으면 결품만 남고 원인은 사라진다.
      let genDiag: typeof lastHomebetDiag = null;
      try {
        const { data: d } = await db.from("api_cache").select("value").eq("key", `${cacheKey}:diag`).maybeSingle();
        if (d?.value) genDiag = d.value as typeof lastHomebetDiag;
      } catch { /* 진단 복원 실패는 파이프에 영향 없다 */ }
      // ★쓴 카드는 캐시에서도 빼고, 빈 자리는 다시 채운다(2026-08-05 유저 실측에서 검거).
      //  실물: 홈판 2장을 다 발행했는데 같은 카드가 그대로 남아 있었다.
      //  종전 구조: 캐시는 하루치 세트를 통째로 들고 있고, '이미 쓴 것' 판정은 호출측(topics)에서만 했다.
      //  그러면 발행할수록 홈판 자리는 줄어들고 그 자리를 트렌드가 메운다 — 배합이 홈판 50%인데
      //  정작 홈판을 쓸수록 홈판이 사라지는 구조였다. 쓴 만큼 다시 만들어 주는 게 맞다.
      // ★최근 소재 반복 판정도 여기서 건다(2026-08-05 재발: 엔화 글을 발행했는데 캐시의 엔화 카드가 살아남았다).
      //  생성 경로에만 걸어 뒀더니 캐시 히트에서는 옛 카드가 그대로 나왔다 — 필터는 '꺼내는 자리'에도 있어야 한다.
      const cacheRepeat = (b: HomefeedBet): boolean => repeatsRecent(b) !== null;
      alive = cached.filter((b) => !usedKeywords.has(normalizeKeyword(b.keyword)) && !(opts?.isDup?.(b.title, b.keyword)) && !cacheRepeat(b));
      if (alive.length >= want) {
        lastHomebetDiag = genDiag
          ? { ...genDiag, cached: true, out: alive.length }
          : { want, tryN: 0, round1: alive.length, round2: 0, dupDropped: 0, out: alive.length, failBy: {}, cached: true, at: new Date().toISOString() };
        return alive.slice(0, want);
      }
      console.log(`[homebet] 캐시 ${cached.length}장 중 ${alive.length}장 생존(쓴 글 제외) — 부족분 ${want - alive.length}장을 새로 만든다`);
    }
  } catch { /* 캐시 조회 실패 — 생성으로 */ }

  // ★여유분을 뽑는다(2026-08-01 실측: 4장 요청에 1장만 나왔다).
  //  개별 생성은 여러 이유로 떨어진다 — 뉴스 없음(시장 유형), 금지어, 투자권유 표현, JSON 파싱 실패.
  //  딱 want개만 시도하면 한 장만 떨어져도 열이 빈다. 유형은 8종이니 넉넉히 시도해 먼저 성공한 want개를 쓴다.
  // ★유형 회전을 KST 자정 기준으로(2026-08-05 유저 실측에서 검거: "12시 지났는데 엔화·전기차가 그대로다").
  //  종전엔 UTC 자정 기준이라 회전이 KST 오전 9시에 일어났다 — 우리 하루(kstDay)와 9시간 어긋난 것이다.
  //  그래서 자정~오전 9시 사이엔 어제와 같은 유형 조합이 나오고, 씨앗도 밤새 그대로라 같은 주제가 반복됐다.
  //  CLAUDE.md에 이미 적힌 원칙 그대로다: 날짜 키는 로컬(KST) 기준. 유형 회전도 날짜 키다.
  const dayIdx = Math.floor((Date.now() + 9 * 3600_000) / 86400_000) % BET_TYPES.length;
  // ★살아남은 카드가 있으면 그만큼만 새로 만든다 — 이미 있는 유형은 다시 뽑지 않는다(같은 유형 두 장 방지).
  const aliveTypes = new Set(alive.map((b) => b.betType));
  const need = Math.max(0, want - alive.length);
  const tryN = Math.min(BET_TYPES.length - aliveTypes.size, need + 3);
  const picked = Array.from({ length: BET_TYPES.length }, (_, i) => BET_TYPES[(dayIdx + i) % BET_TYPES.length]!)
    .filter((b) => !aliveTypes.has(b.key))
    .slice(0, Math.max(1, tryN));
  // ★탈락 사유 회계(2026-08-04) — 종전엔 전부 console.error라 화면에서는 '홈판 2/5'만 보이고 왜인지는 알 수 없었다.
  //  홈판 결품이 상시화된 지금, 사유 없는 결품 보고는 다음 사람에게 아무것도 넘겨주지 않는다.
  const failBy: Record<string, number> = {};
  const runRound = async (types: typeof picked, used: Set<string>) => {
    const rs = await Promise.all(types.map((bet) => genOne(apiKey, userId, sub, used, bet, opts?.recentTitles)));
    const cards: HomefeedBet[] = [];
    const failedTypes: typeof picked = [];
    rs.forEach((r, i) => {
      if (r.card) cards.push(r.card);
      else { failBy[r.fail ?? "?"] = (failBy[r.fail ?? "?"] ?? 0) + 1; failedTypes.push(types[i]!); }
    });
    return { cards, failedTypes };
  };
  const r1 = await runRound(picked, usedKeywords);
  let got = [...alive, ...r1.cards]; // 살아남은 카드가 먼저 — 오늘 이미 검증된 것들이다
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
  // ★최근에 쓴 소재의 핵심어를 미리 넣어 둔다 — 같은 소재를 다시 만들면 그 자리에서 걸린다.
  //  실물: 어제 '엔화 폭등 내 돈'·'전기차 충전비 함정'을 발행했는데 오늘 또 엔화·전기차 카드가 섰다.
  const usedCores = new Set<string>();

  let dupDropped = 0;
  const dedupeInto = (target: HomefeedBet[], cards: HomefeedBet[]) => {
    for (const b of cards) {
      // ★최근에 쓴 소재를 다시 만들었으면 여기서 버린다 — 같은 블로그에 같은 소재가 이틀 연속 서면 안 된다.
      const rep = repeatsRecent(b);
      if (rep) {
        dupDropped += 1;
        console.log(`[homebet] 최근 소재 반복 — 제외: ${b.betType} / ${b.keyword} (겹친 말 '${rep}')`);
        continue;
      }
      const core = coreKeywordOf(b.keyword);
      if (usedCores.has(core)) {
        dupDropped += 1;
        console.log(`[homebet] 소재 중복 — 제외: ${b.betType} / ${b.keyword} (핵심어 ${core})`);
        continue;
      }
      usedCores.add(core);
      target.push(b);
    }
  };
  const deduped: HomefeedBet[] = [];
  dedupeInto(deduped, got);

  // ★보충 라운드(2026-08-04 유저 실측: want 5 → 2장). 1차에서 떨어진 유형을 '이번에 이미 잡힌 소재'를 제외 목록에
  //  얹어 다시 부른다 — 유형 8종을 한 번씩 쓰고 끝내면, 절반이 떨어진 날은 그대로 결품으로 굳는다.
  //  ★한 번만 더 한다(무한 재시도 금지 — 비용도 시간도 유저가 기다리는 응답 안에 있다).
  let round2 = 0;
  if (deduped.length < want && r1.failedTypes.length) {
    const need = want - deduped.length;
    const retryTypes = r1.failedTypes.slice(0, Math.min(r1.failedTypes.length, need + 1));
    const used2 = new Set([...usedKeywords, ...deduped.map((b) => b.keyword)]); // 이번에 잡은 소재도 '이미 쓴 주제'로 넘긴다
    const r2 = await runRound(retryTypes, used2);
    round2 = r2.cards.length;
    let fresh = r2.cards;
    if (opts?.isDup) fresh = fresh.filter((b) => !opts.isDup!(b.title, b.keyword));
    dedupeInto(deduped, fresh);
    console.log(`[homebet] 보충 라운드 — 재시도 ${retryTypes.length}유형 → ${r2.cards.length}장 생성, 최종 ${deduped.length}/${want}`);
  }
  const out = deduped.slice(0, want);
  lastHomebetDiag = {
    want, tryN, round1: got.length, round2, dupDropped, out: out.length,
    failBy, cached: false, at: new Date().toISOString(),
  };
  if (out.length < want || dupDropped > 0) {
    console.log(`[homebet] ${out.length}/${want} — 1차 생성 ${got.length}/${tryN} · 보충 ${round2} · 소재중복 제외 ${dupDropped}(최근 소재 ${seededCores}개 사전 차단) · 탈락사유 ${JSON.stringify(failBy)}`);
  }
  if (out.length) {
    // ★부분 결과를 하루 종일 물고 있으면 안 된다(이번 사고의 직접 원인).
    //  쿼터를 채웠을 때만 24시간 캐시하고, 미달이면 1시간만 — 다음 호출에서 다시 채워 본다.
    const full = out.length >= want;
    const ttlMs = full ? 24 * 3600_000 : 1 * 3600_000;
    try { await db.from("api_cache").upsert({ key: cacheKey, value: out, expires_at: new Date(Date.now() + ttlMs).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
    // ★생성 진단도 함께 남긴다(2026-08-04 실측: 캐시 히트가 진단을 덮어써서 '왜 3장인지'가 사라졌다).
    //  캐시가 살아 있는 동안에도 결품의 이유는 계속 물어볼 수 있어야 한다 — 이유가 사라지면 결품만 남는다.
    try { await db.from("api_cache").upsert({ key: `${cacheKey}:diag`, value: lastHomebetDiag, expires_at: new Date(Date.now() + ttlMs).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
    if (!full) console.log(`[homebet] 쿼터 미달 ${out.length}/${want} — 1시간 뒤 재시도(짧은 캐시)`);
    // ★보여준 소재를 3일 기억에 적재한다 — 다음 판이 같은 소재를 다시 만들지 않게.
    try {
      const merged = [...out.map((b) => `${b.keyword} ${b.title}`), ...shownRecently].slice(0, 60);
      await db.from("api_cache").upsert({ key: recentKey, value: merged, expires_at: new Date(Date.now() + 3 * 86400_000).toISOString(), updated_at: new Date().toISOString() });
    } catch { /* 기억 저장 실패 — 다음 회차 */ }
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
): Promise<{ card: HomefeedBet | null; fail: string | null }> {
  try {
    // 뉴스 그라운딩이 필요한 유형인데 기사를 못 받았으면 그 장은 포기한다(지어낸 시황 방지).
    const newsBlock = await marketNewsBlock(bet.key);
    if (NEWS_GROUNDED[bet.key] && !newsBlock) {
      console.error("[homebet] 뉴스 없음 — 시장 유형 스킵:", bet.key);
      return { card: null, fail: "뉴스없음" };
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
          `JSON만 출력: {"keyword":"주제 앵커(15자 이내)","title":"훅 제목(32자 이내)","thumbCopy":"썸네일 문구(6자 이내 초단문 — 글자가 적을수록 유리. ★제목을 반복하지 말고 개념 하나만 던진다: 썸네일이 질문, 제목이 답 — '검색 끝.' 결)","angle":"본문이 다룰 핵심 각도 2문장","src":"위 [오늘 수확한 실제 이슈] 목록에서 실제로 쓴 항목을 그대로 옮긴다(30자 이내). 목록을 안 썼거나 목록이 없었으면 빈 문자열."}`,
          `★src는 정직하게 적는다 — 유저가 이 카드가 진짜 실데이터에서 나왔는지 확인하는 자리다. 안 썼으면서 적으면 그게 거짓말이다.`,
        ].join("\n"),
      }],
    });
    void logUsage({ userId, model: "claude-sonnet-4-6", kind: "homefeed_bet", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const text = res.content.map((x) => (x.type === "text" ? x.text : "")).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { card: null, fail: "JSON없음" };
    const raw = JSON.parse(m[0]) as { keyword?: string; title?: string; thumbCopy?: string; angle?: string; src?: string };
    if (!raw.keyword || !raw.title) return { card: null, fail: "필수필드누락" };
    // ★문구 게이트(2026-07-17 PTRP) — 감정 과잉·과장 어휘는 텍스트 카드에서 역효과 실증. 제목 위반=오늘 배팅 스킵, 문구 위반=키워드 폴백.
    if (containsBanned(raw.title)) { console.error("[homebet] 금지어 제목 — 스킵:", raw.title.slice(0, 30)); return { card: null, fail: "금지어" }; }
    // ★투자권유 오인 — 주식 유형 추가(2026-08-01)로 생긴 경로. 제목·각도 어디에 있어도 그 장은 버린다.
    if (INVEST_PUSH_RE.test(raw.title) || INVEST_PUSH_RE.test(raw.angle ?? "")) {
      console.error("[homebet] 투자권유 오인 표현 — 스킵:", raw.title.slice(0, 30));
      return { card: null, fail: "투자권유오인" };
    }
    // ★홈판 제목 규격 게이트(2026-08-02) — 프롬프트는 방향, 코드는 한계선.
    //  길이·부호 남용·키워드 실종을 여기서 잡는다. 걸리면 그 장만 버린다(다른 유형이 자리를 채운다).
    // ★지난 달 시의성 — 프롬프트로 날짜를 줘도 모델은 틀릴 수 있다. 걸리면 그 장만 버린다.
    const stale = staleMonthIn(`${raw.title} ${raw.keyword} ${raw.angle ?? ""}`);
    if (stale !== null) {
      console.error(`[homebet] 지난 달(${stale}월) 소재 — 스킵: ${raw.title.slice(0, 40)}`);
      return { card: null, fail: `지난달소재(${stale}월)` };
    }
    const tv = validateHomefeedTitle(raw.title, raw.keyword);
    if (!tv.ok) {
      console.error(`[homebet] 제목 규격 위반(${tv.reason}) — 스킵: 앵커="${raw.keyword}" 제목="${raw.title.slice(0, 40)}"`);
      return { card: null, fail: `제목규격(${tv.reason})` };
    }
    const thumbCopy0 = (raw.thumbCopy ?? raw.keyword).slice(0, 14);
    const out: HomefeedBet = {
      keyword: raw.keyword.slice(0, 30),
      title: raw.title.slice(0, 60),
      thumbCopy: containsBanned(thumbCopy0) ? raw.keyword.slice(0, 14) : thumbCopy0,
      betType: bet.key,
      titleType: titleType.key,
      // ★출처(2026-08-03 유저 요청) — 모델이 실제로 쓴 수확 이슈를 그대로 옮긴다.
      //  씨앗 블록이 없었으면 빈 값이고, 그러면 화면에도 출처가 안 뜬다 — '실데이터가 아니었다'는 사실이 보여야 한다.
      sourceTitle: seedBlock ? String(raw.src ?? "").trim().slice(0, 40) || undefined : undefined,
      briefText: [
        `[홈판 배팅 지시] 이 글은 검색 노출이 아니라 네이버 홈피드(홈판) 확산을 노린다 — 제목은 검색 질문형이 아니라 위 훅 제목을 그대로(또는 더 강하게) 쓴다.`,
        `유형: ${bet.key} / 제목 유형: ${titleType.name} — ★본문 이행 의무: ${titleType.payoff}`,
        `핵심 각도: ${(raw.angle ?? "").slice(0, 300)}`,
        `규칙: ①모든 수치는 공식 통계·실제 제도 기반 — 출처와 기준 시점 명시, 지어낸 사연 금지 ②도입 3문장 안에 '멈춤 포인트'(반전 수치·의외 사실)를 박는다 — 홈판은 3초 안에 스크롤이 지나간다 ③독자가 자기 상황을 대입할 분기(나이대·상황별)를 반드시 넣는다 ④마무리에 저장 유도(체크리스트·계산 순서) — 홈판 글의 승부는 공감·저장 반응이다.`,
        `⑤★댓글 유도(2026-07-16 개정 — 댓글·체류가 홈피드 노출 점수): 마무리 직전에 독자 의견을 묻는 진짜 질문 1개를 자연스럽게 넣는다(예: "여러분은 무이자 할부, 한 달에 몇 번이나 쓰세요?") — '댓글 달아주세요' 류 부탁 금지, 대답하고 싶어지는 질문이어야 한다 ⑥크리에이터 시각 1곳 — 뻔한 정리가 아니라 이 데이터를 보는 나만의 해석 한 단락('제가 이 통계에서 진짜 놀란 건 평균이 아니라 격차예요' 결).`,
      ].join("\n"),
    };
    return { card: out, fail: null };
  } catch (e) {
    console.error("[homebet] 생성 실패(이 장만 스킵):", e instanceof Error ? e.message : e);
    return { card: null, fail: `예외: ${e instanceof Error ? e.message.slice(0, 40) : "?"}` };
  }
}
