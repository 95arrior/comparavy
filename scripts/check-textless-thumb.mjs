import { SUBJECT_GRAMMAR, PHOTO_PRESETS, photoPresetFor, buildTextlessThumbPrompt, manualShotBrief } from "../lib/thumbSubject.ts";
import { legibilityFromRaw } from "../lib/imageVerify.ts";
import fs from "node:fs";

// ★무문구 썸네일 회귀(2026-08-02).
//  ★방향이 두 번 뒤집혔다. 기록해 둔다 — 다시 헤매지 않기 위해:
//   ① 처음: 스케일 과장·연출 7종·실루엣 관문 → 동전 탑·의자 탑·헬멧 탑이 나왔다(전부 실패)
//   ② 유저가 실제 홈피드 썸네일 8장을 주며 "그냥 찍은 사진"이라 지적 → 규칙을 전부 걷어냄
//   ③ 유저가 CTR 디자이너 프롬프트를 직접 지급 → 지금 규격(미니멀·림라이트·부분 은닉)
//  ★규격은 유저 몫이고 우리는 집행한다. 이 테스트는 지급 규격이 조용히 훼손되지 않게 지킨다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 유저 지급 규격이 그대로 들어갔는가 ────────────────────────────────
{
  const p = buildTextlessThumbPrompt("", "u1", 0, "a construction crane silhouette", "새만금 채용");
  ok(/click-through rate/i.test(p), "CTR 최적화 디자이너로 지정");
  ok(/single symbolic object/i.test(p), "★핵심 상징물 하나");
  ok(/remove everything else/i.test(p), "★그 외 요소 제거");
  ok(/60-80%/.test(p), "★상징물이 화면 60~80%");
  ok(/gradient background/i.test(p), "★단색 그라데이션 배경");
  ok(/rim light and glow/i.test(p), "★강한 림라이트와 글로우");
  ok(/Hide 20-40%/i.test(p), "★20~40% 숨기기(궁금증 장치 — 다 보여주면 클릭할 이유가 없다)");
  ok(/why\?|what is that\?|what's inside\?/i.test(p), "★'왜? 뭐지? 안에 뭐가 있지?' 심리");
  ok(/Apple advertisement/i.test(p) && /YouTube thumbnail/i.test(p), "★애플 광고 미니멀 + 유튜브 CTR 궁금증");
  ok(/not an obvious digital composite/i.test(p), "과장된 합성 느낌 금지");
  ok(/No brand names, no logos/i.test(p), "브랜드 미사용");
  ok(/NO TEXT of any kind/i.test(p), "★글자 금지(계정 리스크 — 이건 우리 규칙으로 유지)");
  // ★걷어낸 것들이 되살아나지 않았는지
  ok(!/ABNORMAL|Staging:|Silhouette:|Do not stack/i.test(p), "★옛 규칙(스케일·연출·실루엣)이 되살아나지 않음");
}

// ── ② 16:9로 생성하는가 ────────────────────────────────────────────────
{
  const gi = fs.readFileSync(new URL("../lib/geminiImage.ts", import.meta.url), "utf-8");
  ok(/buildTextlessThumbPrompt[\s\S]{0,140}"16:9"/.test(gi), "★무문구는 16:9(유저 규격)");
}

// ── ③ 은닉 방식이 글마다 갈리는가 ───────────────────────────────────────
{
  const hides = ["에어컨 전기요금", "새만금 채용", "30대 평균 저축액", "숨은 보험금", "연금저축 비교"]
    .map((t) => buildTextlessThumbPrompt("", "u1", 0, `subject for ${t}`, t))
    .map((p) => p.split("\n").find((l) => l.includes("Hide 20-40%")));
  ok(new Set(hides).size >= 3, "★은닉 방식이 글마다 갈린다", `현재 ${new Set(hides).size}/5`);
  ok(buildTextlessThumbPrompt("", "u1", 0, "x", "t") === buildTextlessThumbPrompt("", "u1", 0, "x", "t"), "같은 입력은 재현된다");
  ok(buildTextlessThumbPrompt("", "u1", 0, "x", "t") !== buildTextlessThumbPrompt("", "u1", 1, "x", "t"), "재시도는 다른 은닉");
}

// ── ④ 촬영 주문서가 그 글을 따르는가 ────────────────────────────────────
//  ★실측: 새만금 채용 글에 "압도형 / 동전 몇 개를 손에 쥐고"라는 엉뚱한 주문서가 나갔다.
//   유형 폴백 표를 쓰고 있어서 제목과 무관했다.
{
  const b = manualShotBrief("", "u1", "새만금일자리박람회 채용", "공사장 크레인 실루엣");
  ok(/새만금/.test(b), "★주문서에 그 글 제목이 들어간다");
  ok(/크레인/.test(b), "★주문서 소재가 그 글에서 뽑은 것이다(유형 폴백 아님)");
  ok(!/동전 몇 개/.test(b), "★엉뚱한 폴백 소재가 안 나온다");
  ok(/60~80%/.test(b), "주문서도 60~80% 규격");
  ok(/20~40%/.test(b), "주문서도 부분 은닉 규격");
  ok(/글자가 보이면 안 됩니다/.test(b), "주문서에도 글자 금지");
  ok(/로고가 보이면 안 됩니다/.test(b), "주문서에도 브랜드 금지");
}

// ── ⑤ 계정 지문은 배경 밝기 한 축으로만 남는다 ──────────────────────────
{
  ok(PHOTO_PRESETS.length === 7, `사진 프리셋 7석 (현재 ${PHOTO_PRESETS.length})`);
  const bgs = new Set(PHOTO_PRESETS.map((_, i) => {
    process.env.ATEFLO_PHOTO_ASSIGN = `seat${i}:${i}`;
    return /dark, simple/.test(buildTextlessThumbPrompt("", `seat${i}`, 0, "x", "t")) ? "dark" : "bright";
  }));
  delete process.env.ATEFLO_PHOTO_ASSIGN;
  ok(bgs.size === 2, "★7석이 밝은 배경/어두운 배경 두 갈래로 나뉜다");
  ok(photoPresetFor("blog-x").seat === photoPresetFor("blog-x").seat, "같은 계정은 항상 같은 좌석");
}

// ── ⑥ 폴백 소재에 글자 물건이 없는가 ───────────────────────────────────
for (const g of SUBJECT_GRAMMAR) {
  ok(!/\b(receipts?|invoices?|bills?|documents?|screens?|signs?|labels?|calendars?|newspapers?|books?|papers?)\b/i.test(g.subject),
     `[${g.betType}] 글자가 본질인 소재 아님`, g.subject.slice(0, 44));
}
ok(SUBJECT_GRAMMAR.length === 8, `홈판 8유형 폴백 유지 (현재 ${SUBJECT_GRAMMAR.length})`);

// ── ⑦ 판독성 검사는 fail-open ──────────────────────────────────────────
{
  ok(legibilityFromRaw("완전 쓰레기").ok, "★파싱 실패면 통과(막으면 썸네일이 아예 없어진다)");
  ok(legibilityFromRaw('{"looksLikeAd":true}').ok === true, "★광고처럼 보여도 통과(어그로 우선)");
  ok(legibilityFromRaw('{"identifiableWhenTiny":false}').ok === false, "작게 줄여 안 보이면 불합격");

  const ct = fs.readFileSync(new URL("../lib/composeThumbnail.ts", import.meta.url), "utf-8");
  ok(/manualShotBrief/.test(ct), "★AI 2회 실패 시 촬영 주문서로 전환");
  ok(/strict: true/.test(ct), "무문구도 글자 검사는 fail-closed");
  ok(/picked\?\.ko/.test(ct), "★주문서에 한국어 소재가 전달된다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 무문구 썸네일(유저 지급 CTR 규격)");
process.exit(fail ? 1 : 0);
