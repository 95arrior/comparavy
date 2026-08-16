// 발행 안전망 검증 — 사진마커 유출·이모지·미닫힌괄호분할 0건 증명(로컬, AI 콜 없음).
//   npx tsx scripts/check-publish-safety.mjs
import { formatBody, buildPlainText, sanitizeForCopy, hasPhotoLeak, stripEmoji } from "../lib/publishHtml.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

// ── 1. 사진 마커 유출: 슬롯 4개, 이미지 2개 → 미충족 슬롯 제거, [사진 잔존 0 ──
console.log("① 사진 마커 유출(슬롯4 vs 이미지2):");
const body4 = "<p>가나다.</p>[사진: 첫째]<p>라마바.</p>[사진: 둘째]<p>사아자.</p>[사진: 셋째]<p>차카타.</p>[사진: 넷째]<p>파하.</p>";
const rich = formatBody({ title: "t", bodyHtml: body4, images: { 0: "http://x/a.png", 1: "http://x/b.png" } });
ok(!/\[사진/.test(rich), "rich에 [사진 잔존 0");
// ★2026-08-02 정렬 — 이 단언은 낡았다. '미충족 슬롯은 줄째로 제거'가 옛 결정이고,
//  이후 유저가 "에디터에서 그 자리에 이미지를 넣고 마커를 지우는 흐름"으로 확정해
//  사진 슬롯은 '[이미지 N — 여기에 삽입]'을 일부러 남긴다(publishHtml).
//  독자용 권유 문구('올려주세요')는 여전히 금지 — 그건 발행본에 남으면 안 되는 말이다.
ok(!/올려주세요|넣어주세요/.test(rich), "독자용 권유 문구 0(★'삽입' 자리표시자는 의도된 것)");
ok(/\[이미지 3 — 여기에 삽입\]/.test(rich), "★미충족 사진 슬롯은 명시 마커로 남는다(유저 확정 흐름)");
// ★카드·차트는 반대다 — 코드가 자동 생성하는 자리라 안 만들어졌으면 사람이 넣을 것이 없다.
//  2026-08-02 유저 실측: 라벨=값 원문("표현: 비교 | 기존 한도=5,000만 원…")이 독자에게 그대로 나갔다.
{
  const card = formatBody({ title: "t", bodyHtml: "<p>앞.</p>[카드: 기존 한도=5,000만 원 | 변경=1억 원]<p>뒤.</p>", images: {} });
  ok(!/여기에 삽입/.test(card) && !/한도=/.test(card), "★미충족 카드 슬롯은 흔적 없이 사라진다");
}
ok((rich.match(/<img/g) ?? []).length === 2, "채워진 슬롯 2개만 img");
ok(!hasPhotoLeak(rich), "hasPhotoLeak=false");
const plain = buildPlainText({ title: "t", bodyHtml: body4, images: { 0: "http://x/a.png", 1: "http://x/b.png" } });
ok(!/\[사진 [34]\]/.test(plain), "plain에 미충족 슬롯 마커 0");
ok(/\[사진 1\]/.test(plain) && /\[사진 2\]/.test(plain), "plain에 채워진 슬롯 마커 유지");

// ── 2. 엔진이 지시 문구를 만들어도 최종 게이트가 제거 ──
console.log("\n② 엔진 지시문구 유출 방어:");
const leaky = "<p>내용입니다.</p><p>[사진 4] 여기에 대표 메뉴 사진을 올려주세요</p><p>끝.</p>";
const cleaned = formatBody({ title: "t", bodyHtml: leaky, images: {} });
ok(!hasPhotoLeak(cleaned), "지시문구 문단 제거됨");

// ── 3. 이모지 유출: 후처리 필터 ──
console.log("\n③ 이모지 구조적 제거:");
const emo = "<p>정리했어요 🎨 꿀팁 😊👍 시작 🔥</p>";
const noEmo = formatBody({ title: "t", bodyHtml: emo, images: {} });
ok(!/[🤣🚀😂🔥]/u.test(noEmo), "화이트리스트 외 이모지 0(포맷 v3)");
ok(stripEmoji("📌 포인트 💡 유지 🤣 제거").includes("📌") && stripEmoji("📌💡🤣").includes("💡") && !stripEmoji("🤣").includes("🤣"), "포인트 이모지(📌💡) 생존, 도배류 제거");
ok(stripEmoji("화살표→유지 🤪제거 · 보존").includes("→") && stripEmoji("화살표→유지 🤪제거 · 보존").includes("·") && !stripEmoji("🤪").includes("🤪"), "화살표·가운뎃점 보존, 비허용 이모지 제거");
function EMOJI_TEST(s){ return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s); }

// ── 4. 미닫힌 괄호 분할 금지 ──
console.log("\n④ 괄호 균형 분할:");
const paren = "<p>지원 대상은 여러 조건(소득 하위 70%, 무주택 세대주, 청년 대상)에 해당하는 사람이며 신청은 온라인으로만 가능합니다 그리고 마감이 임박했으니 서둘러야 합니다 정말로.</p>";
const split = formatBody({ title: "t", bodyHtml: paren, images: {} });
// 분할 결과에서 여는 괄호 '(' 가 있는 문단은 반드시 같은 문단에 ')' 도 있어야(쪼개지지 않음)
const paras = [...split.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m=>m[1]);
const brokenParen = paras.some(p => (p.match(/[(（]/g)??[]).length !== (p.match(/[)）]/g)??[]).length);
ok(!brokenParen, "미닫힌 괄호로 분할된 문단 0");

console.log(fail === 0 ? "\n통과: 4개 결함 전부 0건" : `\n실패: ${fail}건`);
process.exit(fail === 0 ? 0 : 1);
