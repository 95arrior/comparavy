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

// ★표 칸수 정규화(2026-08-14 실측: 농협 적금 표 — '총 납입액' 행이 셀 하나라 3칸 표가 어긋남)
{
  const { normalizeTableColumns } = await import("../lib/publishHtml.ts");
  const tbl = '<table><tr><td>구분</td><td>기본</td><td>최고</td></tr><tr><td>총 납입액</td><td>3,600,000원</td></tr></table>';
  const out = normalizeTableColumns(tbl);
  const rows = out.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
  const ns = rows.map((r) => (r.match(/<td/g) ?? []).length);
  ok(ns.every((n) => n === 3), "★실측 실물: 칸 모자란 행을 빈 칸으로 채워 3칸 정렬", JSON.stringify(ns));
  ok(!/undefined/.test(out), "지어낸 값 없음(빈 칸만)");
}

// ★소수점 재접합 + 이중 마무리 재배치(2026-08-14 실측: '0.5%p'가 '0.'/'5%p'로 쪼개짐, 댓글 질문 뒤 요약 불릿)
{
  const { fixSplitDecimals, fixDoubleClosing } = await import("../lib/publishHtml.ts");
  ok(fixSplitDecimals("<p>착공하면 0.</p><p>5%p에 해당하는</p>") === "<p>착공하면 0.5%p에 해당하는</p>", "★실측: 소수점 문단 쪼개짐 재접합");
  ok(fixSplitDecimals("<p>2026. 8. 11. 기준</p>") === "<p>2026. 8. 11. 기준</p>", "날짜 표기는 안 건드림(공백 소수점 아님)");
  const doubled = "<p>본문</p><p>댓글로 남겨주세요.</p><ul><li>핵심 총량 150만</li></ul><p>#태그</p>";
  const fixedD = fixDoubleClosing(doubled);
  ok(fixedD.indexOf("<ul>") < fixedD.indexOf("댓글로"), "★실측: 댓글 뒤 요약 불릿을 앞으로 재배치");
  ok(fixDoubleClosing("<p>본문</p><p>댓글로 남겨주세요.</p>") === "<p>본문</p><p>댓글로 남겨주세요.</p>", "불릿 없으면 그대로");
}
