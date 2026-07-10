// ★카드 최종 관문(2026-07-09 유저: "단단히 매듭") — 어느 소스·경로로 왔든 응답 직전 단일 검문.
//  배경: 게이트를 소스별로 복붙하다 빠지는 경로가 생김(실측: 구·군 게이트가 수확기 2곳에만 → 뉴스 증식으로 온
//  '강서구 평생교육이용권'·'대구 섬유염색업'이 무검문 통과). 규칙은 여기 한 곳에만 추가한다.
import { poolScore } from "./trafficPool";

export interface GateCard { keyword: string; title: string; newsContext?: string }
export interface GateDrop { keyword: string; reason: string }

// 주의: '가구·친구·도구·입구'의 구, '일시·당시·역시·다시'의 시, '장군'의 군은 지명이 아님(실측 오탐: 일시적1가구2주택) — 서버 전용이라 lookbehind 허용
const REGION_RE = /([가-힣]{1,4}(?:특별시|광역시|특별자치시|특별자치도)|(?<![가친기도입출지연온햇])구(?![가-힣])|(?<![장군상])군(?![가-힣])|(?<![일당즉잠역표감과다행조실])시(?![가-힣])|경기도|강원도|충청[남북]도|전라[남북]도|경상[남북]도|제주도)/;
const DEAD_RE = /(최종 선정|선정 완료|선정됐|수상|시상|성료|개최했|마쳤|체결했|협약식|발표회|출범식|기념식|위촉)/;
const NEWSY_RE = /(실적발표|실적 발표|어닝|주가 전망|증시 전망|급등주|테마주|수혜주|기소|구속|논란|의혹)/;
// B2B 지원사업(독자=기업 담당자 소수) — 일반인 신호가 함께 있으면 통과(중소기업'청년'지원금 등)
const B2B_RE = /(기업|법인|스타트업|제조사|공장|수출|바우처)\s?(대상|모집|지원|육성|참여)|기업\s?(최대|지원금|지원사업)/;
const B2C_SIGNAL_RE = /(청년|소상공인|자영업|1인|개인|근로자|직장인|재직|취업|프리랜서|사장님|창업(?!기업))/;

/** 응답 직전 최종 검문 — 통과 카드와 탈락 사유를 함께 반환(관측 가능). */
export function finalGate<T extends GateCard>(cards: T[]): { pass: T[]; drops: GateDrop[] } {
  const pass: T[] = [];
  const drops: GateDrop[] = [];
  for (const c of cards) {
    const text = `${c.title} ${c.keyword}`;
    // 1) 지역 협소 — 지역명이 박힌 글감은 전국 풀 신호(전국민 주제·인기지 청약 등)가 없으면 부적격.
    //    '서울시 출산가구 720만'(대집단+광역 4점)은 통과, '강서구 평생교육이용권'(0~1점)은 컷.
    if (REGION_RE.test(text) && poolScore(`${text} ${(c.newsContext ?? "").slice(0, 200)}`) < 3) {
      drops.push({ keyword: c.keyword, reason: "region_niche" });
      continue;
    }
    // 2) 죽은 공고·행사(행동 창 닫힘)
    if (DEAD_RE.test(text)) { drops.push({ keyword: c.keyword, reason: "dead_event" }); continue; }
    // 3) 읽고 끝나는 뉴스성
    if (NEWSY_RE.test(text)) { drops.push({ keyword: c.keyword, reason: "newsy" }); continue; }
    // 3.5) B2B 지원사업(실측 2026-07-10: '식품 기업 최대 1360만원 정부지원금' — 독자=기업 담당자 소수).
    //     수확기(기업마당)엔 독자 게이트가 있지만 뉴스 증식 경로가 무검문이었다 — 관문에서 일괄 차단.
    if (B2B_RE.test(text) && !B2C_SIGNAL_RE.test(`${text} ${(c.newsContext ?? "").slice(0, 200)}`)) {
      drops.push({ keyword: c.keyword, reason: "b2b_audience" });
      continue;
    }
    // 4) 제목-키워드 정합(짝 밀림류 최후 방어) — 실질 토큰 교집합 0이면 조립 오류로 간주
    const toks = (t: string) => new Set(t.replace(/[^가-힣a-zA-Z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 2));
    const kt = toks(c.keyword), tt = toks(c.title);
    const overlap = [...kt].some((w) => tt.has(w) || [...tt].some((x) => x.includes(w) || w.includes(x)));
    if (kt.size > 0 && tt.size > 0 && !overlap) { drops.push({ keyword: c.keyword, reason: "title_keyword_mismatch" }); continue; }
    pass.push(c);
  }
  return { pass, drops };
}
