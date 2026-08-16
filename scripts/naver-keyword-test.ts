/**
 * 네이버 검색광고 API — 키워드도구(연관키워드) 응답 구조 확인용 테스트 스크립트.
 *
 * 목적: 네이버가 어떤 데이터를 주는지 "구조만" 눈으로 확인.
 * 인증·호출 로직은 lib/naverKeyword.ts(검증된 단일 출처)를 재사용한다.
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/naver-keyword-test.ts
 *   (키워드 직접 지정) ... scripts/naver-keyword-test.ts 강아지 재테크 캠핑
 *
 * 필요 env (.env, 절대 코드에 박지 말 것):
 *   NAVER_AD_CUSTOMER_ID, NAVER_AD_ACCESS_LICENSE, NAVER_AD_SECRET_KEY
 */
import { fetchRelatedKeywords, hasNaverAdEnv, type NaverKeyword } from "../lib/naverKeyword";

// 테스트 키워드 (인자로 덮어쓸 수 있음)
const KEYWORDS = process.argv.slice(2).length ? process.argv.slice(2) : ["강아지", "재테크", "캠핑"];

function fmt(v: number | string): string {
  if (typeof v === "string") return v; // "< 10" 등
  return v.toLocaleString("ko-KR");
}

function preflightCheck(): void {
  if (!hasNaverAdEnv()) {
    console.error("❌ .env에 NAVER_AD_CUSTOMER_ID / NAVER_AD_ACCESS_LICENSE / NAVER_AD_SECRET_KEY 중 비어 있는 값이 있습니다.");
    console.error("   .env 파일을 열어 실제 값을 채운 뒤 다시 실행하세요.");
    console.error("   실행: node --env-file=.env --import tsx scripts/naver-keyword-test.ts");
    process.exit(1);
  }
}

async function main() {
  preflightCheck();

  console.log("🔎 네이버 검색광고 키워드도구 — 응답 구조 확인");
  console.log(`   테스트 키워드: ${KEYWORDS.join(", ")}`);
  console.log("=".repeat(72));

  for (const kw of KEYWORDS) {
    console.log(`\n\n■ 입력 키워드: "${kw}"`);
    console.log("-".repeat(72));

    let list: NaverKeyword[];
    try {
      list = await fetchRelatedKeywords(kw);
    } catch (err) {
      console.error(`  ⚠️  호출 실패: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    console.log(`  연관키워드 ${list.length}개 수신`);

    // 상위 15개만 보기 좋게 출력 (전체는 너무 길어서)
    const TOP = 15;
    console.log(
      `\n  ${"연관키워드".padEnd(20)} ${"PC검색".padStart(9)} ${"모바일검색".padStart(11)} ${"경쟁도".padStart(6)} ${"광고수".padStart(6)}`,
    );
    for (const r of list.slice(0, TOP)) {
      console.log(
        `  ${String(r.relKeyword).padEnd(20)} ${fmt(r.monthlyPcQcCnt).padStart(9)} ${fmt(
          r.monthlyMobileQcCnt,
        ).padStart(11)} ${String(r.compIdx).padStart(6)} ${String(r.plAvgDepth).padStart(6)}`,
      );
    }
    if (list.length > TOP) console.log(`  … 외 ${list.length - TOP}개`);

    // ✅ "네이버가 주는 모든 필드" 확인 — 첫 항목의 raw JSON을 통째로 덤프
    if (list[0]) {
      console.log("\n  ▶ 첫 연관키워드의 전체 원본 필드 (구조 확인용):");
      console.log(
        JSON.stringify(list[0], null, 2)
          .split("\n")
          .map((l) => "    " + l)
          .join("\n"),
      );
      console.log(`\n  ▶ 응답 필드 키 목록: ${Object.keys(list[0]).join(", ")}`);
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log("완료. (DB 저장·UI 없음 — 구조 확인용 출력만)");
}

main().catch((err) => {
  console.error("스크립트 오류:", err);
  process.exit(1);
});
