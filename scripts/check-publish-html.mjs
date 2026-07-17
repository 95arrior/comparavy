// 순수 HTML 생성 함수 검증 — 프레임워크 없이 node로 실행(새 패키지 0).
//   실행: npx tsx scripts/check-publish-html.mjs
import { buildRichHtml, buildMarkerHtml, buildPlainText, countPhotoSlots, splitLongParagraphs } from "../lib/publishHtml.ts";

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
ok(!rich.includes("#청년지원금"), "rich: 해시태그 본문 미포함(태그칸 자동 등록 중복 방지 — 위저드 태그 단계로)");
ok(!rich.includes("[사진: 신청 화면]"), "rich: 원본 마커 소거");

// marker: 이미지 안 넣고 마커만
const marker = buildMarkerHtml(base);
ok(marker.includes("[사진 1]") && marker.includes("[사진 2]"), "marker: 마커만");
ok(!marker.includes("<img"), "marker: img 없음");

// plain: 태그 제거 + 마커
const plain = buildPlainText(base);
ok(!plain.includes("<"), "plain: 태그 제거");
ok(plain.includes("[사진 1]") && !plain.includes("[사진 2]"), "plain: 채워진 슬롯만 마커(미충족 제거)");
ok(!plain.includes("#청년지원금"), "plain: 해시태그 미포함");
ok(plain.includes("자격"), "plain: 형광펜 텍스트 보존");

// 빈 해시태그 안전
ok(!buildRichHtml({ title: "t", bodyHtml: "<p>x</p>" }).includes("#"), "해시태그 없으면 라인 없음");

// ★강조 다이어트 v3(2026-07-17 유저: 겉만 휘황찬란 금지) — 색·형광 총량 캡
const loud = buildRichHtml({
  title: "t",
  bodyHtml: [
    '<p>하나 <span style="color:#F04452">주의1</span> 둘 <span style="color:#F04452">주의2</span> 셋 <span style="color:#F04452">주의3</span></p>',
    '<p><b><span style="color:#1D75F7">개념1</span></b> <b><span style="color:#1D75F7">개념2</span></b> <b><span style="color:#1D75F7">개념3</span></b></p>',
    '<p><mark>구형광하나</mark> 그리고 <mark>구형광둘</mark> 그리고 <mark>구형광셋</mark></p>',
    '<p><mark>이것은 열다섯 자를 넘는 문장급 형광펜 문장입니다.</mark></p>',
  ].join(""),
});
ok((loud.match(/#F04452/g) ?? []).length === 2, "빨강 2곳 초과분 볼드 강등");
ok((loud.match(/#1D75F7/g) ?? []).length === 2, "파랑 2곳 초과분 색 해제");
ok((loud.match(/background-color:#fff3a8/g) ?? []).length === 2, "구 형광 2곳까지만 유지");
ok(!/background-color:#fff3a8;">이것은/.test(loud) && /<b[^>]*>이것은 열다섯/.test(loud), "문장급 형광은 볼드로 강등(형광 0)");
ok(!/자주 묻는 질문[\s\S]{0,40}background-color/.test(buildRichHtml({ title: "t", bodyHtml: "<h2>자주 묻는 질문</h2><p>답</p>" })), "FAQ 헤더 형광 배경 제거");

// ★복붙 생존형 소제목·구분선(2026-07-17 실측: border 계열 인라인 스타일은 네이버 붙여넣기에서 소실)
const two = buildRichHtml({ title: "t", bodyHtml: "<h2>첫 소제목</h2><p>본문 하나.</p><h2>둘째 소제목</h2><p>본문 둘.</p>" });
ok(two.includes("▍"), "소제목 세로 바 = 글자(▍)로 렌더");
ok(two.includes("───────"), "섹션 구분선 = 문자 라인(둘째 h2 앞)");
ok(!/border-(left|top)/.test(two), "border 인라인 스타일 미사용(복붙 소실 방지)");

// ★개행 v6(2026-07-17 유저 확정) — 한 줄 띄어쓰기 포함 18자 상한 + 꼬리줄 5자 미만 금지 + 어절 폴백
const lineCheck = (html) => {
  const lines = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .flatMap((m) => m[1].split(/<br\s*\/?>/i))
    .map((s) => s.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
  return { lines, over: lines.filter((l) => [...l].length > 18), tiny: lines.filter((l) => [...l].length > 0 && [...l].length < 5) };
};
const v6a = lineCheck(splitLongParagraphs("<p>이번 달부터 청년 지원금 대상이 크게 넓어져서 소득 기준을 다시 확인해 보는 것이 좋아요.</p>"));
ok(v6a.over.length === 0, `v6: 절 경계 분할 후 18자 초과 줄 없음 (초과: ${v6a.over.join(" / ")})`);
ok(v6a.tiny.length === 0, `v6: 5자 미만 꼬리줄 없음 (꼬리: ${v6a.tiny.join(" / ")})`);
const v6b = lineCheck(splitLongParagraphs("<p>국민연금 임의가입 반납금 분할납부 제도 신청 방법 총정리 안내</p>"));
ok(v6b.over.length === 0, `v6: 의미 경계 없어도 어절 폴백으로 18자 상한 유지 (초과: ${v6b.over.join(" / ")})`);
ok(lineCheck(splitLongParagraphs("<p>짧은 문장은 그대로 둬요.</p>")).lines.length === 1, "v6: 18자 이하 문장은 통줄 유지");

console.log(`\n검증: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
