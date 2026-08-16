// ★공모주 수확기(OpenDART 증권신고서) — 2026-08-02, 유저 키 발급 완료로 착수.
//  왜 이게 최강 선점 소재인가: 증권신고서는 '청약 일정이 확정되는 순간 공시되는 1차 문서'다.
//  그 시점에 그 종목으로 쓴 블로그 글은 사실상 0편이다 — 우리가 먼저 쓰면 첫 문서가 된다.
//  다른 수확기(청약홈·보조금24·기업마당)와 규격을 맞춘다: 신선도 게이트, 행동 창, 원문 외 수치 금지.
//
// ★★자본시장법 경계(유저 확정 원칙 — 이 파일의 존재 이유보다 중요하다):
//  우리는 '절차 정보'까지만 쓴다. 청약 방법·일정 확인처·증거금 개념 같은 제도 설명은 정보 제공이지만,
//  '이 종목 유망하다·따상 간다·넣어라'는 투자권유다. 후자는 코드가 막는다(프롬프트는 방향, 코드는 한계선).
//  ★공모가·경쟁률·수요예측 결과는 원문에 있어도 우리가 먼저 말하지 않는다 — 판단을 부추기는 숫자다.

export interface DartIPOSeed {
  keyword: string;
  title: string;
  corpName: string;
  /** 공모가·일정이 확정된 공시인가(=청약 임박). 선점 가치가 가장 높은 순간. */
  priced: boolean;
  rceptNo: string;
  rceptDt: string;   // YYYY-MM-DD (공시 접수일)
  newsContext: string;
}

const LIST_EP = "https://opendart.fss.or.kr/api/list.json";

/** 증권신고서(지분증권) = 공모 절차의 출발 문서. 정정신고서는 일정이 바뀐 것이라 함께 본다. */
const IPO_REPORT_RE = /증권신고서\s*\(\s*지분증권\s*\)|투자설명서/;

// ★스팩(기업인수목적회사) 제외 — 2026-07-31 실호출에서 '엔에이치기업인수목적34호'가 씨앗으로 올라왔다.
//  스팩은 사업이 없는 껍데기 법인이라 '이 회사가 뭐 하는 곳인지' 쓸 내용이 없고, 검색 수요도 사실상 없다.
//  숫자만 붙은 이름이 매달 쏟아져 씨앗 자리를 잠식한다 — 검색자=독자 정합 원칙에서 탈락.
const SPAC_RE = /기업인수목적|스팩|제\s*\d+\s*호\s*(?:기업인수|스팩)/;

/** 원문에 있어도 우리가 먼저 꺼내지 않는 숫자 — 판단을 부추긴다. */
const JUDGMENT_NUMBERS_RE = /공모가|희망\s*가격|밴드|경쟁률|수요\s*예측|따상|의무\s*보유\s*확약/;

function ymd(d: Date): string {
  const k = new Date(d.getTime() + 9 * 3600_000);
  return k.toISOString().slice(0, 10).replace(/-/g, "");
}

function dash(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** 회사명에서 법인격 접미어를 떼 검색어 형태로. '주식회사 오로라테크' → '오로라테크' */
export function shortCorpName(raw: string): string {
  // ★교대(|) 순서가 곧 우선순위다 — '주'를 먼저 두면 '주식회사'에서 '주'만 떼어 '식회사'가 남는다(실측).
  //  긴 표기부터 시도한다.
  return String(raw || "")
    .replace(/^(?:주식회사|㈜|\(주\))\s*/, "")
    .replace(/\s*(?:주식회사|㈜|\(주\))$/, "")
    .trim()
    .slice(0, 20);
}

/**
 * 최근 공시된 공모(증권신고서) 건을 씨앗으로. 실패 시 throw — 호출측이 로그만 남기고 넘어간다.
 * ★신규 상장 후보만 본다(stock_code 없음 = 아직 상장 안 된 회사). 이미 상장된 회사의 유상증자는
 *  '공모주 청약'을 검색하는 사람이 찾는 대상이 아니다 — 검색자=독자 정합 원칙.
 */
export async function fetchDartIPOSeeds(opts?: { days?: number; now?: Date }): Promise<DartIPOSeed[]> {
  const key = process.env.DART_API_KEY;
  if (!key) throw new Error("DART_API_KEY_MISSING");
  const now = opts?.now ?? new Date();
  const days = opts?.days ?? 7; // 공시 후 청약까지 통상 2~4주 — 일주일 창이면 선점 여유가 있다
  const bgn = ymd(new Date(now.getTime() - days * 86400_000));
  const end = ymd(now);

  const url = `${LIST_EP}?crtfc_key=${encodeURIComponent(key)}&bgn_de=${bgn}&end_de=${end}&pblntf_detail_ty=C001&page_count=100`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`DART_HTTP_${res.status}`);
  const j = (await res.json()) as {
    status?: string; message?: string;
    list?: { corp_name?: string; stock_code?: string; report_nm?: string; rcept_no?: string; rcept_dt?: string; flr_nm?: string }[];
  };
  // ★DART는 HTTP 200에 status로 실패를 싣는다(013=데이터 없음, 020=한도초과, 100=키오류).
  //  '데이터 없음'은 정상이므로 빈 배열, 나머지는 조용히 넘기면 안 되는 사고라 throw.
  if (j.status && j.status !== "000") {
    if (j.status === "013") return [];
    throw new Error(`DART_${j.status}_${(j.message ?? "").slice(0, 40)}`);
  }

  const out: DartIPOSeed[] = [];
  const seen = new Set<string>();
  for (const it of j.list ?? []) {
    const reportNm = (it.report_nm ?? "").trim();
    const corpRaw = (it.corp_name ?? "").trim();
    const rceptNo = (it.rcept_no ?? "").trim();
    const rceptDt = (it.rcept_dt ?? "").trim();
    if (!IPO_REPORT_RE.test(reportNm) || !corpRaw || !rceptNo || rceptDt.length !== 8) continue;
    // 이미 상장된 회사의 유상증자·주주배정은 제외 — '공모주 청약' 검색자가 찾는 대상이 아니다
    if ((it.stock_code ?? "").trim()) continue;
    if (SPAC_RE.test(corpRaw)) continue; // 스팩 — 쓸 내용도 검색 수요도 없다
    const corp = shortCorpName(corpRaw);
    if (!corp || seen.has(corp)) continue; // 같은 회사의 정정신고서 중복 제거(최신 건이 먼저 온다)
    seen.add(corp);

    const isAmend = /정정/.test(reportNm);
    // ★[발행조건확정]은 공모가·청약일이 확정된 시점이다 — 선점 가치가 가장 높다(실호출에서 확인).
    const priced = /발행조건확정/.test(reportNm);
    const docUrl = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
    out.push({
      keyword: `${corp} 공모주 청약`.slice(0, 40),
      // ★제목은 사실만 — '유망·기대'류를 넣는 순간 투자권유가 된다
      title: isAmend ? `${corp} 공모 일정 정정 공시, 달라진 점` : `${corp} 공모주 청약, 일정과 방법 정리`,
      corpName: corp,
      priced,
      rceptNo,
      rceptDt: dash(rceptDt),
      newsContext: [
        `- [DART 공시 실데이터] ${corpRaw} | 보고서 ${reportNm} | 접수일 ${dash(rceptDt)} | 제출인 ${(it.flr_nm ?? "").trim() || "-"} | 원문 ${docUrl}`,
        priced ? `- 이 공시는 발행조건이 확정된 건이라 청약일이 임박했다. 독자가 지금 확인해야 할 절차를 앞쪽에 배치한다.` : "",
        `※ 위 항목 외의 수치를 지어내지 마라. 청약일·공모 규모·주관사 같은 구체 정보는 위 원문에 있으니 "DART 공시 원문에서 확인" 프레임으로 안내한다.`,
        `※ ★이 글은 절차 안내다 — 청약 방법, 증거금·배정 방식 같은 제도 설명, 일정 확인처까지만 쓴다.`,
        `※ ★투자 판단을 부추기는 서술 금지: 유망·기대주·따상·수익률·"넣어야 한다"·목표가. 공모가·희망밴드·경쟁률도 먼저 꺼내지 않는다.`,
        `※ 이 글은 특정 종목의 매수 권유가 아니라 일반적인 제도·절차 정보 제공이라는 점이 자연스럽게 드러나야 한다.`,
      ].filter(Boolean).join("\n"),
    });
  }
  // 최신 공시 우선 — 선점은 '먼저 나온 문서'가 이긴다
  // 발행조건 확정 건 먼저(청약 임박) → 그다음 최신 공시 순
  out.sort((a, b) => Number(b.priced) - Number(a.priced) || b.rceptDt.localeCompare(a.rceptDt) || a.corpName.localeCompare(b.corpName));
  return out.slice(0, 5);
}

/** 공모주 글에 투자권유·판단 유도 표현이 섞였는가. 걸리면 그 카드를 버린다(하드 게이트). */
export function ipoAdviceLeak(text: string): string | null {
  const t = String(text || "");
  const push = /(?:청약|매수|사)\s*(?:하세요|하라|해야|추천)|따상|유망(?:주|해|합니다)|기대주|대박|수익률\s*(?:보장|확정)|무조건\s*(?:넣|사)|목표\s*주가|놓치면\s*후회/.exec(t);
  if (push) return push[0];
  const num = JUDGMENT_NUMBERS_RE.exec(t);
  return num ? num[0] : null;
}
