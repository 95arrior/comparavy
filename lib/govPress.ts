// ★정부 보도자료 수확(2026-08-05, 설계 5단계).
//
//  왜 이걸 붙이는가(6/27·8/4 전수 조사의 결론):
//   상위 유입 검색어의 절반 이상이 '날짜가 미리 적혀 있던 것'이었다.
//   고정 캘린더(policyCalendar)는 내가 손으로 넣은 것만 있다 — 놓친 일정은 영원히 못 본다.
//   ★보도자료는 매일 '새 마감일'을 물어온다. 캘린더의 동적 확장이다.
//   실물(2026-08-05 수확): 국세청 "8.31.(월)까지 법인세 중간예납 신고·납부 하세요"
//    → 8/31 마감이 8/4에 공표됐다. T-27일 선점 창이 열린 것이고, 뉴스는 8월 말에나 쓴다.
//
//  ★부처 RSS는 전멸이다(2026-08-05 실측). 확인한 것:
//    korea.kr/rss/*.xml 404 · korea.kr/etc/rss.do → 메인 리다이렉트(서비스 폐지)
//    moef/fsc/nts/molit/mohw/moel/msit/mois 개별 RSS → 404 또는 item 0개 빈 껍데기
//   그래서 정책브리핑의 '전 부처 보도자료 목록'을 파싱한다. 한 페이지에 전 부처가 모인다.
//   ★HTML 파싱이라 구조가 바뀌면 깨진다 — 그래서 0건이면 반드시 로그를 남긴다(조용한 0 금지).
//
//  ★[설명]·[해명] 자료는 버리지 않는다: 부처가 해명한다는 건 지금 그 소문이 돌고 있다는 뜻이다.
//   (실물: 국토부 "용산어린이정원 주택공급은 확정된 바 없습니다" ← 부동산 커뮤니티가 들끓는 중)
import { fetchNaverAutocomplete } from "./naverAutocomplete";

const LIST_URL = "https://www.korea.kr/news/pressReleaseList.do";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export interface GovPressSeed {
  keyword: string;      // ★원어 — 제목에서 뽑고 자동완성으로 확정한다(합성 금지)
  title: string;
  ministry: string;
  date: string;         // YYYY-MM-DD 배포일
  docUrl: string;
  /** 제목·본문에 적힌 마감일(YYYY-MM-DD). 있으면 이게 선점 창의 끝이다 */
  deadline: string | null;
  /** 부처가 해명한 건 = 지금 소문이 도는 중이라는 신호 */
  isClarification: boolean;
  verified: boolean;    // 자동완성에 실재하는 말인가
  newsContext: string;
}

// 돈이 걸린 부처만. 국방·외교·산림 보도자료는 우리 채널 소재가 아니다.
// ★2026년 정부조직 기준(실측): '기획재정부'가 아니라 '재정경제부', '산업통상자원부'가 아니라 '산업통상부'.
const MINISTRIES = [
  "재정경제부", "기획재정부", "국세청", "관세청", "금융위원회", "금융감독원",
  "국토교통부", "보건복지부", "고용노동부", "행정안전부", "중소벤처기업부",
  "산업통상부", "산업통상자원부", "교육부", "여성가족부", "공정거래위원회",
  "국민연금공단", "근로복지공단", "통계청", "농림축산식품부",
];

// 돈·제도 신호. 이게 제목에 없으면 개인 검색 수요가 거의 없다.
const MONEY_TERMS = [
  "세금", "소득세", "법인세", "부가가치세", "종합소득세", "양도소득세", "상속세", "증여세", "취득세", "재산세", "종합부동산세",
  "연말정산", "중간예납", "환급", "공제", "감면", "세액", "세제", "과세",
  "지원금", "장려금", "수당", "급여", "바우처", "보조금", "장학금", "지원사업", "재난지원",
  "연금", "국민연금", "퇴직연금", "기초연금", "건강보험", "고용보험", "실업급여", "산재",
  "청약", "분양", "전세", "월세", "임대", "주택공급", "대출", "금리", "예금", "적금",
  "최저임금", "육아휴직", "출산", "돌봄", "일자리", "채용", "구직",
  "상품권", "온누리", "포인트", "캐시백", "소비쿠폰", "환불",
  "요금", "인상", "인하", "가격", "물가", "전기요금", "가스요금",
  "창업", "소상공인", "자영업", "폐업", "부담금", "과태료",
];

// 우리 글감이 될 수 없는 것 — 조직·인사·행사·해외
const SKIP_RE = /(인사발령|임명|위촉|간담회|업무협약|MOU|개최한다|정상회의|공동위원회|현장점검|적발|단속|처분|수거|검사 실시|기념식|공모전|시상)/;

const MONTH_D = /(\d{1,2})\s*[.월]\s*(\d{1,2})\s*[.일]?/;

/** 제목에 박힌 마감일을 뽑는다. "8.31.(월)까지" → 2026-08-31 */
export function extractDeadline(text: string, baseYear: number, baseMonth: number): string | null {
  // '까지'가 붙은 날짜만 마감으로 본다 — 그냥 날짜는 행사일이지 마감이 아니다
  const m = /(\d{1,2})\s*[.월]\s*(\d{1,2})\s*[.일]?\s*(?:\([月화수목금토일월]\)\s*)?까지/.exec(text)
    ?? /(\d{1,2})\s*월\s*말\s*까지/.exec(text);
  if (!m) return null;
  const mo = Number(m[1]);
  const d = m[2] ? Number(m[2]) : 28;
  if (!(mo >= 1 && mo <= 12) || !(d >= 1 && d <= 31)) return null;
  // 연도는 안 적힌다 — 배포월보다 이르면 내년으로 본다(12월 배포 → 1월 마감)
  const year = mo < baseMonth - 1 ? baseYear + 1 : baseYear;
  return `${year}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const JOSA_END = /(은|는|이|가|을|를|의|도|만|에|에서|으로|로|과|와|께|부터|까지|라|다|요|죠|네|음|함|들)$/;
const VERB_END = /(하세요|합니다|됩니다|한다|된다|했다|하는|되는|주는|받는|있는|없는|같은|위해|통해|따라|대한|관한)$/;
// 부사는 검색어가 아니다 — "주택공급 전혀" 같은 말을 아무도 치지 않는다
const ADVERB_RE = /^(전혀|절대|결코|아직|이미|다시|더욱|매우|크게|대폭|일부|모두|각각|역대|최대|최초|본격|적극|신속|조속)$/;

/**
 * 보도자료 제목에서 '검색어'를 뽑는다.
 * ★보도자료 제목은 검색어가 아니라 공문 말투다 — 커뮤니티에서 배운 것과 같은 문제.
 *  그래서 '돈 용어'를 닻으로 잡고 그 주변 명사만 남긴다.
 *  "8.31.(월)까지 법인세 중간예납 신고·납부 하세요" → "법인세 중간예납"
 */
export function pressKeywordOf(rawTitle: string): { keyword: string; anchor: string } | null {
  let t = String(rawTitle || "")
    .replace(/&middot;/g, "·").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/\[[^\]]{1,20}\]/g, " ")          // [보도참고] [설명] [8.5.석간]
    .replace(/\([^)]*\)/g, " ")                 // 괄호 부연
    .replace(/[「」『』"'"']/g, " ")
    .replace(/\d{1,2}\s*[.월]\s*\d{0,2}\s*[.일]?\s*까지/g, " ") // 날짜는 따로 뽑았다
    .replace(/\s{2,}/g, " ").trim();
  if (!t) return null;

  const anchor = MONEY_TERMS.find((w) => t.includes(w));
  if (!anchor) return null;

  const words = t.split(/\s+/).filter(Boolean);
  const at = words.findIndex((w) => w.includes(anchor));
  if (at < 0) return null;

  // 닻 어절부터 오른쪽으로 명사 어절만 최대 2개 — 사람은 2~3어절로 검색한다
  const clean = (w: string) => w.replace(/[,·.…]+$/g, "").replace(JOSA_END, "").trim();
  const picked: string[] = [];
  for (let i = at; i < words.length && picked.length < 2; i++) {
    const w = clean(words[i]!);
    if ([...w].length < 2) continue;
    if (VERB_END.test(w) || ADVERB_RE.test(w)) break;   // 서술어·부사가 나오면 명사구가 끝난 것
    picked.push(w);                                      // ★닻도 조사를 턴다("주택공급은" → "주택공급")
  }
  // 뒤가 비면 앞에서 명사 어절을 찾아 붙인다("주택공급" → "용산어린이정원 주택공급")
  // ★한 칸만 보면 안 된다 — 바로 앞이 '내'처럼 짧은 말이면 그 앞에 진짜 주어가 있다
  if (picked.length === 1) {
    for (let i = at - 1; i >= 0 && i >= at - 3; i--) {
      const prev = clean(words[i]!);
      if ([...prev].length >= 2 && !VERB_END.test(prev) && !ADVERB_RE.test(prev)) { picked.unshift(prev); break; }
    }
  }
  const keyword = picked.join(" ").slice(0, 40);
  if ([...keyword].length < 3) return null;
  return { keyword, anchor };
}

interface RawItem { newsId: string; title: string; date: string; ministry: string }

function parseList(html: string): RawItem[] {
  const h = html.replace(/\s+/g, " ");
  const out: RawItem[] = [];
  for (const b of h.split(/<a href="\/briefing\/pressReleaseView\.do\?newsId=/).slice(1)) {
    const newsId = /^(\d+)/.exec(b)?.[1] ?? "";
    const title = /<strong>(.*?)<\/strong>/.exec(b)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
    const s = /class="source">\s*<span>(.*?)<\/span>\s*<span>(.*?)<\/span>/.exec(b);
    if (!newsId || !title || !s) continue;
    out.push({ newsId, title, date: s[1]!.trim().replace(/\./g, "-").replace(/-$/, ""), ministry: s[2]!.trim() });
  }
  return out;
}

/**
 * 전 부처 보도자료에서 돈 걸린 것만 거둔다.
 * @param pages 목록 페이지 수(1페이지 = 20건 ≈ 반나절)
 * @param maxAgeDays 며칠 전 것까지 볼 것인가 — 보도자료는 뉴스보다 빠르지만 오래된 건 이미 뒷북이다
 */
export async function harvestGovPress(opts?: { pages?: number; limit?: number; maxAgeDays?: number; now?: Date }): Promise<GovPressSeed[]> {
  const pages = opts?.pages ?? 2;
  const limit = opts?.limit ?? 6;
  const maxAgeDays = opts?.maxAgeDays ?? 3;
  const now = opts?.now ?? new Date();
  const cutoff = new Date(now.getTime() - maxAgeDays * 86400_000).toISOString().slice(0, 10);

  const raws: RawItem[] = [];
  for (let p = 1; p <= pages; p++) {
    try {
      const res = await fetch(`${LIST_URL}?pageIndex=${p}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12_000) });
      if (!res.ok) continue;
      raws.push(...parseList(await res.text()));
    } catch { /* 다음 페이지로 */ }
  }
  // ★구조가 바뀌면 여기가 0이 된다 — 부르는 쪽이 로그를 남길 수 있게 사실대로 던진다
  if (!raws.length) throw new Error("GOVPRESS_PARSE_EMPTY");

  const cands: GovPressSeed[] = [];
  const seen = new Set<string>();
  for (const r of raws) {
    if (!MINISTRIES.some((m) => r.ministry.includes(m))) continue;
    if (r.date < cutoff) continue;
    if (SKIP_RE.test(r.title)) continue;
    const k = pressKeywordOf(r.title);
    if (!k) continue;
    const nk = k.keyword.replace(/\s+/g, "");
    if (seen.has(nk)) continue;
    seen.add(nk);

    const [y, mo] = r.date.split("-").map(Number);
    const deadline = extractDeadline(r.title.replace(/&middot;/g, "·"), y || now.getFullYear(), mo || now.getMonth() + 1);
    const isClarification = /\[(설명|해명|반박|사실은)/.test(r.title) || /사실이 아닙니다|바 없습니다/.test(r.title);
    const docUrl = `https://www.korea.kr/briefing/pressReleaseView.do?newsId=${r.newsId}`;

    cands.push({
      keyword: k.keyword, ministry: r.ministry, date: r.date, docUrl, deadline, isClarification, verified: false,
      title: deadline
        ? `${k.keyword}, ${deadline.slice(5).replace("-", "월 ")}일까지 해야 하는 것`
        // ★해명 자료는 '달라지는 것'이 아니다 — 아직 안 정해진 걸 부처가 부인한 것이다
        : isClarification ? `${k.keyword}, 지금 도는 이야기 어디까지 사실인가`
        : `${k.keyword}, 달라지는 것 정리`,
      newsContext: pressBrief({ keyword: k.keyword, ministry: r.ministry, date: r.date, deadline, isClarification, rawTitle: r.title, docUrl }),
    });
  }

  // ★자동완성으로 '진짜 검색어'인지 확정한다(커뮤니티에서 배운 것 — 공문 말투는 검색어가 아니다).
  //  마감일이 박힌 건은 확정 못 해도 살린다: 마감이 다가오면 그때 검색이 생긴다(지금 없는 게 정상이다).
  const done: GovPressSeed[] = [];
  const spare: GovPressSeed[] = [];
  for (const c of cands) {
    if (done.length >= limit) break;
    try {
      const sug = await fetchNaverAutocomplete(c.keyword.split(" ")[0]!);
      if (sug.some((x) => x.replace(/\s+/g, "").includes(c.keyword.replace(/\s+/g, "").slice(0, 6)))) {
        done.push({ ...c, verified: true });
        continue;
      }
    } catch { /* 자동완성 실패 — 아래로 */ }
    (c.deadline ? done : spare).push(c);
    await new Promise((r) => setTimeout(r, 120));
  }
  for (const s of spare) { if (done.length >= limit) break; done.push(s); }
  return done.slice(0, limit);
}

/** 브리프 — 보도자료는 '원문'이라 근거로 쓸 수 있다(커뮤니티와 다른 점). 다만 해석은 우리 몫이다. */
export function pressBrief(a: {
  keyword: string; ministry: string; date: string; deadline: string | null; isClarification: boolean; rawTitle: string; docUrl: string;
}): string {
  const L = [
    `- [정부 보도자료 실데이터] ${a.ministry} | ${a.rawTitle.replace(/&middot;/g, "·").slice(0, 90)} | 배포 ${a.date} | 원문 ${a.docUrl}`,
    `★이건 부처가 직접 낸 원문이다 — 뉴스 인용이 아니라 1차 자료다. 숫자·조건은 여기 적힌 것만 쓴다.`,
  ];
  if (a.deadline) {
    L.push(
      `★마감일이 ${a.deadline}이다. 이 글의 임무는 '언제까지 무엇을 어디서'를 순서로 주는 것이다.`,
      `  ★지금은 마감 전이다 — 그날 쓰면 늦는다. 미리 색인돼 있어야 검색이 몰릴 때 우리 글이 뜬다.`,
      `  놓쳤을 때 어떻게 되는지(가산세·기회 상실)까지 적으면 끝까지 읽는다.`,
    );
  }
  if (a.isClarification) {
    L.push(
      `★이건 해명·설명 자료다. 부처가 해명한다는 건 지금 그 소문이 실제로 돌고 있다는 뜻이다.`,
      `  ★소문을 사실처럼 옮기지 마라. "무엇이 확정이고 무엇이 아직 아닌지"를 갈라주는 게 이 글의 값이다.`,
    );
  }
  L.push(
    `★보도자료 문장을 그대로 베끼지 마라 — 공문 말투는 아무도 안 읽는다. 검색한 사람의 말로 다시 쓴다.`,
    `★원문에 없는 금액·기간·대상을 지어내지 마라. 모르면 "원문·공식 누리집에서 확인" 프레임으로 안내한다.`,
    `★투자 판단을 부추기는 서술 금지: 유망·수혜·지금 사야·수익률 전망. 이 글은 제도 설명이다.`,
  );
  return L.join("\n");
}
