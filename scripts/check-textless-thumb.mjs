import { SUBJECT_GRAMMAR, PHOTO_PRESETS, photoPresetFor, buildTextlessThumbPrompt, manualShotBrief } from "../lib/thumbSubject.ts";
import { legibilityFromRaw } from "../lib/imageVerify.ts";
import fs from "node:fs";

// ★무문구 썸네일 회귀(2026-08-02).
//  ★설계가 한 번 크게 뒤집혔다: 처음엔 '스케일 과장·연출 7종·실루엣 관문'으로 예술 사진을 만들었는데,
//   유저가 실제 네이버 홈피드 썸네일 8장을 레퍼런스로 주면서 전부 걷어냈다.
//   실물은 전부 '제목에 나온 그것을 그냥 찍은 사진'이었다 — 손에 든 에어컨 리모컨, 카드 박스, 여행지 뒷모습.
//   동전 탑·의자 탑은 홈피드에 존재하지 않는 종류의 사진이었다.
//  ★그래서 이 테스트가 지키는 것은 '규칙이 다시 늘어나지 않는 것'이다:
//   남은 관문은 글자 금지(계정 리스크) 하나뿐이고, 나머지는 평범함과 다양성이다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 평범한 사진을 요구하는가(예술 연출 금지) ──────────────────────────
{
  const p = buildTextlessThumbPrompt("", "u1", 0, "a hand holding an air conditioner remote", "에어컨 전기요금");
  ok(/A normal photo/i.test(p), "★평범한 사진으로 지정");
  ok(/real blogger would take with a phone/i.test(p), "★블로거가 폰으로 찍은 결");
  ok(/Do not stack, pile or arrange things into sculptures/i.test(p), "★쌓기·조형 금지(동전 탑·의자 탑 재발 방지)");
  ok(!/ABNORMAL|Staging:|Silhouette:/i.test(p), "★스케일·연출·실루엣 강제가 제거됨");
  ok(/obvious what the photo is about/i.test(p), "썸네일 크기에서 주제가 읽혀야");
  ok(/No faces/i.test(p) && /No brand logos/i.test(p), "얼굴·로고 금지");
  ok(/NO TEXT of any kind/i.test(p), "★글자 금지만은 남는다(계정 리스크)");
}

// ── ② 폴백 소재가 평범한가 ──────────────────────────────────────────────
for (const g of SUBJECT_GRAMMAR) {
  ok(!/tower|towering|stacked into|scattered wide|overflowing so much|precarious/i.test(g.subject),
     `[${g.betType}] 폴백 소재가 조형물이 아님`, g.subject.slice(0, 48));
  ok(!/\b(receipts?|invoices?|bills?|documents?|screens?|signs?|labels?|calendars?|newspapers?|books?|papers?)\b/i.test(g.subject),
     `[${g.betType}] 글자가 본질인 소재 아님`);
}
ok(SUBJECT_GRAMMAR.length === 8, `홈판 8유형 폴백 유지 (현재 ${SUBJECT_GRAMMAR.length})`);

// ── ③ 글마다 다르게 나오는가 ────────────────────────────────────────────
{
  const 제목들 = ["에어컨 전기요금", "새만금 일자리박람회", "30대 평균 저축액", "숨은 보험금 조회", "연금저축 vs IRP", "실업급여 신청"];
  const key = (t, v) => {
    const p2 = buildTextlessThumbPrompt("", "u1", v, `subject for ${t}`, t);
    return ["Framing", "Light"].map((k) => p2.split("\n").find((l) => l.startsWith(k))).join("|");
  };
  ok(new Set(제목들.map((t) => key(t, 0))).size >= 5, "★여섯 글 중 다섯 이상이 다른 구도·빛");
  ok(new Set([0, 1, 2].map((v) => key("30대 평균 저축액", v))).size === 3, "★같은 글 재시도도 매번 다름");
  ok(buildTextlessThumbPrompt("", "u1", 0, "x", "t") === buildTextlessThumbPrompt("", "u1", 0, "x", "t"), "같은 입력은 재현된다");
}

// ── ④ 7석은 빛(톤)으로만 갈린다 ─────────────────────────────────────────
{
  ok(PHOTO_PRESETS.length === 7, `사진 프리셋 7석 (현재 ${PHOTO_PRESETS.length})`);
  ok(new Set(PHOTO_PRESETS.map((p) => p.tone)).size === 7, "★7석의 빛이 전부 다름");
  ok(photoPresetFor("blog-x").seat === photoPresetFor("blog-x").seat, "같은 계정은 항상 같은 빛");
  process.env.ATEFLO_PHOTO_ASSIGN = ["u1", "u2", "u3", "u4", "u5", "u6", "u7"].map((id, i) => `${id}:${i}`).join(",");
  ok(new Set(["u1", "u2", "u3", "u4", "u5", "u6", "u7"].map((id) => photoPresetFor(id).seat)).size === 7,
     "★환경변수 배정이면 7석 충돌 0(해시는 7명/7석에서 99.4% 충돌)");
  delete process.env.ATEFLO_PHOTO_ASSIGN;
}

// ── ⑤ 판독성 검사는 fail-open ──────────────────────────────────────────
{
  ok(legibilityFromRaw("완전 쓰레기").ok, "★파싱 실패면 통과(막으면 썸네일이 아예 없어진다)");
  ok(legibilityFromRaw('{"looksLikeAd":true}').ok === true, "★광고처럼 보여도 통과(어그로 우선)");
  ok(legibilityFromRaw('{"identifiableWhenTiny":false}').ok === false, "작게 줄여 안 보이면 불합격");
}

// ── ⑥ AI 실패 시 촬영 주문서 ───────────────────────────────────────────
{
  const brief = manualShotBrief("돈 격차 자극", "user-a");
  ok(/글자가 보이면 안 됩니다/.test(brief), "주문서에도 글자 금지");
  const ct = fs.readFileSync(new URL("../lib/composeThumbnail.ts", import.meta.url), "utf-8");
  ok(/manualShotBrief/.test(ct), "★AI 2회 실패 시 촬영 주문서로 전환");
  ok(/strict: true/.test(ct), "무문구도 글자 검사는 fail-closed");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 무문구 썸네일");
process.exit(fail ? 1 : 0);
