// 풀 전용 수집기 — 글감 추천용 keyword_pool에 넣을 '원본 키워드'를 거둔다.
//
// 틈새 발굴(discoverKeywords)과 다른 목표:
//   · 경쟁 '높음' 포함 → 임플란트·보톡스 같은 핵심 상업 키워드 보존
//   · 네이버 연관키워드 '원본'을 직접 적재(AI 재구성·결과수 캡 없음) → 풍부함(1만명 중복방지)
//   · 가벼운 정크(금융 티커/시세·쇼핑 플랫폼·실시간)와 저검색(월<50)만 제거
//   · '가격·비용·예약' 등 전환 의도 키워드는 보존(좋은 글감)
// 글감형(질문 제목) 변환은 추천(표시) 단계에서 — 풀엔 원본만 저장(검색량·중복추적 정확).
import { fetchRelatedKeywords, parseCount, normalizeKey } from "./naverKeyword";
import { naturalizeKeyword } from "./naverAutocomplete";
import { isUnsafeKeyword } from "./keywordSafety";

const MIN_MOBILE = 50; // 풀 하한(틈새 발굴 100보다 낮춤 — 롱테일 풍부하게). 30 이하는 잡음이라 50 균형.

// 가벼운 정크 사전: 블로그 글감이 안 되는 잡음만(금융 티커/시세 · 쇼핑 플랫폼 · 실시간류).
const JUNK_WORDS = [
  "주가", "시세", "증시", "코스피", "코스닥", "배당금", "공모주", "청약", "상장일", "환율",
  "실시간", "다시보기", "토렌트", "쿠팡", "11번가", "지마켓", "옥션", "중고나라",
];
// 의료·일반 업종에서 정상적으로 쓰이는 약어는 티커 오탐에서 보호.
const ACRONYM_ALLOWLIST = new Set(["CT", "MRI", "PT", "IT", "ETF", "ISA", "IRP"]);

/** 정크(티커·쇼핑 플랫폼·실시간)면 true(제외). 가격·비용 등 전환 키워드는 통과. */
function isJunk(keyword: string): boolean {
  if (JUNK_WORDS.some((w) => keyword.includes(w))) return true;
  const hasHangul = /[가-힣]/.test(keyword);
  if (!hasHangul) {
    const upper = keyword.replace(/\s+/g, "").toUpperCase();
    if (ACRONYM_ALLOWLIST.has(upper)) return false;
    if (/^[A-Z0-9.\-]{2,7}$/.test(upper)) return true; // 짧은 영문/숫자 = 티커 가능성
  }
  return false;
}

export interface PoolKeyword {
  keyword: string;
  monthlySearches: number; // 모바일+PC 합산(실제 총 검색량)
  compIdx: string;
  adDepth?: number; // ★단가 프록시(plAvgDepth) — Part B // 낮음/중간/높음 (높음도 보존)
}

/**
 * 시드의 네이버 연관키워드 '원본'을 거둔다(시드당 네이버 1회 호출).
 * 가벼운 정크 + 저검색(월<50)만 제거하고 나머지는 전부 반환 — 모든 경쟁등급 포함.
 */
export async function collectPoolKeywords(seed: string): Promise<PoolKeyword[]> {
  const list = await fetchRelatedKeywords(seed);
  const seen = new Set<string>();
  const out: PoolKeyword[] = [];
  for (const k of list) {
    const keyword = String(k.relKeyword ?? "").trim();
    if (!keyword) continue;
    const key = normalizeKey(keyword);
    if (!key || seen.has(key)) continue;
    const total = parseCount(k.monthlyMobileQcCnt) + parseCount(k.monthlyPcQcCnt); // 모바일+PC
    if (total < MIN_MOBILE) continue;
    if (isJunk(keyword)) continue;
    if (isUnsafeKeyword(keyword)) continue; // 타사 업체명·인물명·브랜드 차단(법적)
    seen.add(key);
    out.push({ keyword, monthlySearches: total, compIdx: String(k.compIdx ?? ""), adDepth: typeof k.plAvgDepth === "number" ? k.plAvgDepth : 0 });
  }
  out.sort((a, b) => b.monthlySearches - a.monthlySearches); // 검색량 많은 순
  // ★띄어쓰기 복원(2026-08-02 유저 화면 실측) — 광고 API는 relKeyword를 공백 없이 준다.
  //  그대로 제목에 박으니 '신용카드발급신용점수, 이것만 알면 됩니다'가 카드로 떴다. 사람이 안 치는 말이다.
  //  ★여기서 한 번만 고친다 — 풀에 저장되는 값을 사람 표기로 만들어야 하류(제목·본문·해시태그)가 전부 산다.
  //  상위 40개만 본다(자동완성 호출 비용). 실패하면 원본 유지라 잃는 게 없다.
  const head = out.slice(0, 40);
  const natural = await Promise.all(head.map((k) => naturalizeKeyword(k.keyword).catch(() => k.keyword)));
  head.forEach((k, i) => { if (natural[i] && natural[i] !== k.keyword) k.keyword = natural[i]; });
  return out;
}
