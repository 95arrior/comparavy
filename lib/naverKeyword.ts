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
