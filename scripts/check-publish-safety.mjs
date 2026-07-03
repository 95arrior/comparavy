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
ok(!/올려주세요|넣어주세요|삽입/.test(rich), "지시 문구('올려주세요') 0");
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
ok(!EMOJI_TEST(noEmo), "본문 이모지 0");
ok(stripEmoji("화살표→유지 ✅제거 · 보존").includes("→") && stripEmoji("화살표→유지 ✅제거 · 보존").includes("·") && !/[✅]/.test(stripEmoji("✅")), "화살표·가운뎃점 보존, 이모지 제거");
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
