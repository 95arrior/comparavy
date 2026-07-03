// 카피/브리프 구조 불변식 검증(로컬, AI 콜 없음).
//   npx tsx scripts/check-copy-invariants.mjs
import fs from "node:fs";
import { briefToDirective, validThumbMain } from "../lib/amplifyTopics.ts";
import { compressToSearchKeyword } from "../lib/trendTopics.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

// 1) 자르기 코드가 소스에서 제거됐는지(구조적 증명)
console.log("① 자르기(truncation) 경로 부재:");
const amp = fs.readFileSync("lib/amplifyTopics.ts", "utf8");
ok(!/clampCopy/.test(amp), "clampCopy 완전 제거");
ok(!/thumbMain[^\n]*\.slice\(/.test(amp), "thumbMain에 slice 없음");

// 2) validThumbMain — 초과 카피 반려
console.log("\n② 썸네일 카피 검증(통과/반려):");
ok(validThumbMain("지금 바꿔야\n하는 이유"), "정상(2줄·줄당≤10) 통과");
ok(validThumbMain("이유"), "짧은 카피 통과");
ok(!validThumbMain("당신의 선택이 연 수익을 크게"), "줄당 10자 초과 반려");
ok(!validThumbMain("한줄인데열한글자넘어감확실히"), "11자+ 한 줄 반려");
ok(!validThumbMain("첫째 줄\n둘째 줄\n셋째 줄"), "3줄 반려");
ok(!validThumbMain("무조건 오르는\n보장 통장"), "금지어 반려");
ok(!validThumbMain("지금 바꿔야!\n하는 이유"), "느낌표 반려");
ok(!validThumbMain(""), "빈 값 반려");

// 3) briefToDirective — 빈 필드 섹션 생략(빈 값 주입 불가)
console.log("\n③ 빈 필드 주입 불가:");
const d1 = briefToDirective({ intent: "정보 정리", opening: "질문 던지기", flow: "단계별 순서", closing: "핵심 요약", tone: "담백한 기록형", reader: "", hook: "", coreWord: "" });
ok(!/독자: *\n/.test(d1) && !/독자: *$/m.test(d1), "빈 reader 줄 없음");
ok(!/코어 ''/.test(d1) && !/코어 ' *'/.test(d1), "빈 coreWord 줄 없음");
ok(!/훅: *\n/.test(d1) && !/훅: *$/m.test(d1), "빈 hook 줄 없음");
ok(/의도: 정보 정리/.test(d1), "채워진 필드는 유지");
const d2 = briefToDirective({ intent: "체크리스트", opening: "결론 선공개", flow: "FAQ", closing: "이런 분께", tone: "문답 교차", reader: "초보 투자자", hook: "훅 문장", coreWord: "2026" });
ok(/시의성 코어 '2026'/.test(d2), "coreWord 있으면 주입");

// 4) compressToSearchKeyword — 뉴스 문구 → 검색형
console.log("\n④ 씨앗 검색형 정규화:");
ok(compressToSearchKeyword("소상공인 정부 지원금 효과 분석") === "소상공인 정부 지원금", "분석 꼬리 제거");
ok(compressToSearchKeyword("부동산 규제 정책 변화") === "부동산 규제", "정책 변화 제거");
ok(compressToSearchKeyword("전세대출 조건은") === "전세대출 조건", "조사 제거");

console.log(fail === 0 ? "\n통과: 구조 불변식 전부 성립" : `\n실패: ${fail}건`);
process.exit(fail === 0 ? 0 : 1);
