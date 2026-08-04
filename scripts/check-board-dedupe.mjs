import { sameProductFamily, nearDuplicate } from "../lib/diversity.ts";
import fs from "node:fs";

// ★2026-08-02 유저 화면 실측 — 한 판에 이 둘이 같이 떴다:
//   "연금펀드로 노후자금 준비, 수익률과 수수료 비교"
//   "연금저축펀드 가입 전 수수료와 수익률 비교"
//  거의 같은 글이다. 유저 원칙상 중복은 저품질 낙인이라 절대 안 된다.
//  기존 검사가 왜 못 잡았나: nearDuplicate는 인픽스 '저축'을 못 넘고,
//  제목 유사도는 0.39로 낮다(표현이 다르면 문장 비교로는 안 잡힌다).
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 같은 상품군을 잡는가 ─────────────────────────────────────────────
for (const [a, b] of [
  ["연금펀드", "연금저축펀드"],       // ★실측 사고
  ["실업급여", "실업급여조건"],
  ["청약통장", "주택청약통장"],
  ["연금저축", "개인연금저축"],
]) ok(sameProductFamily(a, b), "★같은 상품군 검거", `${a} ⊂ ${b}`);

// ── ② 다른 주제를 붙잡지 않는가(과차단 방지) ───────────────────────────
//  ★보드 결품이 오늘 가장 오래 싸운 문제다. 중복 잡겠다고 과차단하면 그 사고로 되돌아간다.
for (const [a, b] of [
  ["주담대이율", "주담대환대출"],     // 이율과 환대출은 다른 글
  ["신용카드환급", "통신비환급금"],
  ["연금저축펀드", "청년도약계좌"],
  ["고용보험환급", "고용보험료율"],
  ["디딤돌대출", "버팀목전세자금"],
]) ok(!sameProductFamily(a, b), "다른 주제는 통과", `${a} ⟷ ${b}`);

// ── ③ 짧은 말이 우연히 걸리지 않는가 ───────────────────────────────────
//  '대출'·'청약' 같은 두세 글자는 아무 키워드에나 부분수열로 들어간다.
for (const [a, b] of [["대출", "주담대환대출"], ["청약", "주택청약통장"], ["연금", "연금저축펀드"]])
  ok(!sameProductFamily(a, b), "★3자 이하는 판정하지 않는다", `${a} ⟷ ${b}`);

// ── ④ 보드 중복 제거에 배선됐는가 ──────────────────────────────────────
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  const dd = rt.slice(rt.indexOf("const dedupeBoard"), rt.indexOf("if (tailMode === \"long\")"));
  ok(/sameProductFamily\(kw, kkw\)/.test(dd), "★보드 중복 제거가 상품군까지 본다");
  ok(/nearDuplicate\(kw, kkw\)/.test(dd), "기존 검사도 그대로 유지");
}

// ── ⑤ 기존 케이스 회귀 ─────────────────────────────────────────────────
ok(nearDuplicate("CMA추천", "CMA통장추천"), "기존 인픽스 검거는 그대로", "CMA추천 ⟷ CMA통장추천");



// ★레인 간 소재 중복(2026-08-05 유저 화면에서 검거: '페이코 포인트'가 홈판 1장 + 유행 1장으로 나란히 섰다).
//  두 레인은 같은 씨앗 창고를 보는데 서로를 안 봤고, 검사는 키워드 '정확 일치'뿐이라
//  '페이코 포인트 출금'과 '누적된 페이코 포인트'가 다른 것으로 통과했다.
//  ★같은 날 같은 소재 두 장은 네이버에서 서로 잡아먹는다(유저 절대조건: 중복 금지).
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok(/const homeToks = new Set\(homeCards\.flatMap/.test(rt), "★홈판이 든 소재 토큰을 모은다");
  ok(/\[lane-dup\] 홈판과 같은 소재/.test(rt), "★겹치면 트렌드 카드를 빼고 이유를 남긴다");
  ok(/diag\.laneDup/.test(rt), "★몇 장이 빠졌는지 debug에 남는다");
  // 판정 규칙 재현 — 실물 두 장이 실제로 겹침으로 잡히는가
  const STOP = new Set(["지원금", "신청", "방법", "조건", "기준", "정리", "혜택", "제도", "현실", "이유", "기한", "경우", "사람", "비율", "출금", "납부"]);
  const toks = (t) => String(t || "").split(/[\s·,]+/).map((w) => w.replace(/[^가-힣a-zA-Z0-9]/g, "")).filter((w) => [...w].length >= 2 && !STOP.has(w));
  const home = new Set(toks("페이코 포인트 출금 몰라도 너무 몰랐던 페이코 포인트 안 빼면 그냥 날아간다는 기준"));
  ok(toks("누적된 페이코 포인트 모르고 만료 앞두고 있는 사람 비율이 상당하다는 현실").some((w) => home.has(w)),
    "★유저가 잡은 실물 두 장이 겹침으로 잡힌다");
  const other = new Set(toks("주민세 납부 미리 준비하면 좋은 것들"));
  ok(!toks("테슬라 할인 기간 카드 쓰는 게 맞는 선택인 이유").some((w) => other.has(w)),
    "★무관한 카드는 안 걸린다(과교정 방어)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 보드 내 중복(같은 상품군)");
process.exit(fail ? 1 : 0);
