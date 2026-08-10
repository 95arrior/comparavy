// 주소 보호 검증 — 실행: npx tsx scripts/check-url-unbreak.mjs
// ★출발점(2026-08-11 유저 실물): 본문 주소가 "…go." 다음 줄 "kr"로 쪼개져 나감.
//  ①모델이 주소 안에 넣은 공백·<br> 재접합 ②프로토콜 없는 주소도 개행 통줄 보호.
import { fixBrokenUrls } from "../lib/publishHtml.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

ok(fixBrokenUrls("복지로(bokjiro.go. kr)에서") === "복지로(bokjiro.go.kr)에서", "도메인 조각 공백 재접합");
ok(fixBrokenUrls("www. gov. kr 접속") === "www.gov.kr 접속", "www 조각 재접합");
ok(fixBrokenUrls("www.bokjiro.go.<br>kr") === "www.bokjiro.go.kr", "<br>로 쪼개진 주소 재접합");
ok(fixBrokenUrls("hometax.go .kr에서") === "hometax.go.kr에서", "마침표 앞 공백 재접합");
ok(fixBrokenUrls("신청을 마쳤습니다. kr 지역은") === "신청을 마쳤습니다. kr 지역은", "한글 문장 끝은 안 붙인다(오탐 방지)");

if (fail) { console.log(`\n${fail}건 실패`); process.exit(1); }
console.log("\n전부 통과");
