import { siblingKeywords, maxSimilarity, nearDuplicate, sameProductFamily, coreKey } from "../lib/diversity.ts";
import fs from "node:fs";

// ★WP 글감 다양성 회귀(2026-08-02 유저 제보).
//  실물: 워드프레스 초안 5편이 '중국주식 시작 전 확인할 5가지' / '일본주식 시작 전 확인할 5가지' /
//  'IRP 계좌개설' / '주식창 처음 열면' 으로 주식 도배됐다.
//  ★원인은 두 갈래였고 둘 다 여기서 잠근다:
//   ① 정렬이 ad_depth(광고 단가) 내림차순 '단 하나' — 재테크 서브에서 단가 최상위가 증권 계열이라
//      매번 같은 top을 위에서부터 긁었다. 소재 분산 쿼터는 네이버 레인에만 있고 WP엔 없다.
//   ② 형제 글감(꼬리 같고 머리만 다름)을 막는 장치가 아예 없었다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 유저가 잡은 실물 쌍이 형제로 잡히는가 ────────────────────────────
ok(siblingKeywords("중국주식", "일본주식"), "★★유저 실물 — 중국주식 ↔ 일본주식");
for (const [a, b] of [
  ["미국주식", "일본주식"], ["청년적금", "직장인적금"],
  ["종합소득세신고", "부가가치세신고"],
]) ok(siblingKeywords(a, b), "머리만 갈아낀 형제", `${a} ↔ ${b}`);

// ── ② 기존 방어 셋이 왜 못 잡았는지 — 회귀로 고정(다시 "이미 있잖아"로 착각하지 않게) ──
ok(coreKey("중국주식") !== coreKey("일본주식"), "coreKey로는 안 잡힌다(DUP_MODIFIER_RE에 '주식' 없음)");
ok(!nearDuplicate("중국주식", "일본주식"), "nearDuplicate로는 안 잡힌다(dice 0.333 < 0.62)");
ok(!sameProductFamily("중국주식", "일본주식"), "sameProductFamily로도 안 잡힌다(부분수열 아님)");

// ── ③ 과차단하지 않는가 — 꼬리가 일반어면 형제가 아니다 ────────────────
//  ★이게 무너지면 보드가 텅 빈다. 놓치는 쪽이 잘못 막는 쪽보다 낫다는 게 이 함수의 설계다.
for (const [a, b] of [
  ["에세이 추천", "적금 추천"],        // 꼬리 '추천' = 형식어
  ["국민연금", "개인연금"],            // '연금'은 DUP_GENERIC_TOK — 다른 상품으로 본다
  ["정기예금", "정기적금"],            // 꼬리 1자('금')
  ["전세자금대출", "신용대출"],        // '대출'은 일반어
  ["주식창 보는법", "중국주식"],       // 공통 꼬리 없음
  ["ISA계좌", "ISA계좌"],              // 완전 일치는 근접중복의 몫
  // ★'보조금'·'지원금'은 DUP_GENERIC_TOK에 있다 — 정부지원금 글감이 워낙 많아 그 꼬리만으론
  //  같은 글이라 할 수 없다. 전기차 보조금과 태양광 보조금은 제도도 독자도 다르다.
  //  ★기준을 여기서 따로 정하지 않는다. 그 목록이 단일 진실원이고, 이 함수는 그걸 그대로 재사용한다.
  ["전기차보조금", "태양광보조금"],
]) ok(!siblingKeywords(a, b), "형제 아님(과차단 방어)", `${a} ↔ ${b}`);

// ── ④ 다양성 정렬이 실제로 순서를 바꾸는가 ─────────────────────────────
{
  const recent = ["중국주식 시작 전 확인할 5가지", "IRP 계좌개설"];
  const bucket = (k) => Math.round(maxSimilarity(k, recent) * 10);
  // 단가가 높아도 최근 글과 닮았으면 뒤로 밀려야 한다
  ok(bucket("중국주식 시작 전 확인하기") > bucket("전세보증금 돌려받는 법"),
    "★최근 글과 닮은 후보가 더 큰(뒤로 밀리는) 묶음에 들어간다");
  ok(bucket("전세보증금 돌려받는 법") === 0, "무관한 주제는 감점 0");
  ok(maxSimilarity("아무거나", []) === 0, "최근 글이 없으면 감점 없음(첫 글 방어)");
}

// ── ⑤ 배선 확인 — 함수만 만들고 안 붙이는 게 이 저장소의 반복 사고다 ──
//  실측: titleShapeClashes는 정의돼 있는데 프로덕션 사용처가 0이었다(스크립트에서만 import).
{
  const g = fs.readFileSync(new URL("../lib/googleTopics.ts", import.meta.url), "utf-8");
  ok(/siblingKeywords/.test(g) && /siblingOfRecent/.test(g), "★형제 차단이 WP 선정에 배선됨");
  ok(/maxSimilarity\(String\(a\.keyword\), recent\)/.test(g), "★다양성 정렬이 WP 선정에 배선됨");
  ok(/order\("created_at", \{ ascending: false \}\)/.test(g), "최근 글을 최신순으로 읽는다");
  // ad_depth를 '버린' 게 아니라 '유일한 축이 아니게' 한 것 — 단가 축은 남아 있어야 한다
  ok(/order\("ad_depth", \{ ascending: false/.test(g), "단가 축은 유지(수익 축을 버린 게 아니다)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: WP 글감 다양성(형제 차단 + 한 축 쏠림 해소)");
process.exit(fail ? 1 : 0);
