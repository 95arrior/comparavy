// ★기업 액션 공시 → 씨앗 + 후속 창 예약(2026-08-05, 설계 3단계).
//
//  근거(8/4 전수 조사): `알테오젠 무상증자`가 8월 4일 인기유입검색어에 new로 진입했다.
//   7월 16일  이사회 무상증자 결정 → DART 공시
//   8월 4일   코스닥시장본부 권리락 공시 → 검색 폭발
//   8월 5일   권리락 실시 / 8월 6일 신주배정기준일 / 8월 26일 신주 상장
//  ★즉 8/4에 터진 검색어의 신호탄은 19일 전 공시였다. 공시를 보면 미리 알 수 있었다.
//
//  ★그리고 무상증자는 한 번 터지고 끝나지 않는다 — 권리락·기준일·상장일마다 다시 검색된다.
//   그래서 공시를 잡으면 '그날 씨앗' 하나가 아니라 '후속 창'까지 예약해야 한다.
//
//  ★정확한 후속 날짜는 공시 본문에 있다. 목록 API로는 못 읽는다 —
//   그래서 창은 통상 간격(공시 후 2~5주)으로 잡고, 본문 지시에 '원문에서 확인' 의무를 싣는다.
//   추정 날짜를 단정하는 것이 제일 위험하다(어제 '7월 공고 아니냐'에서 배운 그것).
import { shortCorpName } from "./dartIPO";

const LIST_EP = "https://opendart.fss.or.kr/api/list.json";

// 검색 수요가 실제로 있는 기업 액션만. '결정' 공시가 1차 폭발 시점이다.
const ACTION_RE = /(무상증자\s*결정|유상증자\s*결정|주식분할\s*결정|주식병합\s*결정|주식배당\s*결정|자기주식\s*취득\s*결정|현물배당\s*결정)/;
// 스팩·리츠는 개인 검색 수요가 거의 없다
const SKIP_RE = /(스팩|기업인수목적|리츠|위탁관리부동산투자)/;

export interface CorpActionSeed {
  keyword: string;      // ★원어 — "알테오젠 무상증자"처럼 사람이 실제로 치는 말
  title: string;
  corpName: string;
  action: string;       // 무상증자 / 유상증자 …
  rceptDt: string;      // YYYY-MM-DD 접수일
  docUrl: string;
  newsContext: string;
  /** 후속 창(권리락·기준일) 예상 시작·끝 — 추정이므로 단정 금지 */
  followFrom: string;
  followTo: string;
}

const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const dash = (s8: string) => `${s8.slice(0, 4)}-${s8.slice(4, 6)}-${s8.slice(6, 8)}`;
const addDays = (ymdDash: string, n: number) => new Date(Date.parse(`${ymdDash}T00:00:00+09:00`) + n * 86400_000).toISOString().slice(0, 10);

/**
 * 최근 N일 기업 액션 공시. 실패는 throw(조용한 0 금지 — 원천이 죽은 걸 알아야 한다).
 * ★pblntf_ty=I(거래소 수시공시)에서 잡는다 — 무상증자 결정은 여기로 온다.
 */
export async function fetchCorpActionSeeds(opts?: { days?: number; now?: Date }): Promise<CorpActionSeed[]> {
  const key = process.env.DART_API_KEY;
  if (!key) throw new Error("DART_API_KEY_MISSING");
  const now = opts?.now ?? new Date();
  const days = opts?.days ?? 5; // 공시 직후가 1차 폭발 — 창을 넓게 잡으면 뒷북이 섞인다
  const bgn = ymd(new Date(now.getTime() - days * 86400_000));
  const end = ymd(now);

  const url = `${LIST_EP}?crtfc_key=${encodeURIComponent(key)}&bgn_de=${bgn}&end_de=${end}&pblntf_ty=I&page_count=100`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`DART_HTTP_${res.status}`);
  const j = (await res.json()) as {
    status?: string; message?: string;
    list?: { corp_name?: string; stock_code?: string; report_nm?: string; rcept_no?: string; rcept_dt?: string }[];
  };
  if (j.status && j.status !== "000") {
    if (j.status === "013") return []; // 데이터 없음 — 정상
    throw new Error(`DART_${j.status}_${(j.message ?? "").slice(0, 40)}`);
  }

  const out: CorpActionSeed[] = [];
  const seen = new Set<string>();
  for (const it of j.list ?? []) {
    const reportNm = (it.report_nm ?? "").trim();
    const corpRaw = (it.corp_name ?? "").trim();
    const rceptNo = (it.rcept_no ?? "").trim();
    const rceptDt = (it.rcept_dt ?? "").trim();
    const m = ACTION_RE.exec(reportNm);
    if (!m || !corpRaw || !rceptNo || rceptDt.length !== 8) continue;
    if (SKIP_RE.test(corpRaw)) continue;
    if (!(it.stock_code ?? "").trim()) continue; // 상장사만 — 비상장은 검색 수요가 없다
    const corp = shortCorpName(corpRaw);
    const action = m[0].replace(/\s*결정$/, "").trim();
    const kw = `${corp} ${action}`.slice(0, 40);
    if (!corp || seen.has(kw)) continue;
    seen.add(kw);

    const dt = dash(rceptDt);
    const docUrl = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
    out.push({
      keyword: kw,                       // ★원어 그대로(합성 금지)
      title: `${kw}, 일정과 내 주식에 생기는 일`,
      corpName: corp, action, rceptDt: dt, docUrl,
      followFrom: addDays(dt, 14),       // 권리락·기준일은 통상 공시 후 2~5주
      followTo: addDays(dt, 35),
      newsContext: [
        `- [DART 공시 실데이터] ${corpRaw} | ${reportNm} | 접수일 ${dt} | 원문 ${docUrl}`,
        `★이 글의 임무: ${action}이 '내 주식 수와 평가금액에 무슨 일을 하는지'를 제도로 설명하는 것.`,
        `★핵심 일정(권리락일·신주배정기준일·신주 상장일)은 공시 원문에 있다 — 원문에서 확인해 쓰고,`,
        `  확인 못 한 날짜는 절대 지어내지 마라. 모르면 "공시 원문에서 확인" 프레임으로 안내한다.`,
        `★투자 판단을 부추기는 서술 금지: 유망·수혜·목표가·"지금 사야"·수익률 전망. 이 글은 제도 설명이다.`,
        `★독자 질문에 답한다: 권리락이 뭔가 / 내 주식 수는 언제 늘어나나 / 주가가 왜 떨어져 보이나 / 세금은 어떻게 되나.`,
      ].join("\n"),
    });
  }
  return out.slice(0, 6); // 하루 상한 — 공시가 몰리는 날 보드를 통째로 먹지 않게
}
