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

// ★개행 v6.1(2026-07-17 유저 확정+실측 3건) — 절단 줄은 18자 지향, 통줄·꼬리줄은 20자까지 허용(조각 방지가 우선),
//  꼬리줄 5자 미만 금지 + 의존어 줄머리 금지 + 어절 폴백
const lineCheck = (html) => {
  const lines = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .flatMap((m) => m[1].split(/<br\s*\/?>/i))
    .map((s) => s.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
  return { lines, over: lines.filter((l) => [...l].length > 20), tiny: lines.filter((l) => [...l].length > 0 && [...l].length < 5) };
};
const v6a = lineCheck(splitLongParagraphs("<p>이번 달부터 청년 지원금 대상이 크게 넓어져서 소득 기준을 다시 확인해 보는 것이 좋아요.</p>"));
ok(v6a.over.length === 0, `v6: 절 경계 분할 후 18자 초과 줄 없음 (초과: ${v6a.over.join(" / ")})`);
ok(v6a.tiny.length === 0, `v6: 5자 미만 꼬리줄 없음 (꼬리: ${v6a.tiny.join(" / ")})`);
const v6b = lineCheck(splitLongParagraphs("<p>국민연금 임의가입 반납금 분할납부 제도 신청 방법 총정리 안내</p>"));
ok(v6b.over.length === 0, `v6: 의미 경계 없어도 어절 폴백으로 18자 상한 유지 (초과: ${v6b.over.join(" / ")})`);
ok(lineCheck(splitLongParagraphs("<p>짧은 문장은 그대로 둬요.</p>")).lines.length === 1, "v6: 18자 이하 문장은 통줄 유지");
// ★v6.1 실측 3건(2026-07-17 유저) — 조각·의존어 고아 방지
ok(lineCheck(splitLongParagraphs("<p>이사한 사람만 전입신고를 하면 돼요.</p>")).lines.length === 1, "v6.1: 20자 문장은 쪼개지 않는다('하면 돼요.' 조각 방지)");
const dep1 = lineCheck(splitLongParagraphs("<p>생각하면 그때가 이미 2주 뒤인 경우가 많아요.</p>")).lines;
ok(!dep1.some((l) => /^뒤인/.test(l)), "v6.1: '2주 / 뒤인' 분리 금지(숫자+의존어 결합)");
const dep2 = lineCheck(splitLongParagraphs("<p>임차인이라면 보증금 보호를 위해 가능한 한 빨리 하는 게 좋아요.</p>")).lines;
ok(!dep2.some((l) => /^게\s/.test(l)), "v6.1: 의존명사 '게' 줄머리 금지");
const dep3 = lineCheck(splitLongParagraphs("<p>세대 전체가 이사한 게 아니라면, 이사한 당사자만 새 주소로 신고하고 나머지 가족은 기존 주소 그대로 유지해요.</p>")).lines;
ok(!dep3.some((l) => [...l].length < 6), "v6.1: '아니라면,' 류 6자 미만 조각 없음");
// ★경계 공백 삼킴(2026-07-20 실측: '계약 종류를␣'+개행 — 중앙정렬 쏠림)
const spaced = splitLongParagraphs("<p>상업용 전기 계약은 해당 없으니 계약 종류를 먼저 확인하세요.</p>");
ok(!/[ \t]<br/i.test(spaced) && !/<br\s*\/?>[ \t]/i.test(spaced), "개행 경계에 공백 잔존 없음(중앙정렬 보호)");
const plainSp = buildPlainText({ title: "t", bodyHtml: "<p>상업용 전기 계약은 해당 없으니 계약 종류를 먼저 확인하세요.</p>" });
ok(plainSp.split("\n").every((l) => l === l.trim()), "plain 복사본 줄머리·줄꼬리 공백 없음");

// ★데이터 클러스터 표 승격(2026-07-20 유저 실측: 절감률 구간 불릿 — '표가 압승'). 행동 절차는 리스트 유지.
const dataList = buildRichHtml({ title: "t", bodyHtml: "<ul><li>1~3% 절감: 1kWh당 30원</li><li>5~10% 절감: 1kWh당 60원</li><li>10~20% 절감: 1kWh당 80원</li><li>20% 이상: 최대 120원</li></ul>" });
ok(/<table/.test(dataList) && (dataList.match(/<tr>/g) ?? []).length >= 4, "구간·단가 불릿 → 표 승격");
const stepList = buildRichHtml({ title: "t", bodyHtml: "<ul><li>정부24 접속: 검색창에 미환급금 조회 입력</li><li>본인 인증: 카카오·네이버 간편인증 선택</li><li>결과 확인: 국세·지방세 동시 조회</li></ul>" });
ok(!/<table/.test(stepList), "행동 절차 리스트는 표로 승격 안 함(리스트 유지)");

// ★줄 경계 공백 2차(실측: '확인이␣</b><br>' — 닫는 태그 안쪽 공백·nbsp가 1차 수정을 우회)
const tagLeak = buildRichHtml({ title: "t", bodyHtml: "<p><b>유자 확인이 </b><br>먼저다</p><p><mark>가격을 낮추지만&nbsp;</mark><br>있다</p>" });
ok(!/[  ]<\/(b|mark|span)>?<br/i.test(tagLeak) && !/(&nbsp;|[  ])+<br/i.test(tagLeak), "닫는 태그·nbsp 낀 개행 공백도 청소");
ok(!/[  ](<\/(?:b|span|mark)>)*<\/p>/.test(tagLeak), "문단 끝 공백 청소");

console.log(`\n검증: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
