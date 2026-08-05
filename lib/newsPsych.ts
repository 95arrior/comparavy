// ★아침 뉴스 → 검색 심리 → 자동완성 확정(2026-08-05 유저 지시).
//
//  유저 원문: "오전 9시 10시에 모든 뉴스 크롤링해서 이슈 될 만한, 검색하는 사람의 심리를 파악해서
//   '이건 검색하겠는데?' 라는 거 있잖아요 그런 소식들을 가져오는 것도 해야 해요.
//   왜냐면 뉴스 보고 검색하는 사람이 많으니까."
//
//  ★기존 뉴스 경로와 무엇이 다른가:
//   종전은 고정 씨앗(경제·재테크·금리…)으로 기사를 긁어 제목에서 명사를 뽑았다.
//   그래서 "부동산 공급"처럼 기사 말투가 그대로 키워드가 됐다 — 아무도 그렇게 검색하지 않는다.
//   ★여기서는 두 단계를 더 거친다:
//    ① 이 기사를 본 사람이 '검색창을 열까'를 먼저 판단한다(대부분은 안 연다)
//    ② 연다면 뭘 칠지를, 우리가 상상하지 않고 네이버 자동완성에게 물어본다
//
//  ★합성 금지 원칙(유저 확정)과 어긋나지 않는 이유:
//   최종 키워드를 우리가 만들지 않는다. 기사에서 뽑는 건 '고유명사·제도명'(원어)뿐이고,
//   그 뒤에 붙는 말은 자동완성이 준다 — 즉 사람들이 실제로 치고 있다고 네이버가 증명한 말이다.
//   자동완성에 없으면 버린다. 상상으로 만든 조합은 한 개도 안 나간다.
import Anthropic from "@anthropic-ai/sdk";
import { fetchNaverAutocomplete } from "./naverAutocomplete";
import { logUsage } from "./usageLog";

const NEWS_EP = "https://openapi.naver.com/v1/search/news.json";

// 의도 문장에서 어미·조사를 털어 제안과 맞대기 위한 것
const INTENT_JOSA = /(이|가|은|는|을|를|의|에|로|으로|와|과|도|만|인지|한지|는지|까지|부터)$/;

// ★넓게 쓸어담는다(유저: "모든 뉴스"). 경제면만 보면 생활·정책에서 터지는 걸 통째로 놓친다.
//  실제로 6/27 상위 유입은 온누리상품권·냉방지원금이었다 — 둘 다 경제면 머리기사가 아니다.
const SWEEP_QUERIES = [
  "지원금", "보조금", "환급", "상품권", "바우처", "수당",
  "세금", "공제", "감면", "납부", "신고",
  "금리", "대출", "예금", "적금", "연금",
  "청약", "분양", "전세", "월세", "부동산 대책",
  "건강보험", "국민연금", "실업급여", "육아휴직", "최저임금",
  "전기요금", "가스요금", "교통비", "통신비",
  "시행", "개편", "인상", "인하", "확대",
];

export interface PsychSeed {
  /** ★자동완성이 준 말 — 우리가 만든 게 아니다 */
  keyword: string;
  /** 기사에서 뽑은 고유명사·제도명(원어) */
  anchor: string;
  /** 왜 검색하는가 */
  intent: string;
  headline: string;
  press: string;
  minutesAgo: number;
  newsContext: string;
}

interface Head { title: string; desc: string; press: string; minutesAgo: number }

const strip = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").trim();

/** 최근 windowMin 분 안의 기사만. ★창 밖은 안 본다 — 뒷북을 구조로 막는다. */
export async function sweepMorningNews(windowMin = 120, perQuery = 5): Promise<Head[]> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID, secret = process.env.NAVER_DATALAB_SECRET;
  if (!id || !secret) throw new Error("NAVER_NEWS_ENV_MISSING");
  const now = Date.now();
  const out: Head[] = [];
  const seen = new Set<string>();

  for (const q of SWEEP_QUERIES) {
    try {
      const res = await fetch(`${NEWS_EP}?query=${encodeURIComponent(q)}&display=${perQuery}&sort=date`,
        { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const j = (await res.json()) as { items?: { title?: string; description?: string; originallink?: string; link?: string; pubDate?: string }[] };
      for (const it of j.items ?? []) {
        const t = Date.parse(it.pubDate ?? "");
        if (!Number.isFinite(t)) continue;
        const minutesAgo = Math.round((now - t) / 60_000);
        if (minutesAgo < 0 || minutesAgo > windowMin) continue;
        const title = strip(it.title ?? "");
        const nk = title.replace(/\s+/g, "").slice(0, 24);
        if (!title || seen.has(nk)) continue;
        seen.add(nk);
        out.push({
          title, desc: strip(it.description ?? "").slice(0, 140), minutesAgo,
          press: (() => { try { return new URL(it.originallink || it.link || "").hostname.replace(/^www\./, ""); } catch { return ""; } })(),
        });
      }
    } catch { /* 다음 질의로 */ }
  }
  return out.sort((a, b) => a.minutesAgo - b.minutesAgo);
}

const SYSTEM = [
  "너는 한국 네이버 블로그 글감을 고르는 사람이다. 지금 하는 일은 단 하나다:",
  "기사 제목을 보고 '이 뉴스를 본 사람이 검색창을 열까'를 판정하는 것.",
  "",
  "★대부분의 기사는 아니다. 읽고 지나간다. 검색창을 여는 건 '내 일이 되는 순간'뿐이다:",
  " - 내가 대상인가 (자격·조건)",
  " - 얼마인가 (금액·비율)",
  " - 언제까지인가 (마감·시행일)",
  " - 어떻게 하나 (신청 방법·서류)",
  " - 나는 어떻게 되나 (내 대출이자·내 보험료·내 세금)",
  "",
  "★검색창을 열지 않는 것 — 이건 전부 버려라:",
  " - 남의 일: 기업 실적·주가 전망·해외 정치·인사·조직 개편·업무협약·간담회",
  " - 이미 끝난 일: 선정 완료·수상·행사 성료",
  " - 감상과 논평: 전망·분석·우려·기대",
  " - 특정인 사건사고, 정치 공방",
  "",
  "★anchor는 기사에 '실제로 적힌' 고유명사나 제도명만 써라(사람들이 검색창에 처음 치는 말).",
  " 예: '온누리상품권', '근로장려금', '케이뱅크', '동탄2', '건강보험료'.",
  " ★일반명사 두 개를 붙이지 마라 — '부동산 공급', '금융 지원' 같은 말은 아무도 검색하지 않는다.",
  " ★기사에 없는 말을 만들어내지 마라.",
  "",
  'JSON만 출력: {"picks":[{"headline":"기사 제목 앞 20자","anchor":"고유명사/제도명","intent":"사람들이 뭘 궁금해하는지 한 줄","why":"왜 검색창을 열지 한 줄"}]}',
  "★확신이 없으면 넣지 마라. 빈 배열이 잘못된 글감보다 낫다.",
  "★값 안에 큰따옴표를 쓰지 마라(기사 제목의 따옴표는 빼고 적는다). JSON이 깨진다.",
].join("\n");

/** 기사 묶음에서 '검색될 것'만 골라낸다. 실패는 throw(조용한 0 금지). */
export async function judgeSearchIntent(heads: Head[], max = 8): Promise<{ headline: string; anchor: string; intent: string; why: string }[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_KEY_MISSING");
  if (!heads.length) return [];
  const client = new Anthropic({ apiKey });
  const list = heads.slice(0, 60).map((h, i) => `${i + 1}. ${h.title} — ${h.desc.slice(0, 70)}`).join("\n");
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1600,
    system: SYSTEM,
    messages: [{ role: "user", content: `오늘 아침 기사다. 이 중 '검색창을 열게 만드는 것'만 최대 ${max}개 골라라.\n\n${list}` }],
  });
  void logUsage({ model: "claude-haiku-4-5", kind: "news_psych", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
  const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
  const m = /\{[\s\S]*\}/.exec(raw);
  if (!m) return [];
  // ★기사 제목에는 따옴표가 흔하다 — 모델이 그걸 값 안에 그대로 넣으면 JSON이 깨진다(실호출에서 발생).
  //  여기서 던지면 원천이 통째로 죽는다. 깨진 판을 통째로 버리지 말고, 살릴 수 있는 항목만 건진다.
  let parsed: { picks?: { headline?: string; anchor?: string; intent?: string; why?: string }[] };
  try {
    parsed = JSON.parse(m[0]) as typeof parsed;
  } catch {
    const picks: NonNullable<typeof parsed.picks> = [];
    for (const b of m[0].split(/\}\s*,\s*\{/)) {
      const g = (k: string) => new RegExp(`"${k}"\\s*:\\s*"([^"]*)"`).exec(b)?.[1];
      const anchor = g("anchor");
      if (anchor) picks.push({ anchor, headline: g("headline"), intent: g("intent"), why: g("why") });
    }
    console.warn(`[news-psych] JSON 깨짐 — 항목 단위로 ${picks.length}건 복구`);
    parsed = { picks };
  }
  return (parsed.picks ?? [])
    .map((p) => ({
      headline: String(p.headline ?? "").trim(),
      anchor: String(p.anchor ?? "").trim().slice(0, 24),
      intent: String(p.intent ?? "").trim().slice(0, 60),
      why: String(p.why ?? "").trim().slice(0, 60),
    }))
    .filter((p) => p.anchor.length >= 2)
    .slice(0, max);
}

/**
 * 전체 흐름: 쓸어담기 → 검색 심리 판정 → ★자동완성으로 실재 증명.
 * ★자동완성에 없는 조합은 버린다 — 상상으로 만든 키워드를 한 개도 내보내지 않기 위해서다.
 */
export async function harvestNewsPsych(opts?: { windowMin?: number; limit?: number }): Promise<PsychSeed[]> {
  const limit = opts?.limit ?? 5;
  const heads = await sweepMorningNews(opts?.windowMin ?? 120);
  if (!heads.length) return [];
  const picks = await judgeSearchIntent(heads, limit * 2);

  const out: PsychSeed[] = [];
  const seen = new Set<string>();
  for (const p of picks) {
    if (out.length >= limit) break;
    let keyword = "";
    try {
      const sug = await fetchNaverAutocomplete(p.anchor);
      const bare = p.anchor.replace(/\s+/g, "");
      let cands = sug.filter((x) => x.replace(/\s+/g, "").startsWith(bare) && x.length > p.anchor.length);
      // ★정의형은 뺀다: 'AI 요약으로 끝나는 유형'이라 클릭이 안 남는다(우리 원칙).
      cands = cands.filter((x) => !/(란|이란|뜻|무엇|의미)\s*$/.test(x));
      // ★기사가 만든 궁금증과 맞는 제안을 고른다(2026-08-05 실호출에서 잡은 결함).
      //  종전엔 '가장 짧은 것'을 골랐는데, IRP '이전 이벤트' 기사에서 "IRP 계좌 해지"가 나왔다 —
      //  정반대 의도다. 짧다고 이 기사를 본 사람이 칠 말은 아니다.
      const intentToks = p.intent.split(/[\s,·]+/).map((w) => w.replace(INTENT_JOSA, "")).filter((w) => [...w].length >= 2);
      const score = (x: string) => intentToks.reduce((n, t) => n + (x.includes(t) ? 1 : 0), 0);
      keyword = cands.sort((a, b) => score(b) - score(a) || a.length - b.length)[0] ?? "";
    } catch { /* 자동완성 실패 — 버린다 */ }
    if (!keyword) continue;                       // ★증명 못 하면 안 내보낸다
    const nk = keyword.replace(/\s+/g, "");
    if (seen.has(nk)) continue;
    seen.add(nk);
    const head = heads.find((h) => h.title.startsWith(p.headline.slice(0, 12))) ?? heads[0]!;
    out.push({
      keyword: keyword.slice(0, 40), anchor: p.anchor, intent: p.intent,
      headline: head.title, press: head.press, minutesAgo: head.minutesAgo,
      newsContext: psychBrief({ keyword, anchor: p.anchor, intent: p.intent, why: p.why, headline: head.title, press: head.press, minutesAgo: head.minutesAgo }),
    });
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

/** 브리프 — 이 글이 왜 지금 필요한지, 무엇에 답해야 하는지 */
export function psychBrief(a: { keyword: string; anchor: string; intent: string; why: string; headline: string; press: string; minutesAgo: number }): string {
  return [
    `- [아침 뉴스 실데이터] ${a.press || "언론"} | ${a.headline.slice(0, 80)} | ${a.minutesAgo}분 전`,
    `★이 글감은 '기사를 본 사람이 곧 검색할 말'이다. 키워드 "${a.keyword}"는 네이버 자동완성에서 확인된 실제 검색어다.`,
    `★독자가 궁금한 것: ${a.intent || "내게 해당되는지, 얼마인지, 언제까지인지"}`,
    `  ${a.why ? `(검색하는 이유: ${a.why})` : ""}`,
    `★첫 두 문장 안에 '내가 대상인가'에 답해라 — 기사 요약을 반복하면 바로 나간다. 기사는 이미 읽고 왔다.`,
    `★기사에 없는 금액·기간·조건을 지어내지 마라. 확인 못 한 건 "공식 공고에서 확인" 프레임으로 안내한다.`,
    `★기사 문장을 그대로 베끼지 마라 — 뉴스 말투는 검색해서 들어온 사람에게 안 읽힌다.`,
    `★투자 판단을 부추기는 서술 금지: 유망·수혜·지금 사야·수익률 전망.`,
  ].filter(Boolean).join("\n");
}
