import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "./supabase-server";
import { fetchApplyhomeSeeds } from "./applyhome";
import { fetchGov24Seeds } from "./gov24";
import { fetchBizinfoSeeds } from "./bizinfoSeeds";
import { fetchDartIPOSeeds, ipoAdviceLeak } from "./dartIPO";
import { fetchCorpActionSeeds } from "./dartCorpAction";
import { measureTopicDemand, hasRealDemand } from "./topicDemand";
import { preemptionScore, preemptionNote, preemptWindow } from "./preemption";
import { gatherHeadlinesWithStats, RISING_SEED, risingKeywordOf, seedsFor } from "./trendSources";
import { harvestBrandBuzz, hasBrandAxis } from "./brandBuzz";
import { harvestCommunity, communityBrief } from "./communityBuzz";
import { seasonalSeeds } from "./seasonalEvents";
import { econSeeds } from "./econCalendar";
import { policySeeds } from "./policyCalendar";
import { harvestGovPress } from "./govPress";
import { expandAutocomplete } from "./naverAutocomplete";
import { fetchBlogTotal } from "./naverBlogSearch";
import { fetchTrend } from "./naverDatalab";
import { isUnsafeKeyword, financeBrandAllowed } from "./keywordSafety";
import { scamLoan } from "./cardFinalGate";
import { logUsage } from "./usageLog";

// ★실시간 트렌드 글감 — 카테고리 단위로 '그날 그시간' 트렌드를 종합해 공유 풀에 저장.
//  소스: 네이버 뉴스(분야별·실시간) + Anthropic 웹검색(열린 웹 전체). AI가 다양한 검색형 글감으로 합성.
//  스케일: 유저 무관(카테고리당 1회) → 1만·100만 명 동일 비용. 유저는 이 풀에서 시드 회전으로 다른 조각을 봄.

export interface Longtail { kw: string; blogTotal: number | null }
// ★"rising"(2026-08-04 유저 상시 요구: "지금 뜨는은 실제로 효과 있는 실시간 키워드 or 대형 선점 가능한 것") —
//  구글 트렌드 KR 급상승 유래. 이 표식이 있어야 밴드 우회 판정을 할 수 있다(없으면 전부 news로 뭉개진다).
// ★"calendar"(2026-08-05) — 미리 공표된 일정(세금·지급·계절·정책). 선점의 최상위 재료.
export type SeedSource = "news" | "season" | "discover" | "applyhome" | "gov24" | "bizinfo" | "dart" | "rising" | "calendar" | "gov";
export interface TrendTopic {
  keyword: string;
  title: string;
  newsContext: string | null;
  longtails: Longtail[]; // 자동완성 실검증 롱테일(실익 키워드). 검색자가 실제로 치는 것.
  source?: SeedSource;   // 씨앗 출처 — news/season='지금 뜨는', discover='꾸준한 수요'(momentum 배지 분리)
  expiresAt?: string | null; // 씨앗 만료 시각 — 트렌드 수명 카운터용
  actionStart?: string | null; // ★행동 창(공고형) — 접수 시작
  actionEnd?: string | null;   // 접수 마감(=카드 만료)
}

// ★씨앗 수명 6시간 — 수확 크론 간격과 반드시 함께 본다(2026-08-02 검거).
//  Vercel 크론은 UTC다. 종전 스케줄 "0 0,2,6,12"는 KST로 09·11·15·21시라 밤 간격이 12시간이었다.
//  수명 6시간 < 간격 12시간 ⇒ KST 03:00~09:00은 트렌드 씨앗이 구조적으로 전멸한다.
//  하필 우리가 권장하는 발행 시간(KST 06~08시)이 그 구멍 한가운데였다 — '지금 뜨는' 열이
//  아침마다 말라 있던 진짜 이유다(게이트 탓이 아니었다).
//  → vercel.json을 "0 */4"(KST 01·05·09·13·17·21)로 바꿔 최대 간격 4시간 < 수명 6시간을 만들었다.
//  ★이 상수를 늘리거나 크론을 줄일 때는 반드시 둘을 같이 계산할 것(간격 < 수명).
const FRESH_MS = 6 * 3600_000; // 6시간 신선도

// ★헤드라인/합성 키워드 → 검색형 명사구 정규화(구조적). 조사·서술어·분석/논평어 제거, 2~3어절.
//  검색창에 칠 법한 형태로 강제 → 자동완성이 걸리는 씨앗만 남게 하는 전제.
const ANALYSIS_TAIL = /\s*(효과\s*분석|영향\s*분석|정책\s*변화|효과|분석|전망|현황|동향|방안|변화|영향|정책|이슈|논란|대책|정리|총정리|비교)\s*$/;
export function compressToSearchKeyword(raw: string): string {
  let s = (raw || "").trim().slice(0, 60);
  // 분석/논평 꼬리를 반복 제거(예: "지원금 효과 분석" → "지원금")
  for (let i = 0; i < 3 && ANALYSIS_TAIL.test(s); i++) s = s.replace(ANALYSIS_TAIL, "").trim();
  // 끝 조사 제거
  // 조사 제거 — 단, 이/가/한/할은 명사 끝과 충돌(휴가·평가·인가·조사·분할)이라 제외. 안전한 조사만.
  s = s.replace(/(은|는|을|를|의|에서|으로|와|도|께)\s*$/g, "").trim();
  // 2~3어절 명사구로
  const toks = s.split(/\s+/).filter(Boolean).slice(0, 3);
  return toks.join(" ").trim();
}

// ★합성 금지 게이트(2026-08-05 유저 확정: "합성 금지시키세요").
//  배경: 8월 4일 네이버 경제 인기유입검색어 20개가 우리 글감에 단 1개도 없었다.
//  원인은 원천이 아니라 합성이었다 — 뉴스는 들어왔는데 LLM이 원어를 조합어로 바꿔 검색어가 아니게 됐다.
//   실제 뉴스: "2026 세제개편안 발표… ISA 비과세 한도 상향"
//   우리 합성: "ISA 비과세 한도 조건"   ← 아무도 안 치는 말
//   실제 검색: "세제개편안" / "isa 개편" ← 뉴스에 나온 말 그대로
//  ★프롬프트는 방향, 코드가 한계선(CLAUDE.md) — 원문에 없는 말이 섞이면 그 글감은 버린다.
//   비교는 공백·조사를 무시한다(표기 흔들림까지 잡으면 정상 추출도 죽는다).
const SYNTH_JOSA = /(은|는|이|가|을|를|의|에|에서|으로|로|와|과|도|만|까지|부터|보다|께|에게|한|할|된|되는|하는)$/;
function synthNorm(t: string): string {
  return String(t || "").toLowerCase().replace(/[^가-힣a-z0-9]/g, "");
}
/** keyword의 모든 실질 토큰이 원문에 실재하는가. 하나라도 없으면 '만든 말'이다. */
export function isExtractedFromSource(keyword: string, sourceText: string): boolean {
  const src = synthNorm(sourceText);
  if (!src) return true; // 대조할 원문이 없으면 판정하지 않는다(수확을 막지 않는다)
  const toks = String(keyword || "").split(/\s+/)
    .map((w) => w.replace(SYNTH_JOSA, ""))
    .map(synthNorm)
    .filter((w) => w.length >= 2);
  if (!toks.length) return false;
  return toks.every((w) => src.includes(w));
}

/** 카테고리의 살아있는 트렌드 글감을 읽는다(만료 제외). */
export async function getTrendTopics(category: string): Promise<TrendTopic[]> {
  try {
    const admin = createSupabaseAdminClient();
    const run = (cols: string) => admin
      .from("trend_topics")
      .select(cols)
      .eq("category", category)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(40);
    // longtails 컬럼(0049) 유무에 무관하게 작동 — 있으면 쓰고, 없으면(마이그레이션 전) 컬럼 빼고 재조회.
    type Row = { keyword: string; title: string; news_context: string | null; longtails?: unknown; source?: string };
    const first = await run("keyword, title, news_context, longtails, source, expires_at, action_start, action_end");
    const second = first.error ? await run("keyword, title, news_context, longtails, source, expires_at") : null;
    const rows = (first.error ? (second && !second.error ? second.data : (await run("keyword, title, news_context, expires_at")).data) : first.data) as Row[] | null;
    return (rows ?? []).map((r) => ({ keyword: r.keyword, title: r.title, newsContext: r.news_context, longtails: Array.isArray(r.longtails) ? (r.longtails as Longtail[]) : [], source: (r.source as SeedSource) ?? undefined, expiresAt: (r as { expires_at?: string }).expires_at ?? null, actionStart: (r as { action_start?: string }).action_start ?? null, actionEnd: (r as { action_end?: string }).action_end ?? null }));
  } catch {
    return [];
  }
}

/** 카테고리에 신선한 트렌드가 있는지(있으면 갱신 스킵). */
export async function hasFreshTrends(category: string): Promise<boolean> {
  const t = await getTrendTopics(category);
  // ★공고 씨앗(접수 마감까지 장수명 — actionEnd 보유)은 카운트 제외(실측: 공고 10개가 '신선' 판정을 채워 뉴스 재수확 영구 스킵 — 서해구 불멸 사고)
  return t.filter((x) => !x.actionEnd).length >= 8;
}

// 게이트 탈락 기록 — 이후 튜닝의 기준 데이터(stale은 소스층 [trend-fresh] 로그, 여기는 합성 이후 게이트).
export interface SeedDrop { keyword: string; title: string; reason: "unsafe_brand" | "stale_year" | "no_utility" | "gap" | "dead_or_niche" | "synthesized" }
export interface RefreshResult { generated: number; drops: SeedDrop[]; applyhome?: { ecoCategory: boolean; keySet: boolean; fetched: number; joined: number; error?: string } }

/** 카테고리 트렌드 갱신 — 뉴스+웹검색 종합 → AI 합성 → 풀 저장. 크론에서만 호출. */
export async function refreshCategoryTrends(category: string): Promise<RefreshResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const drops: SeedDrop[] = [];
  // ★금융 브랜드 허용 여부는 분야로 갈린다(2026-08-05) — 재테크 채널에선 브랜드 이벤트가 본업 소재다.
  const brandOk = { allowFinanceBrand: financeBrandAllowed(category) };
  const ah: NonNullable<RefreshResult["applyhome"]> = { ecoCategory: false, keySet: Boolean(process.env.DATA_GO_KR_KEY), fetched: 0, joined: 0 };
  if (!apiKey) return { generated: 0, drops };

  // ★다중 소스 — 네이버+구글 뉴스를 다양한 소주제로 수집(은행권 편향 제거)
  const { headlines: heads, stats } = await gatherHeadlinesWithStats(category).catch(() => ({ headlines: [], stats: null as null }));
  if (stats) {
    // ★발행일 파싱 실패율(유저 지시: 보충 폐지 후 씨앗 공급량의 관건 — 실패율 높으면 다음 일은 소스 폐기가 아니라 파서 수리, 특히 지자체 공고)
    const denom = Math.max(stats.raw, 1);
    const failPct = Math.round((stats.unverified / denom) * 100);
    console.log(`[trend-fresh] ${category}: raw=${stats.raw} fresh=${stats.fresh} 파싱실패=${stats.unverified}(${failPct}%) stale=${stats.stale} kept=${stats.kept}`, JSON.stringify(stats.perSeed));
    try {
      const admin = createSupabaseAdminClient();
      await admin.from("api_cache").upsert({ key: `fresh_stats:${category}`, value: { ...stats, failPct, at: new Date().toISOString() }, expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(), updated_at: new Date().toISOString() });
    } catch { /* 관측 실패는 수확을 막지 않는다 */ }
  }
  const newsList = heads.slice(0, 28).map((n, i) => `${i + 1}. (${n.seed}) ${n.title} — ${n.description.slice(0, 90)}`).join("\n");

  const kstDate = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const client = new Anthropic({ apiKey });

  const prompt = `오늘은 ${kstDate}(한국)이다. '${category}' 분야에서 지금 한국 사람들이 검색할 만한 '트렌디한 정보성 블로그 글감' 16개를 뽑아라.

[아래는 오늘 수집한 뉴스 헤드라인이다. 이걸 근거로 '지금 뜨는' 글감을 만들어라.]
[선별 기준 — 돈+행동 최우선] ①검색자의 돈이 직접 걸리고(지원금·환급·청약·보조금) ②신청·접수·마감·선착순처럼 행동 창이 있는 소재를 최우선으로 뽑아라(이런 글감이 실측 트래픽 수십만을 만든다). ③기업 기소·실적·주가·전망·논란 같은 '읽고 끝나는 뉴스'는 검색자가 행동할 게 없어 트래픽이 안 된다 — 그 소재로 글감을 만들지 마라. ④이미 끝난 일(최종 선정·수상·성료·협약 체결)도 같은 이유로 금지 — 행동 창이 닫힌 공고는 죽은 글감이다. ⑤단일 기관·특정 지역의 행사(농협 아카데미·문화센터 특강)는 전국 검색 수요가 없다 — 금지.
${newsList || "(뉴스 수집 실패 — 분야 상식으로 다양하게 만들어라)"}

규칙:
- 그날의 신선함이 최우선. 오래된·뻔한 주제(예: 은행 금리 비교만 반복)는 피하고 분야 전체에 걸쳐 다양하게 흩어라.
- 검색하는 사람이 실익을 얻는 정보성만. 연예인·유명인·사건사고·정치공방·부고·루머·자극적 가십은 절대 제외.
- ★★keyword는 만들지 마라. 위 헤드라인에 '실제로 등장한 말'을 그대로 뽑아라(2026-08-05 유저 확정 — 최우선 규칙).
  사람들은 발표에 나온 말을 그대로 검색한다: 뉴스에 '2026 세제개편안'이 있으면 사람들은 '세제개편안'을 친다.
  네가 '비과세 한도 상향 조건' 같은 말을 만들면, 그건 말은 되지만 아무도 안 치는 검색어다.
  ★제도명·상품명·기업명·이벤트명은 원문 표기 그대로(띄어쓰기까지). 짧아도 된다 — 'isa', '민생지원금'처럼 1~2어절이 실제로 가장 강하다.
  ★원문에 없는 단어를 keyword에 넣으면 그 글감은 폐기된다(코드가 원문 대조로 검증한다).
- ★keyword = 사람이 네이버 검색창에 실제로 칠 명사구다. 조사·서술어를 붙이지 말고, '분석·전망·현황·동향·효과·변화·영향·정책·방안·이슈' 같은 논평/분석어를 넣지 마라. (나쁜 예: "소상공인 지원금 효과 분석", "부동산 규제 정책 변화" → 좋은 예: "소상공인 지원금", "부동산 규제")
- ★keyword는 '하나의 일관된 검색 주제'여야 한다. 서로 다른 두 뉴스·개념을 억지로 붙이지 마라. (나쁜 예: "전기차 미니 원전", "AI 생산혁명 부동산", "카타르 인프라 투자" — 이건 무관한 헤드라인을 합친 것) 실제로 그 단어 조합을 통째로 검색창에 칠 사람이 있어야 한다.
- ★특정 인물명·회사 인사(신임사장 등)·지역 행정소식처럼 '검색 실익'이 없는 건 제외한다.
- title=클릭할 블로그 제목.
- ★utility 판정(각 글감마다): "이 검색어로 들어온 사람이 [신청 방법/조건·자격/비교·선택/비용·후기] 중 하나를 실제로 얻어가는가?" 얻어가면 그 유형을, 아니면 "없음"을 utility에 적어라. 판정만 하고 글감을 빼지는 마라(우리가 거른다).
  · 실익 없음의 전형: 시사 논평·해설("~는 사실 ~였다", "~의 명과 암"), 거시지표·국가 단위 이야기(정부부채·성장률), 기업/산업 동향(파운드리 수율·투자 유치 — 개인이 행동할 수 없는 것).
  · ★경계 주의: '제도·정책 변경'은 개인 행동(확인·신청·이동)이 따르므로 실익 있음이다(예: 예금자보호 한도 변경=조건, 육아휴직 개편=신청, 마감 임박·자격 변경=신청/조건). 이런 걸 없음으로 판정하지 마라.
- 16개가 서로 다른 소주제여야 한다(중복·유사 금지).
- 반드시 JSON 배열로만 답(다른 말 금지): [{"keyword":"...","title":"...","utility":"신청|조건|비교|비용|후기|없음"}]`;

  let text = "";
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    void logUsage({ model: "claude-haiku-4-5", kind: "trend_refresh", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
  } catch {
    return { generated: 0, drops };
  }

  try {
    const m = /\[[\s\S]*\]/.exec(text);
    if (!m) return { generated: 0, drops };
    const parsed = JSON.parse(m[0]) as { keyword?: string; title?: string; utility?: string }[];

    // 근거 컨텍스트(뉴스) — 생성 시 최신성 주입용
    const ctx = heads.slice(0, 6).map((n) => `- [${n.press || n.seed}] ${n.title}: ${n.description.slice(0, 130)}`).join("\n") || null;

    const seen = new Set<string>();
    // ★대조 원문 — 합성에 넣어 준 헤드라인 전체(제목+요약). 여기 없는 말은 모델이 만든 것이다.
    const sourceCorpus = heads.map((h) => `${h.title} ${h.description ?? ""}`).join(" ");
    const rows = [];
    const expires = new Date(Date.now() + FRESH_MS).toISOString();
    // 이번 수확에 들어온 실시간 급상승 검색어들 — 합성 결과에 살아남았는지 대조할 원본
    const risingKws = heads.filter((h) => h.seed === RISING_SEED).map((h) => risingKeywordOf(h.title)).filter((x) => x.length >= 2);
    const risingTagged: string[] = [];
    // 논평형 title 보조 게이트(정규식) — utility 판정 누수 방어.
    const COMMENTARY_RE = /(가 아니라 .+(다|였다)|의 명과 암|에 던진 질문|의 민낯|잔혹사|를 둘러싼|의 그림자)/;
    for (const it of parsed) {
      const kw = compressToSearchKeyword((it.keyword ?? "").trim()); // ★검색형 명사구로 정규화(조사·분석/논평어 제거)
      const ti = (it.title ?? "").trim().slice(0, 80);
      if (!kw || !ti || seen.has(kw)) continue;
      if (isUnsafeKeyword(kw, brandOk) || isUnsafeKeyword(ti, brandOk)) { drops.push({ keyword: kw, title: ti, reason: "unsafe_brand" }); continue; }
      if (scamLoan(kw) || scamLoan(ti)) { drops.push({ keyword: kw, title: ti, reason: "unsafe_brand" }); continue; } // 대기업 사칭 대출(삼성재단대출류) — 유입 차단
      if (/20(1[0-9]|2[0-3])/.test(kw) || /20(1[0-9]|2[0-3])/.test(ti)) { drops.push({ keyword: kw, title: ti, reason: "stale_year" }); continue; } // 낡은 연도
      // ★실익 게이트 — utility='없음' 또는 논평형 title은 드롭(reason: no_utility)
      const util = (it.utility ?? "").trim();
      if (util === "없음" || COMMENTARY_RE.test(ti)) { drops.push({ keyword: kw, title: ti, reason: "no_utility" }); continue; }
      // ★합성 금지 — 원문에 없는 말이 섞인 글감은 버린다(위 isExtractedFromSource 참고)
      if (!isExtractedFromSource(kw, sourceCorpus)) {
        drops.push({ keyword: kw, title: ti, reason: "synthesized" });
        continue;
      }
      seen.add(kw);
      // ★실시간 급상승 혈통 보존 — 합성 결과가 급상승 검색어를 품고 있으면 그 카드는 '실시간 유래'다.
      //  씨앗을 직접 밀어 넣지 않고 태깅만 하는 이유: 급상승은 전 카테고리 공통이라 무관한 게 대부분인데,
      //  합성 LLM이 이미 카테고리 정합으로 걸러 준다. 살아남은 것만 실시간으로 인정하면 노이즈가 안 는다.
      const risingHit = risingKws.find((rk) => rk.length >= 2 && (kw.includes(rk) || ti.includes(rk)));
      if (risingHit) risingTagged.push(kw);
      rows.push({ category, keyword: kw, title: ti, news_context: ctx, longtails: [] as Longtail[], source: risingHit ? "rising" : "news", created_at: new Date().toISOString(), expires_at: expires });
    }
    // ★실시간 급상승 직접 주입(2026-08-05 — 태깅만으로는 생존이 0이었다).
    //  유저 상시 요구: "'지금 뜨는'은 실제로 효과 있는 실시간 키워드여야 한다."
    //  ★어제는 '합성 결과가 급상승 검색어를 품으면 태깅'만 했는데, 합성 LLM이 급상승어를 거의 안 골라
    //   diag.rising.seen이 0이었다 — 표식만 있고 실물이 없었다. 그러면 씨앗으로 직접 넣어야 한다.
    //  ★단 급상승은 전 카테고리 공통이라 무관한 게 대부분이다(연예·스포츠). 그래서 관문을 둔다:
    //   이 카테고리의 씨앗 단어와 실제로 겹치는 것만 받는다. 나머지는 애초에 안 들인다.
    {
      const catWords = new Set<string>(seedsFor(category).flatMap((w: string) => w.split(/\s+/)).filter((w: string) => w.length >= 2));
      let injected = 0;
      for (const rk of risingKws) {
        if (injected >= 3) break; // 하루 상한 — 실시간이 보드를 통째로 먹지 않게
        const kw = compressToSearchKeyword(rk);
        if (!kw || seen.has(kw)) continue;
        if (isUnsafeKeyword(kw, brandOk) || scamLoan(kw)) continue;
        // 카테고리 정합 — 급상승어가 이 분야 말과 겹치거나, 분야 씨앗 단어를 품고 있을 때만
        // ★정합 판정 둘 중 하나(2026-08-05 보강): 분야 일반명사와 겹치거나, '돈 되는 이벤트' 신호가 있거나.
        //  일반명사 겹침만 보면 '케이뱅크 황금캡슐'류가 영영 못 들어온다 — 그 말엔 '금리'도 '지원금'도 없다.
        const MONEY_BUZZ = /(이벤트|캡슐|룰렛|출석|응모|당첨|쿠폰|캐시백|리워드|포인트|적금|예금|특판|파킹|환급|지급|공모주|청약|보조금|지원금|세금|금리|대출한도|카드)/;
        const fits = [...catWords].some((w) => kw.includes(w) || w.includes(kw)) || MONEY_BUZZ.test(kw);
        // 이 분야와 무관한 급상승어는 애초에 안 들인다
        if (!fits) { drops.push({ keyword: kw, title: rk, reason: "dead_or_niche" }); continue; }
        seen.add(kw);
        risingTagged.push(kw);
        injected += 1;
        rows.push({ category, keyword: kw, title: `${kw}, 지금 왜 갑자기 찾을까`, news_context: `[실시간 급상승] 구글 트렌드 KR에서 지금 급상승 중인 검색어다. ★'${category}' 관점으로만 다룬다 — 이 분야와 무관한 일반 이슈 글 금지. 사람들이 지금 이 말을 왜 찾는지부터 짚고, 그 다음 내 돈·내 조건으로 번역한다.`, longtails: [] as Longtail[], source: "rising", created_at: new Date().toISOString(), expires_at: expires });
      }
      if (injected) console.log(`[rising] ${category}: 급상승 직접 주입 ${injected}개`);
    }

    // ★커뮤니티 수확 주입(2026-08-05 — 설계 4단계). 뽐뿌 쿠폰·핫딜 RSS, 최근 창만.
    //  근거: 케이뱅크 황금캡슐·삼성 온누리상품권의 1차 확산지가 커뮤니티였다(뉴스는 그 뒤).
    //  ★창 밖(오래된 글)은 아예 안 본다 — 뒷북을 구조적으로 막는 유일한 방법이다.
    if (/경제|재테크|금융|투자|부업|앱테크/.test(category)) {
      try {
        const cs = await harvestCommunity();
        let added = 0;
        for (const c of cs) {
          const kw = compressToSearchKeyword(c.keyword);
          if (!kw || seen.has(kw)) continue;
          if (isUnsafeKeyword(kw, brandOk) || scamLoan(kw)) continue;
          seen.add(kw);
          added += 1;
          rows.push({ category, keyword: kw, title: c.title, news_context: communityBrief(c), longtails: [] as Longtail[], source: "rising", created_at: new Date().toISOString(), expires_at: expires });
        }
        if (added) console.log(`[community] ${category}: ${added}건 — ${cs.slice(0, 3).map((x) => `${x.keyword}(${x.minutesAgo}분 전)`).join(", ")}`);
      } catch (e) {
        console.error("[community] 수집 실패:", e instanceof Error ? e.message : e);
      }
    }

    // ★기업 액션 공시 주입(2026-08-05 — 설계 3단계). 무상증자·유상증자·주식분할 결정.
    //  근거: 8/4 '알테오젠 무상증자'가 new로 진입했는데, 신호탄은 7/16 공시였다(19일 전).
    //  ★공시 당일이 1차 폭발이고, 권리락·기준일·상장일마다 다시 터진다 — 후속 창은 브리프에 남긴다.
    if (/경제|재테크|금융|투자|주식/.test(category)) {
      try {
        const acts = await fetchCorpActionSeeds();
        let added = 0;
        for (const a2 of acts) {
          const kw = compressToSearchKeyword(a2.keyword);
          if (!kw || seen.has(kw)) continue;
          if (isUnsafeKeyword(kw, brandOk) || scamLoan(kw)) continue;
          seen.add(kw);
          added += 1;
          rows.push({ category, keyword: kw, title: a2.title, news_context: `${a2.newsContext}\n★후속 창(추정): ${a2.followFrom}~${a2.followTo} 사이에 권리락·신주배정 관련 검색이 다시 오른다. 그 시점을 겨냥해 일정 표를 본문에 둔다.`, longtails: [] as Longtail[], source: "dart", created_at: new Date().toISOString(), expires_at: expires });
        }
        if (added) console.log(`[corp-action] ${category}: ${added}건 — ${acts.slice(0, 3).map((x) => x.keyword).join(", ")}`);
      } catch (e) {
        // ★조용한 0 금지 — 원천이 죽으면 그 사실이 로그에 남아야 한다
        console.error("[corp-action] 수집 실패:", e instanceof Error ? e.message : e);
      }
    }

    // ★정부 보도자료 주입(2026-08-05 — 설계 5단계). 정책브리핑 전 부처 목록.
    //  ★고정 캘린더는 내가 손으로 넣은 것만 있다 — 보도자료는 '새 마감일'을 매일 물어온다.
    //   실물: 국세청 "8.31.까지 법인세 중간예납" (8/4 공표 → T-27일 선점 창).
    //  ★부처 RSS는 전멸이라 목록 HTML을 판다 — 구조가 바뀌면 0건이 되므로 실패를 반드시 로그로 남긴다.
    if (/경제|재테크|금융|투자|부동산|세금|정책|생활|육아|시니어/.test(category)) {
      try {
        const gps = await harvestGovPress();
        let added = 0;
        for (const g of gps) {
          const kw = compressToSearchKeyword(g.keyword);
          if (!kw || seen.has(kw)) continue;
          if (isUnsafeKeyword(kw, brandOk) || scamLoan(kw)) continue;
          seen.add(kw);
          added += 1;
          rows.push({
            category, keyword: kw, title: g.title, news_context: g.newsContext, longtails: [] as Longtail[],
            source: "gov", created_at: new Date().toISOString(),
            // ★마감이 있으면 그게 이 글감의 수명이다 — 마감 지난 글감이 보드에 남으면 안 된다
            expires_at: g.deadline ? new Date(`${g.deadline}T23:59:59+09:00`).toISOString() : expires,
            ...(g.deadline ? { action_end: g.deadline } : {}),
          });
        }
        if (added) console.log(`[gov-press] ${category}: ${added}건 — ${gps.slice(0, 3).map((x) => `${x.keyword}${x.deadline ? `(마감 ${x.deadline})` : ""}`).join(", ")}`);
      } catch (e) {
        // ★조용한 0 금지 — HTML 구조가 바뀌면 여기서만 알 수 있다
        console.error("[gov-press] 수집 실패:", e instanceof Error ? e.message : e);
      }
    }

    // ★고정 캘린더 주입(2026-08-05 — 설계 1단계). 세금·지급·계절·주간·정책 일정.
    //  ★이게 선점의 최상위 재료다: 날짜가 미리 적혀 있으므로 '그날 이미 색인돼 있는 상태'를 만들 수 있다.
    //   6/27·8/4 전수 조사에서 상위 유입의 절반 이상이 이런 '미리 알 수 있던 일정'이었다.
    for (const ev of policySeeds(category)) {
      if (seen.has(ev.keyword)) continue;
      seen.add(ev.keyword);
      rows.push({ category, keyword: ev.keyword, title: ev.title, news_context: ev.newsContext, longtails: [] as Longtail[], source: "calendar", created_at: new Date().toISOString(), expires_at: expires });
      console.log(`[calendar] ${category}: ${ev.slot} — ${ev.keyword}`);
    }

    // ★브랜드 버즈 주입(2026-08-05 유저 지적: "케이뱅크 황금캡슐 같은 글이 왜 안 나오냐").
    //  자동완성이 '지금 브랜드 뒤에 붙여 치는 말'을 알려준다 — 이벤트·혜택 신호가 붙은 것만 들인다.
    //  ★이 축이 없으면 우리 보드엔 브랜드 이벤트 글감이 들어올 길이 아예 없었다(뉴스 쿼리도, 급상승 관문도,
    //   검색광고 풀도 전부 이런 말을 못 잡는다). 유명 블로거가 7/29에 그 글로 대박 난 자리다.
    try {
      if (hasBrandAxis(category)) {
        const buzz = await harvestBrandBuzz(category, 6, 20_000); // 축이 브랜드+돈 15개로 늘어 예산도 넓힌다
        let added = 0;
        for (const b of buzz) {
          const kw = compressToSearchKeyword(b.keyword);
          if (!kw || seen.has(kw)) continue;
          if (isUnsafeKeyword(kw, brandOk) || scamLoan(kw)) continue;
          seen.add(kw);
          added += 1;
          rows.push({ category, keyword: kw, title: `${kw}, 지금 챙기면 되는 것`, news_context: `[브랜드 버즈${b.momentum != null ? ` · 모멘텀 ${b.momentum}배, 피크 ${b.peakDaysAgo}일 전` : ""}] 네이버 자동완성에서 '${b.brand}' 뒤에 지금 실제로 붙어 검색되는 말이다 — 진행 중인 이벤트·혜택일 가능성이 높다. ★확인되지 않은 금액·기간·당첨 조건을 지어내지 마라. 공식 공지에서 확인되는 사실만 쓰고, 확인이 안 되면 '공식 앱·홈페이지에서 확인' 톤으로 남긴다. 이 글의 임무는 '지금 뭘 하면 되는지'를 순서로 주는 것이다.`, longtails: [] as Longtail[], source: "rising", created_at: new Date().toISOString(), expires_at: expires });
        }
        if (added) console.log(`[brand-buzz] ${category}: ${added}개 주입 — ${buzz.slice(0, 3).map((x) => `${x.keyword}(모멘텀 ${x.momentum ?? "?"})`).join(", ")}`);
      }
    } catch { /* 수확 실패는 조용히 — 기존 씨앗 파이프는 그대로 돈다 */ }

    // ★시즌 캘린더 주입 — D-14 이내 예측 가능 이슈(뉴스 신선도 게이트 면제, 자동완성 게이트는 동일 적용)
    for (const ev of seasonalSeeds(category)) {
      if (seen.has(ev.keyword)) continue;
      seen.add(ev.keyword);
      rows.push({ category, keyword: ev.keyword, title: ev.title, news_context: `[시즌 이슈: ${ev.title}] ★반드시 '${category}' 카테고리 관점으로만 다룬다 — 이 블로그 주제와 무관한 일반 시즌 글 금지(예: 자동차 블로그면 휴가철 장거리 운전 전 점검·차량 용품, 여행 블로그면 여행지·예약). 제목에도 카테고리 관점이 드러나야 한다.`, longtails: [] as Longtail[], source: "season", created_at: new Date().toISOString(), expires_at: expires });
    }

    // ★경제 지표 발표 선점(2026-08-02) — 금통위·물가·고용은 발표일이 몇 달 전에 공표된다.
    //  언제 터질지 100% 아는 유일한 재료라 선점 창(발표 D-2~D-0)에만 씨앗으로 넣는다.
    //  뉴스 신선도 게이트 면제 — 확정 일정이라 '오늘 기사'가 근거일 필요가 없다.
    for (const ev of econSeeds(category)) {
      if (seen.has(ev.keyword)) continue;
      seen.add(ev.keyword);
      rows.push({ category, keyword: ev.keyword, title: ev.title, news_context: ev.newsContext, longtails: [] as Longtail[], source: "season", created_at: new Date().toISOString(), expires_at: expires });
      console.log(`[econ-preempt] ${category}: ${ev.keyword} — ${ev.title}`);
    }

    // ★자동완성 발굴 — 카테고리 루트어의 실검색 확장(무료·무제한). 브랜드성 후보 제외. source=discover(배지 분리).
    {
      const INFO_INTENT = /(방법|조건|신청|추천|비교|후기|금리|지원|혜택|기간|환급|계산|순위|비용|가격|일정|자격|서류|대상)/;
      const BRANDY = /(카드|캐피탈|저축은행|뱅크|페이|증권|보험|생명|화재|의정석|리츠|KODEX|TIGER|ACE|RISE|SOL|PLUS|KBSTAR|ARIRANG|HANARO|KOSEF|액티브|합성|커버드콜|레버리지|인버스|ETN)/i;
      const roots = [...new Set(rows.slice(0, 6).map((r) => r.keyword.split(/\s+/)[0]))].slice(0, 4);
      for (const root of roots) {
        // ★2단 확장(2026-08-02) — 1단은 '고객센터·홈페이지·발급'처럼 굵고 경쟁 심한 머리말만 준다.
        //  검색자의 진짜 문장('발급조회·발급보류·자진퇴사 실업급여 조건')은 한 단계 더 들어가야 나온다.
        const acs = await expandAutocomplete(root).catch(() => []);
        for (const cand of acs) {
          if (rows.length >= 26) break;
          const kw = cand.trim();
          if ([...kw].length < 5 || seen.has(kw)) continue;
          if (BRANDY.test(kw) && !INFO_INTENT.test(kw)) continue; // 브랜드 상품명 제외
          if (!INFO_INTENT.test(kw)) continue;                    // 정보 의도 있는 실검색어만
          seen.add(kw);
          rows.push({ category, keyword: kw, title: `${kw}, 지금 확인할 것들`, news_context: null, longtails: [] as Longtail[], source: "discover", created_at: new Date().toISOString(), expires_at: expires });
        }
      }
    }

    if (rows.length === 0) return { generated: 0, drops };
    // ★실시간 유입 계측 — 수확은 됐는데 합성에서 전멸하는지, 애초에 안 들어오는지를 구분한다.
    console.log(`[rising] ${category}: 급상승 수확 ${risingKws.length} → 합성 생존 ${risingTagged.length}${risingTagged.length ? ` (${risingTagged.slice(0, 3).join(", ")})` : ""}`);

    // ★B단계: 씨앗별 자동완성 롱테일(실검증) + gap(예산). 자동완성은 비공식·무제한(무료), gap(fetchBlogTotal)만 쿼터 소비.
    //  예산 계산: 30 카테고리 × GAP_BUDGET(60)/refresh × 4 refresh/day = 7,200/day (네이버 검색 API 25,000/일 한도의 약 29%).
    //  예산 초과 시 롱테일 gap은 미검사(blogTotal=null)로 두고 씨앗 gap을 상속(폴백).
    const GAP_BUDGET = 60;       // 이 카테고리 1회 갱신당 gap 콜 상한
    const GAP_PER_SEED = 3;      // 씨앗당 gap 검사할 롱테일 수(검색량 상위)
    let gapUsed = 0;
    let ltTotal = 0;
    // 관련성 앵커(v3) — v2에 더해: ⑤롱테일 관련성(핵심 명사 포함 필수, 무관 매칭 차단) ⑥폴백 생존 씨앗은 키워드 교체/드롭(하드게이트 우회 차단).
    const norm = (x: string) => x.replace(/\s+/g, "").toLowerCase();
    // ★롱테일 관련성 — 원 키워드 핵심 명사 규칙:
    //  1토큰: 그 토큰 포함 / 2토큰: 첫 토큰 포함 또는 두 토큰 모두("폴더블 스마트폰"→'스마트폰내시경' 차단, '갤럭시 폴더블폰' 통과)
    //  3토큰↑: 최소 2토큰 포함("취약계층 아동 교육지원"→'미소금융 취약계층' 차단)
    const relOK = (seedKw: string, cand: string): boolean => {
      const st = seedKw.split(/\s+/).filter((t) => [...t].length >= 2 && !/^\d+$/.test(t)).map(norm);
      if (st.length === 0) return false;
      const n = norm(cand);
      const hits = st.filter((t) => n.includes(t)).length;
      if (st.length === 1) return hits >= 1;
      if (st.length === 2) return n.includes(st[0]) || hits >= 2;
      return hits >= 2;
    };
    for (const row of rows) {
      const toks = row.keyword.split(/\s+/).filter(Boolean);
      const longestBig = toks.filter((t) => [...t].length >= 4).sort((a, b) => [...b].length - [...a].length)[0];
      // 질의 순서: 전체 → 핵심어(4자↑ 최장 토큰) → 앞 2토큰 → 첫 토큰
      const queries = [row.keyword, longestBig, toks.slice(0, 2).join(" "), toks[0]].filter((q, i, a): q is string => Boolean(q) && a.indexOf(q) === i);
      let acs: string[] = [];
      let matchedIdx = -1;
      for (let qi = 0; qi < queries.length; qi++) {
        acs = await expandAutocomplete(queries[qi]).catch(() => []); // ★2단 확장 — 롱테일은 2단에 있다
        if (acs.length > 0) { matchedIdx = qi; break; }
      }
      // ★폴백 생존 처리 — 전체 키워드가 자동완성에 없으면(matchedIdx>0) 원 키워드는 유령.
      //  교체 조건(오염 방지): ①질의어가 '핵심어'일 때만(4자↑ 단어 or 4자↑ 2토큰 구 — "남성"·"임산부" 같은 짧은 일반어 질의 결과로 교체 금지)
      //  ②후보가 질의어를 포함 ③해몽/밈/브랜드 후보 제외. 조건 미달이면 드롭(하드게이트 우회 차단).
      if (matchedIdx > 0) {
        const q = queries[matchedIdx];
        const qn = norm(q);
        const qIsCore = [...qn].length >= 4; // 질의어(공백 제거) 4자 이상 = 구별력 있는 핵심어/구
        const JUNK_RE = /(꿈|해몽|사주|타로|나무위키|디시|갤러리|이란$|뜻$)/;
        const BRANDY_RE = /(카드|캐피탈|저축은행|은행|뱅크|페이|증권|보험|생명|화재)/;
        const INFO_RE = /(방법|조건|신청|추천|비교|후기|금리|지원|혜택|기간|환급|계산|순위|비용|가격|일정|자격|서류|대상)/;
        const repl = qIsCore ? acs.find((c) => {
          const ct = c.trim();
          return norm(ct).includes(qn) && !seen.has(compressToSearchKeyword(ct)) && !isUnsafeKeyword(ct, brandOk)
            && [...ct].length >= 5 && !JUNK_RE.test(ct) && !(BRANDY_RE.test(ct) && !INFO_RE.test(ct));
        }) : undefined;
        if (!repl) { (row as typeof row & { longtails?: Longtail[] }).longtails = []; continue; } // → gap 드롭
        seen.add(compressToSearchKeyword(repl));
        row.keyword = repl.trim(); // 제목(뉴스 각도)은 유지, 키워드만 실검색어로
      }
      // 관련성 게이트 — (교체됐다면 새 키워드 기준) 핵심 명사 포함 필수. 위반 롱테일 제거.
      // ★구체적인 것부터 본다(2026-08-02) — 2단 확장을 켜면 후보가 9→39개로 늘지만
      //  자동완성은 굵은 것(1단: '삼성카드 발급')을 앞에 준다. 그대로 8개를 자르면 2단이 통째로 잘리고,
      //  경쟁도 측정 예산(GAP_PER_SEED)도 전부 1단에 쓰인다 — 정확히 우리가 피하려던 키워드들이다.
      //  어절이 많을수록 의도가 뾰족하고 경쟁이 얕다('삼성카드 발급' < '삼성카드 발급보류').
      const cand = acs
        .filter((a) => a.trim() !== row.keyword && relOK(row.keyword, a) && !isUnsafeKeyword(a, brandOk))
        .sort((a, b) => b.trim().split(/\s+/).length - a.trim().split(/\s+/).length || [...b].length - [...a].length)
        .slice(0, 8);
      ltTotal += cand.length;
      const longtails: Longtail[] = [];
      for (let i = 0; i < cand.length; i++) {
        let bt: number | null = null;
        if (i < GAP_PER_SEED && gapUsed < GAP_BUDGET) { bt = await fetchBlogTotal(cand[i]).catch(() => null); gapUsed += 1; }
        longtails.push({ kw: cand[i], blogTotal: bt });
      }
      // 교체된 씨앗은 자기 자신이 실검색어 — 롱테일 0이어도 생존하도록 자신을 포함
      if (matchedIdx > 0 && longtails.length === 0) longtails.push({ kw: row.keyword, blogTotal: null });
      longtails.sort((a, b) => (a.blogTotal ?? 1e9) - (b.blogTotal ?? 1e9));
      (row as typeof row & { longtails?: Longtail[] }).longtails = longtails;
    }
    // ★죽은 공고·초지역 행사 게이트(유저 확정: 트래픽 안 되는 약체는 수확 단계에서 제외)
    //  - 행동 창이 이미 닫힌 것: 선정 완료·수상·성료·협약식(검색자가 할 행동이 없다)
    //  - 단일 기관 행사: 아카데미·특강·강좌(전국 검색 수요 없음)
    {
      const DEAD = /(최종 선정|선정 완료|선정됐|선정돼|수상|시상|성료|개최했|마쳤|체결했|협약식|발표회|출범식|기념식|위촉)/;
      const NICHE = /(아카데미|특강|강좌|교실|강연회|워크숍|간담회)/;
      const alive = rows.filter((r) => {
        const txt = `${r.title} ${r.keyword}`;
        if (DEAD.test(txt) || NICHE.test(txt)) { drops.push({ keyword: r.keyword, title: r.title, reason: "dead_or_niche" }); return false; }
        return true;
      });
      rows.length = 0; rows.push(...alive);
    }
    // ★하드 게이트 — 자동완성 롱테일이 0개인 씨앗(=아무도 안 치는 뉴스 문구)은 풀에서 제외.
    for (const r of rows) if (((r as { longtails?: Longtail[] }).longtails?.length ?? 0) === 0) drops.push({ keyword: r.keyword, title: r.title, reason: "gap" });
    const gated = rows.filter((r) => ((r as { longtails?: Longtail[] }).longtails?.length ?? 0) > 0);
    console.log(`[trend] ${category}: seeds=${rows.length}→gated=${gated.length}, autocomplete=${ltTotal}, gapChecks=${gapUsed}/${GAP_BUDGET}`);
    if (gated.length === 0) return { generated: 0, drops }; // 게이트 통과 0개면 기존 풀 유지(전멸 방지 — 삭제 안 함)
    rows.length = 0; rows.push(...gated);

    // ★데이터랩 급상승 랭킹 — 합성 키워드의 실제 검색 momentum으로 정렬(지금 뜨는 게 위로).
    //  데이터랩 그룹 한도 5개 → 배치로 조회. 실패해도 순서만 원본 유지(치명적 아님).
    try {
      const rising = new Map<string, number>();
      for (let i = 0; i < rows.length; i += 5) {
        const batch = rows.slice(i, i + 5).map((r) => r.keyword);
        const tr = await fetchTrend(batch).catch(() => ({ items: [] as { keyword: string; rising: boolean; latest: number }[] }));
        for (const it of tr.items) rising.set(it.keyword, (it.rising ? 1000 : 0) + (it.latest ?? 0));
      }
      rows.sort((a, b) => (rising.get(b.keyword) ?? 0) - (rising.get(a.keyword) ?? 0));
    } catch { /* 랭킹 실패 — 원본 순서 유지 */ }

    // ★클러스터 dedupe — 유사 변형("고유가지원금 신청/기간/대상/조회…")이 씨앗 슬롯을 독식하지 않게
    //  정규화(공백 제거) 앞 6자 같으면 한 클러스터 = momentum 상위 1개만 생존.
    {
      const clusterSeen = new Set<string>();
      const uniq = rows.filter((r) => {
        const ck = r.keyword.replace(/\s+/g, "").toLowerCase().slice(0, 6);
        if (clusterSeen.has(ck)) return false;
        clusterSeen.add(ck);
        return true;
      });
      rows.length = 0; rows.push(...uniq);
    }

    // ★선점 큐(2026-08-02 유저 확정: "지원금·청약·주식 이슈 — 더 연결해서 선점하는 거").
    //  종전(2026-08-01)엔 도착 순서대로 상한 4건을 채웠다 — 청약홈이 먼저 4건을 먹으면 그 뒤 보조금24에
    //  아무리 큰 게 있어도 자리가 없었다. 가치가 아니라 '순서'가 결정하고 있었다.
    //  이제 세 소스를 전부 모아 수요를 재고, 선점 점수(터질 크기 + 터질 시각)로 줄 세워 상위 N만 태운다.
    //  ★지역명은 보지 않는다 — 전국이 검색하는 청약은 지역명이 있어도 살아야 하고,
    //   아무도 안 찾는 지원사업은 지역명이 없어도 죽어야 한다. 판정은 실측 검색량과 접수 시각뿐이다.
    const NOTICE_CAP = 4;
    interface NoticeCand {
      keyword: string; title: string; newsContext: string | null;
      longtails: Longtail[]; source: SeedSource;
      // ★행동 창을 모르는 소스가 있다(DART 증권신고서는 청약일이 본문 PDF 안에 있고 목록 API엔 없다).
      //  모르면 비워 둔다 — 날짜를 지어내면 '마감 지남'을 잘못 판정해 살아 있는 글감을 죽인다.
      //  preemptWindow는 시작일이 없으면 "open"으로 본다(마감 판정만 못 할 뿐 파이프는 정상).
      actionStart?: string; actionEnd?: string;
    }
    const cands: NoticeCand[] = [];

    if (/경제|재테크|금융|부동산|투자|살아남|생활|정보/.test(category)) { // ★카테고리 폭 확대(실측 추적: sub_category 실값이 정규식 밖일 가능성)
      ah.ecoCategory = true;
      try {
        const homes = await fetchApplyhomeSeeds();
        ah.fetched = homes.length;
        for (const h of homes) cands.push({ keyword: h.keyword, title: h.title, newsContext: h.newsContext, longtails: h.longtails ?? [], source: "applyhome", actionStart: h.actionStart, actionEnd: h.actionEnd });
      } catch (e) { ah.error = e instanceof Error ? e.message.slice(0, 120) : "unknown"; }
      try {
        const govs = await fetchGov24Seeds();
        for (const g of govs.slice(0, 8)) cands.push({ keyword: g.keyword, title: g.title, newsContext: g.newsContext, longtails: [], source: "gov24", actionStart: g.actionStart, actionEnd: g.actionEnd });
      } catch (e) { console.log(`[gov24] 실패: ${e instanceof Error ? e.message : "unknown"}`); }
      try {
        const biz = await fetchBizinfoSeeds();
        for (const z of biz.slice(0, 6)) cands.push({ keyword: z.keyword, title: z.title, newsContext: z.newsContext, longtails: [], source: "bizinfo", actionStart: z.actionStart, actionEnd: z.actionEnd });
      } catch (e) { console.log(`[bizinfo] 실패: ${e instanceof Error ? e.message : "unknown"}`); }
      // ★공모주(DART 증권신고서) — 청약 일정이 확정되는 순간의 1차 문서라 그 종목 글이 아직 0편이다.
      //  ★자본시장법 경계: 절차 정보까지만. 투자권유가 새면 그 씨앗만 버린다(파이프 무영향).
      try {
        const ipos = await fetchDartIPOSeeds();
        for (const p of ipos.slice(0, 4)) {
          const leak = ipoAdviceLeak(`${p.keyword} ${p.title}`);
          if (leak) { console.log(`[dart] 투자권유 표현 — 스킵: ${leak}`); continue; }
          cands.push({ keyword: p.keyword, title: p.title, newsContext: p.newsContext, longtails: [], source: "dart" });
        }
        console.log(`[dart] 공모 씨앗 ${ipos.length}건`);
      } catch (e) { console.log(`[dart] 실패: ${e instanceof Error ? e.message : "unknown"}`); }
    }

    if (cands.length > 0) {
      // ★마감이 지난 건 재보지도 않는다 — 죽은 글감에 측정 비용을 쓰지 않는다.
      const alive = cands.filter((c) => preemptWindow({ monthly: 0, actionStart: c.actionStart, actionEnd: c.actionEnd }) !== "passed");
      // ★수요는 병렬로 잰다 — 종전엔 await를 루프 안에서 순차로 돌려 후보가 많을수록 느려졌다.
      const measured = await Promise.all(alive.map(async (c) => {
        const d = await measureTopicDemand(c.keyword);
        const monthly = hasRealDemand(d) ? (d?.monthly ?? null) : null;
        const k = { monthly, actionStart: c.actionStart, actionEnd: c.actionEnd };
        return { c, score: preemptionScore(k), note: preemptionNote(k) };
      }));
      const ranked = measured.filter((m) => m.score > 0).sort((a, b) => b.score - a.score);
      for (const m of measured) {
        if (m.score <= 0) drops.push({ keyword: m.c.keyword, title: m.c.title, reason: "dead_or_niche" });
      }
      const taken = ranked.slice(0, NOTICE_CAP);
      for (const m of taken) {
        rows.push({
          category, keyword: m.c.keyword, title: m.c.title, news_context: m.c.newsContext,
          longtails: m.c.longtails, source: m.c.source, created_at: new Date().toISOString(),
          // 카드 만료 = 접수 마감(유저 확정). ★단 행동 창이 없는 소스(DART 공모주)는 마감일이 없다 —
          //  종전엔 그대로 조립해서 "undefinedT23:59:59+09:00"이 들어갔고, timestamp 파싱 실패로
          //  ★그 씨앗 하나가 배치 전체를 죽였다(강등 재시도 3번도 expires_at은 안 벗기니 전부 실패).
          //  겉으로는 '채택 로그는 찍히는데 풀은 빔' — 중복키 사고와 똑같은 얼굴이라 같이 묻혀 있었다.
          expires_at: m.c.actionEnd ? `${m.c.actionEnd}T23:59:59+09:00` : expires,
          action_start: m.c.actionStart, action_end: m.c.actionEnd,
        } as (typeof rows)[number] & { action_start: string; action_end: string });
      }
      ah.joined = taken.filter((m) => m.c.source === "applyhome").length;
      // ★선점 큐 로그 — 무엇이 왜 뽑히고 무엇이 왜 밀렸는지 남긴다(순서로 결정되던 시절엔 이게 없었다).
      console.log(`[preempt] ${category}: 후보 ${cands.length} → 생존 ${alive.length} → 자격 ${ranked.length} → 채택 ${taken.length}/${NOTICE_CAP}`);
      for (const m of taken) console.log(`  채택 ${m.score} | ${m.c.source} | ${m.c.keyword} — ${m.note}`);
      for (const m of ranked.slice(NOTICE_CAP, NOTICE_CAP + 3)) console.log(`  대기 ${m.score} | ${m.c.keyword} — ${m.note}`);
    }

    const admin = createSupabaseAdminClient();
    // ★키워드 중복 최종 제거(2026-08-02 실측 사고) — 위쪽 uniq 이후에도 선점 공고(preempt)를 rows에 더 밀어넣는다.
    //  그때 키워드가 겹치면 upsert가 "ON CONFLICT ... cannot affect row a second time"으로 통째로 실패한다.
    //  ★한 건의 중복이 배치 전체를 죽인다 — 그러니 여기서 마지막으로 한 번 더 접는다.
    const seenKw = new Set<string>();
    const uniqRows = rows.filter((r) => {
      const k = String((r as { keyword?: string }).keyword ?? "");
      if (!k || seenKw.has(k)) return false;
      seenKw.add(k); return true;
    });
    if (uniqRows.length < rows.length) console.log(`[trend-upsert] ${category}: 중복 키워드 ${rows.length - uniqRows.length}건 제거(선점 공고와 씨앗 충돌)`);

    // ★넣고 나서 지운다(순서 반전 — 2026-08-02 실측 사고의 핵심).
    //  종전엔 'delete 먼저 → upsert'였다. upsert가 실패하면 그 카테고리는 통째로 빈 채 남는다.
    //  게다가 세 번의 강등 재시도가 전부 같은 중복 오류로 실패하는데 에러를 삼켜서, 밖에서는
    //  '수확은 성공했다고 로그가 찍히는데 풀은 비어 있는' 상태로 보였다(증식 0의 진짜 원인).
    //  ★파괴는 성공 이후에만 한다. 실패하면 옛 씨앗이라도 남는 게 빈손보다 낫다.
    const upsert = async (list: unknown[]) => admin.from("trend_topics").upsert(list, { onConflict: "category,keyword" });
    let { error: upErr } = await upsert(uniqRows);
    if (upErr) { // source(0050)·action(0061) 컬럼 미적용 방어 — 순차 강등 재시도
      const noAction = uniqRows.map((r) => { const { action_start: _a, action_end: _b, ...rest } = r as Record<string, unknown>; return rest; });
      ({ error: upErr } = await upsert(noAction));
      if (upErr) {
        const bare = noAction.map((r) => { const { source: _s, ...rest } = r as Record<string, unknown>; return rest; });
        ({ error: upErr } = await upsert(bare));
      }
    }
    if (upErr) {
      // ★조용히 넘기지 않는다 — 이걸 삼켜서 원인을 찾는 데 오래 걸렸다.
      console.error(`[trend-upsert] ${category}: 저장 실패 — ${upErr.message?.slice(0, 160)} (기존 씨앗 유지)`);
      return { generated: 0, drops, applyhome: ah };
    }
    // 저장에 성공했을 때만 이번 세트에 없는 옛 행을 정리한다(뉴스 문구형 잔재 일괄 제거).
    try {
      const keep = [...seenKw];
      let del = admin.from("trend_topics").delete().eq("category", category);
      if (keep.length) del = del.not("keyword", "in", `(${keep.map((k) => `"${k.replace(/"/g, '""')}"`).join(",")})`);
      await del;
    } catch { /* 정리 실패 — 새 씨앗은 이미 들어갔으니 서빙에는 지장 없다 */ }
    // 게이트별 탈락 분포 로그 — 튜닝 기준 데이터
    const dist: Record<string, number> = {};
    for (const d of drops) dist[d.reason] = (dist[d.reason] ?? 0) + 1;
    console.log(`[trend-drops] ${category}:`, JSON.stringify(dist), JSON.stringify(drops.map((d) => `${d.reason}:${d.keyword}`)));
    // ★실제로 들어간 건수로 보고한다 — rows.length는 중복 제거 전 숫자라 로그가 풀보다 부풀었다.
    return { generated: uniqRows.length, drops, applyhome: ah };
  } catch {
    return { generated: 0, drops };
  }
}
