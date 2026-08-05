// ★청약홈 수확기(2026-07-08 유저 승인 — "돈+행동" 1단계) — 공공데이터포털 실호출 검증 완료 API 2종.
import { fetchNaverAutocomplete } from "./naverAutocomplete";
import { poolScore } from "./trafficPool";
//  선점 공식: 공고일 수확 → 즉시 발행 → 접수일 색인 완료 (무순위 1글 28.7만 조회 실증 구조).
//  신뢰 원칙: 모든 표시값은 API 실값만(공고일·접수일·세대수·지역). 분양가는 API가 제공하지 않음 — 어디서도 금액 생성 금지.

export interface ApplyhomeSeed {
  keyword: string;       // 검색형(단지명 + 청약 종류)
  title: string;         // 카드 제목 — 실값 조합
  region: string;        // 시도+시군구
  households: number;    // 공급 세대수
  kind: string;          // 무순위 | 일반분양 등
  announceDate: string;  // 공고일 YYYY-MM-DD
  actionStart: string;   // 접수 시작
  actionEnd: string;     // 접수 마감
  url: string;           // 공고 상세
  newsContext: string;   // 생성 엔진 전달용(금액 금지 조항 포함)
  longtails?: { kw: string; blogTotal: number | null }[]; // 단지명 자동완성 실검증(조건·일정·평면도류)
}

const BASE = "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1";

function mmdd(d: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${Number(m[1])}월 ${Number(m[2])}일` : d;
}

function regionOf(addr: string): string {
  return addr.split(/\s+/).slice(0, 2).join(" ");
}

type Row = Record<string, string | number | null>;

async function fetchList(path: string): Promise<Row[]> {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) throw new Error("DATA_GO_KR_KEY_MISSING");
  // ★perPage 60 → 300(2026-08-05 유저 실측: '더샵 분당센트로 줍줍'이 안 잡혔다).
  //  API가 최신순 정렬을 보장하지 않아, 60건으로 자르면 방금 뜬 공고가 그 밖으로 밀린다 —
  //  실제로 60건에는 없고 300건에는 있었다. ★우리가 못 본 게 아니라 애초에 안 가져왔다.
  //  ★가져온 뒤 공고일 내림차순으로 정렬해 '최신부터'를 코드가 보장한다(API 순서에 기대지 않는다).
  const res = await fetch(`${BASE}/${path}?page=1&perPage=300&serviceKey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`APPLYHOME_HTTP_${res.status}`);
  const data = (await res.json()) as { data?: Row[] };
  const rows = Array.isArray(data.data) ? data.data : [];
  // 공고일(RCRIT_PBLANC_DE) 내림차순 — 최신 공고가 앞에 오게
  return rows.sort((a, b) => String(b.RCRIT_PBLANC_DE ?? "").localeCompare(String(a.RCRIT_PBLANC_DE ?? "")));
}

function toSeed(r: Row, isRemainder: boolean): ApplyhomeSeed | null {
  const name = String(r.HOUSE_NM ?? "").trim();
  const announce = String(r.RCRIT_PBLANC_DE ?? "").trim();
  const start = String((isRemainder ? r.SUBSCRPT_RCEPT_BGNDE : r.RCEPT_BGNDE) ?? "").trim();
  const end = String((isRemainder ? r.SUBSCRPT_RCEPT_ENDDE : r.RCEPT_ENDDE) ?? "").trim();
  if (!name || !announce || !start || !end) return null;
  const kind = String(r.HOUSE_SECD_NM ?? (isRemainder ? "무순위" : "분양")).trim();
  const households = Number(r.TOT_SUPLY_HSHLDCO ?? 0);
  const region = regionOf(String(r.HSSPLY_ADRES ?? ""));
  const url = String(r.PBLANC_URL ?? "").trim();
  const announceTs = Date.parse(`${announce}T00:00:00+09:00`);
  if (!Number.isFinite(announceTs)) return null;
  const hh = households > 0 ? `${households}세대 ` : "";
  return {
    keyword: `${name} ${/무순위/.test(kind) ? "무순위 청약" : "청약"}`,
    title: `${name} ${hh}${kind}, ${mmdd(start)} 접수`,
    region, households, kind,
    announceDate: announce, actionStart: start, actionEnd: end, url,
    newsContext: [
      `- [청약홈 공고] ${name} | 공고일 ${announce} | 접수 ${start}~${end} | 지역 ${region}${households > 0 ? ` | 공급 ${households}세대` : ""}${r.PRZWNER_PRESNATN_DE ? ` | 당첨자 발표 ${r.PRZWNER_PRESNATN_DE}` : ""}${url ? ` | 공고문 ${url}` : ""}`,
      `※ 이 공고의 분양가·금액 정보는 제공되지 않는다 — 본문·제목에 분양가나 금액을 추정해 쓰는 것을 절대 금지. 금액은 '공고문에서 확인'으로 안내한다.`,
    ].join("\n"),
  };
}

/**
 * 접수 창이 살아 있는 공고. ★신선도 기준을 '공고일'에서 '접수 창'으로 바꾼다(2026-08-05 유저 실측).
 *  검거된 실물: '더샵 분당센트로 줍줍 5가구' — 접수가 8/5~8/11로 지금 진행 중인데 안 잡혔다.
 *  ★원인: 공고일 48시간 게이트. 공고는 미리 나고 접수는 나중이라, 공고일로 재면
 *   정작 접수 기간에 살아 있는 공고를 놓친다 — 선점하기 가장 좋은 시점을 게이트가 막고 있었다.
 *  ★바꾼 규칙: 접수 마감이 미래이고, 접수 시작이 14일 이내면 받는다.
 *   공고일은 컷이 아니라 정렬 재료로만 쓴다.
 */
export async function fetchApplyhomeSeeds(): Promise<ApplyhomeSeed[]> {
  const now = Date.now();
  const SOON = 14 * 86400_000; // 접수 시작이 이보다 먼 공고는 아직 이르다
  try {
    const [remainder, general] = await Promise.all([
      fetchList("getRemndrLttotPblancDetail"),
      fetchList("getAPTLttotPblancDetail"),
    ]);
    const seeds: ApplyhomeSeed[] = [];
    for (const [rows, isRem] of [[remainder, true], [general, false]] as const) {
      for (const r of rows) {
        const s = toSeed(r, isRem);
        if (!s) continue;
        const endTs = Date.parse(`${s.actionEnd}T23:59:59+09:00`);
        const startTs = Date.parse(`${s.actionStart}T00:00:00+09:00`);
        if (!Number.isFinite(endTs) || endTs < now) continue;          // 이미 마감
        if (Number.isFinite(startTs) && startTs - now > SOON) continue; // 접수가 2주보다 먼 공고는 아직 이르다
        seeds.push(s);
      }
    }
    // ★풀 스코어 우선(유저 회의: 동탄 줍줍 > 지방 소단지 — 지역·무순위·규모가 잠재 풀), 동점이면 공고일 최신
    const ps = (s2: ApplyhomeSeed) => poolScore(`${s2.kind} ${s2.region} ${s2.title}`) + (s2.households >= 100 ? 1 : 0);
    // ★접수가 임박한 것부터(선점 창이 짧은 순) → 같으면 풀 스코어 → 같으면 공고일 최신
    const daysToStart = (s2: ApplyhomeSeed) => Math.max(0, Math.ceil((Date.parse(`${s2.actionStart}T00:00:00+09:00`) - now) / 86400_000));
    seeds.sort((a, b) => (daysToStart(a) - daysToStart(b)) || (ps(b) - ps(a)) || b.announceDate.localeCompare(a.announceDate));
    const top = seeds.slice(0, 8);
    // ★단지명 롱테일(유저 지시) — '힐스테이트 시흥 무순위 조건/일정' 같은 실검색 패턴을 자동완성으로 실검증(씨앗당 1콜)
    await Promise.all(top.map(async (s2) => {
      try {
        const base = s2.keyword.replace(/\s?(무순위 청약|청약)$/, "").split(" ").slice(0, 3).join(" ");
        const acs = await fetchNaverAutocomplete(base);
        s2.longtails = acs.slice(0, 6).map((kw) => ({ kw, blogTotal: null }));
      } catch { /* 롱테일 실패는 씨앗을 막지 않는다 */ }
    }));
    return top;
  } catch (e) {
    throw e instanceof Error ? e : new Error("APPLYHOME_UNKNOWN");
  }
}
