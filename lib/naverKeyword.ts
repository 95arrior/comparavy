/**
 * 네이버 검색광고 API — 키워드도구(연관키워드) 호출.
 *
 * scripts/naver-keyword-test.ts에서 실제 동작이 검증된 인증·호출 로직을 추출한 모듈.
 * 여기서는 "네이버에서 원본 데이터를 받아오는 것"까지만 담당한다.
 * (필터·스코어링·AI 판별은 lib/goldenKeyword.ts에서 별도로 처리)
 *
 * 필요 env (절대 코드에 박지 말 것):
 *   NAVER_AD_CUSTOMER_ID, NAVER_AD_ACCESS_LICENSE, NAVER_AD_SECRET_KEY
 */
import crypto from "node:crypto";

const BASE_URL = "https://api.searchad.naver.com";
const PATH = "/keywordstool";

/** 키워드도구 응답의 연관키워드 한 건. (네이버가 주는 9개 필드) */
export interface NaverKeyword {
  relKeyword: string;
  monthlyPcQcCnt: number | string; // 검색수 적으면 "< 10" 문자열로 옴
  monthlyMobileQcCnt: number | string;
  monthlyAvePcClkCnt: number;
  monthlyAveMobileClkCnt: number;
  monthlyAvePcCtr: number;
  monthlyAveMobileCtr: number;
  plAvgDepth: number; // 월평균 노출 광고수
  compIdx: string; // 경쟁정도: 높음/중간/낮음
  [key: string]: unknown; // 네이버가 추가로 주는 필드 대비
}

/** 검색수 값을 숫자로 정규화. "< 10" 같은 문자열은 0으로 본다. */
export function parseCount(v: number | string | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  const digits = v.replace(/[^0-9]/g, ""); // "< 10" → "10"이 아니라, '<'는 "10 미만"이라 0 취급
  if (v.includes("<")) return 0;
  return digits ? Number(digits) : 0;
}

/** 세 env 키가 모두 설정됐는지. */
export function hasNaverAdEnv(): boolean {
  return Boolean(
    process.env.NAVER_AD_CUSTOMER_ID &&
      process.env.NAVER_AD_ACCESS_LICENSE &&
      process.env.NAVER_AD_SECRET_KEY,
  );
}

/**
 * HMAC-SHA256 서명. 메시지 = `${timestamp}.${method}.${path}` (구분자 점), 비밀키로 HMAC → base64.
 * 서명 path는 쿼리스트링 제외한 순수 경로(/keywordstool)만 사용한다.
 */
function sign(timestamp: string, method: string, path: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${path}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

function authHeaders(method: string, path: string): Record<string, string> {
  const customerId = process.env.NAVER_AD_CUSTOMER_ID ?? "";
  const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE ?? "";
  const secretKey = process.env.NAVER_AD_SECRET_KEY ?? "";
  const timestamp = Date.now().toString(); // 밀리초
  return {
    "X-Timestamp": timestamp,
    "X-API-KEY": accessLicense,
    "X-Customer": customerId,
    "X-Signature": sign(timestamp, method, path, secretKey),
  };
}

/**
 * 주제 키워드 1개로 연관 키워드 목록을 받아온다 (네이버는 한 번에 ~1,000~1,200개 반환).
 * @throws env 미설정 또는 HTTP 오류 시
 */
export async function fetchRelatedKeywords(hintKeyword: string): Promise<NaverKeyword[]> {
  if (!hasNaverAdEnv()) {
    throw new Error("네이버 검색광고 API 키(NAVER_AD_*)가 설정되지 않았습니다.");
  }
  // 네이버 권장: hintKeywords 공백 제거
  const hint = hintKeyword.replace(/\s+/g, "");
  const query = `hintKeywords=${encodeURIComponent(hint)}&showDetail=1`;
  const url = `${BASE_URL}${PATH}?${query}`;

  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders("GET", PATH),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`네이버 API HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as { keywordList?: NaverKeyword[] };
  return json.keywordList ?? [];
}

/** 정규화 키(공백 제거 + 소문자) — 네이버 relKeyword와 AI 생성 구를 대조할 때 쓴다. */
export function normalizeKey(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

export interface KeywordStat {
  mobile: number; // 월 모바일 검색수(파싱된 숫자)
  pc: number;
  compIdx: string; // 낮음/중간/높음
  adDepth: number; // 월평균 노출 광고수
}

function toStat(k: NaverKeyword): KeywordStat {
  return {
    mobile: parseCount(k.monthlyMobileQcCnt),
    pc: parseCount(k.monthlyPcQcCnt),
    compIdx: String(k.compIdx ?? ""),
    adDepth: typeof k.plAvgDepth === "number" ? k.plAvgDepth : parseCount(k.plAvgDepth as never),
  };
}

/** NaverKeyword[] → 정규화 키 통계 풀. (1단계 연관키워드에 이미 검색량이 있어 무료 재검증에 쓴다) */
export function buildStatsPool(list: NaverKeyword[]): Map<string, KeywordStat> {
  const pool = new Map<string, KeywordStat>();
  for (const k of list) {
    const key = normalizeKey(String(k.relKeyword ?? ""));
    if (key && !pool.has(key)) pool.set(key, toStat(k));
  }
  return pool;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 여러 키워드의 '실제' 검색량·경쟁도를 네이버로 재조회한다 (B 구조의 재검증 단계).
 * keywordstool은 hintKeywords 최대 5개 → 5개씩 배치 호출(공백 제거는 fetchRelatedKeywords가 처리),
 * 반환된 keywordList를 정규화 키로 풀에 모은다. AI가 만든 구의 진짜 검색량을 확인해 '가짜'를 거르는 용도.
 */
export async function fetchKeywordStats(phrases: string[], maxBatches = 6): Promise<Map<string, KeywordStat>> {
  const pool = new Map<string, KeywordStat>();
  const uniq = Array.from(new Set(phrases.map((p) => p.trim()).filter(Boolean)));
  if (uniq.length === 0 || !hasNaverAdEnv()) return pool;

  // 5개씩 배치, 호출 수 상한(maxBatches) — 네이버 rate limit(429) 방어
  const batches: string[][] = [];
  for (let i = 0; i < uniq.length && batches.length < maxBatches; i += 5) batches.push(uniq.slice(i, i + 5));

  // 순차 호출 + 짧은 간격 — 네이버 keywordstool은 동시/연타에 429를 잘 낸다
  for (let b = 0; b < batches.length; b++) {
    let list: NaverKeyword[] = [];
    try {
      list = await fetchRelatedKeywords(batches[b].join(","));
    } catch {
      list = [];
    }
    for (const k of list) {
      const key = normalizeKey(String(k.relKeyword ?? ""));
      if (key && !pool.has(key)) pool.set(key, toStat(k));
    }
    if (b < batches.length - 1) await sleep(250);
  }
  return pool;
}
