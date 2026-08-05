// ★선점형 글감 판별(2026-08-05 유저 제기).
//
//  유저 원문: "검색량은 많은데 문서수가 적은 부류도 글감으로 만들어야 하고,
//   진짜 따끈따끈 핫이슈 키워드 — 예를 들어 지원금, 동탄 로또청약 줍줍 이런 것들은
//   선점하려면 검색량도 없어야 하고 문서수도 적은 부류여야 해서..."
//
//  ★이 말이 정확하다. 그리고 이게 내가 방금 만든 모순을 드러낸다:
//   수요 하한(월 100회)을 걸었더니, 오늘 막 터진 '동탄 줍줍'은 지난 30일 평균이 0이라 잘린다.
//   네이버 광고 API의 검색량은 '지난 30일'이다 — 오늘 터진 일을 원리상 담지 못한다.
//   즉 검색량 0에는 두 가지가 섞여 있다: "영영 아무도 안 찾음"과 "아직 안 왔음".
//
//  ★그래서 두 종족을 갈라 다르게 검문한다:
//   ① 수요형(꾸준) — 검색량이 증거다. 월 100회 미만이면 쓸 이유가 없다.
//   ② 선점형(지금 뜨는) — 검색량이 0인 게 정상이다. 대신 다른 증거 세 가지를 요구한다:
//      · 신호가 방금 왔는가(뉴스 1시간·커뮤니티 4시간·오늘 공시·오늘 보도자료·미래 확정일정)
//      · 사람이 검색창에 칠 만한 '구체적인 말'인가 — 고유명사(지역·브랜드·기관)나 행동어가 있는가
//      · 그 자리가 아직 비었는가(문서수)
//
//  ★실측 대조(2026-08-05, 유저 화면에서 실제로 나온 것):
//     "부동산 공급"           월 0회 · 문서 7,149편 → 고유명사 없음·행동어 없음 → 탈락(정답)
//     "동탄 로또청약 줍줍"     월 0회 가정        → 지역명 + 줍줍(행동)      → 통과(정답)
//     "케이뱅크 황금캡슐"      월 0회 가정        → 브랜드 + 이벤트          → 통과(정답)
//   일반명사 두 개를 붙인 기사 말투는 검색어가 아니다. 그게 이 게이트가 잡는 것이다.

/** 검색량이 없어도 통과시킬 수 있는 신호원 — '방금 왔다'가 증명되는 원천만 */
const FRESH_SOURCES = new Set(["rising", "community", "gov", "dart", "calendar", "news", "applyhome", "gov24", "bizinfo"]);

// 지역명 — 사람이 지역을 붙여 검색하면 그건 구체적인 의도다("동탄 줍줍", "창릉 청약")
const REGION_RE = /(동탄|창릉|왕숙|교산|과천|위례|검단|송도|청라|영종|마곡|고덕|미사|다산|별내|지축|삼송|운정|한강신도시|세종|평택|화성|용인|수원|성남|하남|남양주|김포|파주|의정부|광명|안양|부천|인천|서울|부산|대구|대전|광주|울산|제주|강남|송파|서초|마포|성동|노원)/;

// 브랜드·기관 — 고유명사가 있으면 그 말은 이미 특정된 대상이다
const PROPER_RE = /(카카오|토스|네이버|케이뱅크|카뱅|국민|신한|우리|하나|농협|기업은행|새마을금고|삼성|현대|LG|SK|쿠팡|배민|당근|페이코|OK캐시백|현대카드|롯데카드|BC카드|삼성카드|신세계|이마트|올리브영|스타벅스|LH|SH|GH|국세청|건보공단|국민연금|근로복지공단|공제회|주택도시기금|HUG|HF)/;

// 행동·돈 신호 — "지금 뭘 해야 하나"가 걸린 말은 터지면 반드시 검색된다
const ACTION_RE = /(줍줍|무순위|잔여세대|취소분|특별공급|사전청약|본청약|청약|분양|당첨|추첨|접수|신청|모집|공고|마감|지급|지원금|장려금|환급|보조금|바우처|상품권|캐시백|포인트|이벤트|당첨자|발표|납부|신고|공제|감면|인상|인하|개편|시행|폐지|증자|분할|배당|권리락|상장)/;

// 숫자·차수·연도 — "3차", "2026년", "1억"처럼 특정된 말
const SPECIFIC_RE = /(\d{4}년|\d+차|\d+회차|\d+월|\d+억|\d+만원|\d+%)/;

export interface PreemptVerdict {
  /** 검색량 하한을 면제해도 되는가 */
  eligible: boolean;
  /** 무엇을 보고 그렇게 판단했는가 — 화면·로그에 그대로 쓴다(근거 없는 통과 금지) */
  reasons: string[];
  /** 왜 떨어졌는가 */
  blockedBy: string | null;
}

/**
 * 검색량이 아직 0인 키워드를 '선점 기회'로 볼 것인가, '수요 없음'으로 볼 것인가.
 *
 * @param keyword  카드 키워드
 * @param source   씨앗 원천(seedSource)
 * @param blogTotal 네이버 블로그 문서 수(못 쟀으면 null)
 * @param maxDocs  이 문서 수를 넘으면 선점이 아니다 — 이미 남들이 썼다는 뜻
 */
export function preemptVerdict(
  keyword: string,
  source: string | null | undefined,
  blogTotal: number | null | undefined,
  maxDocs = 3000,
): PreemptVerdict {
  const kw = String(keyword || "").trim();
  const reasons: string[] = [];

  // ① 신호가 방금 왔는가 — 이게 없으면 '아직 안 왔음'이라고 주장할 근거가 없다
  if (!FRESH_SOURCES.has(String(source || ""))) {
    return { eligible: false, reasons, blockedBy: "신선한 신호원이 아님" };
  }

  // ② 그 자리가 비었는가 — 문서가 쌓였으면 선점이 아니라 뒷북이다
  //  ★못 쟀으면(null) 통과시키지 않는다. 모르는 걸 근거로 예외를 주면 예외가 기본이 된다.
  if (typeof blogTotal !== "number") return { eligible: false, reasons, blockedBy: "문서 수를 못 쟀음" };
  if (blogTotal > maxDocs) return { eligible: false, reasons, blockedBy: `문서 ${blogTotal.toLocaleString("ko-KR")}편 — 이미 쌓인 자리` };
  reasons.push(`문서 ${blogTotal.toLocaleString("ko-KR")}편`);

  // ③ 사람이 칠 만한 '구체적인 말'인가 — 일반명사 조합(기사 말투)을 여기서 거른다
  const hits: string[] = [];
  if (REGION_RE.test(kw)) hits.push("지역명");
  if (PROPER_RE.test(kw)) hits.push("브랜드·기관명");
  if (SPECIFIC_RE.test(kw)) hits.push("숫자·차수");
  const hasAction = ACTION_RE.test(kw);
  if (hasAction) hits.push("행동·돈 신호");

  // ★고유성(지역/브랜드/숫자) 하나 + 행동 신호가 함께 있어야 한다.
  //  행동어만 있으면 "지원금 신청"처럼 뭉뚱그린 말이 되고, 고유명사만 있으면 "동탄 부동산"처럼 막연하다.
  //  둘이 만나야 "동탄 줍줍"이 된다 — 사람이 실제로 그렇게 친다.
  const hasProper = hits.some((h) => h !== "행동·돈 신호");
  if (!hasProper) return { eligible: false, reasons, blockedBy: "고유명사·숫자가 없음(기사 말투일 가능성)" };
  if (!hasAction) return { eligible: false, reasons, blockedBy: "지금 뭘 해야 하는지가 없음" };

  reasons.push(...hits);
  return { eligible: true, reasons, blockedBy: null };
}

/** 화면에 쓸 한 줄 — 왜 검색량 0인데도 골랐는지 사실대로 말한다 */
export function preemptWhy(v: PreemptVerdict): string | null {
  if (!v.eligible) return null;
  return `아직 검색량으로 안 잡히는 초기 이슈예요(${v.reasons.join(" · ")}) — 지금이 선점 구간이에요`;
}
