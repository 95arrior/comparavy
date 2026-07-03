// 순수 HTML 생성 함수 검증 — 프레임워크 없이 node로 실행(새 패키지 0).
//   실행: npx tsx scripts/check-publish-html.mjs
import { buildRichHtml, buildMarkerHtml, buildPlainText, countPhotoSlots } from "../lib/publishHtml.ts";

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log("  FAIL:", msg); } }

const base = {
  title: "청년 지원금 신청 순서",
  bodyHtml: "<h2>핵심</h2><p>먼저 <mark>자격</mark>을 확인하세요.</p><p>[사진: 신청 화면]</p><p>다음은 서류입니다.</p><p>[사진: 서류 목록]</p>",
  images: { 0: "https://cdn.example.com/a.png" },
  hashtags: ["청년지원금", "신청방법"],
};

// countPhotoSlots
ok(countPhotoSlots(base.bodyHtml) === 2, "사진자리 2개 감지");

// rich: 0번은 img, 1번은 안내 문단
const rich = buildRichHtml(base);
ok(rich.includes('<img src="https://cdn.example.com/a.png"'), "rich: 이미지 있는 자리 img 삽입");
ok(!rich.includes("[사진"), "rich: 미충족 슬롯 제거(안내문구 없음)");
ok(rich.includes("<b style=\"background-color:#fff3a8;\">자격</b>"), "rich: 형광펜 -> 굵게+배경");
ok(rich.includes("#청년지원금 #신청방법"), "rich: 해시태그 라인");
ok(!rich.includes("[사진: 신청 화면]"), "rich: 원본 마커 소거");

// marker: 이미지 안 넣고 마커만
const marker = buildMarkerHtml(base);
ok(marker.includes("[사진 1]") && marker.includes("[사진 2]"), "marker: 마커만");
ok(!marker.includes("<img"), "marker: img 없음");

// plain: 태그 제거 + 마커
const plain = buildPlainText(base);
ok(!plain.includes("<"), "plain: 태그 제거");
ok(plain.includes("[사진 1]") && !plain.includes("[사진 2]"), "plain: 채워진 슬롯만 마커(미충족 제거)");
ok(plain.includes("#청년지원금"), "plain: 해시태그");
ok(plain.includes("자격"), "plain: 형광펜 텍스트 보존");

// 빈 해시태그 안전
ok(!buildRichHtml({ title: "t", bodyHtml: "<p>x</p>" }).includes("#"), "해시태그 없으면 라인 없음");

console.log(`\n검증: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
