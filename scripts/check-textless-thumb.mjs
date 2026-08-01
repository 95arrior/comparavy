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

// ── ① 레퍼런스 규격이 그대로 들어갔는가 ─────────────────────────────────
//  ★유저 레퍼런스: 사원증 + 공장 야경 + 보라 네온 글로우, 정사각, 3D 렌더 룩.
//   내가 처음 읽었을 때 네 군데를 틀렸다 — 그 넷이 다시 틀어지지 않게 고정한다.
{
  const p = buildTextlessThumbPrompt("", "u1", 0, "a glowing employee ID badge on a lanyard", "새만금 채용");
  ok(/3D product-render/i.test(p), "★3D 렌더 룩(실사 사진 아님 — 오독 ③)");
  ok(/Square 1:1/.test(p), "★정사각(홈피드 카드가 정사각 — 오독 ④)");
  ok(/60-80%/.test(p), "히어로가 화면 60~80%");
  ok(/neon rim light/i.test(p), "네온 림라이트");
  ok(/glow spilling/i.test(p), "바닥으로 번지는 글로우");
  ok(/dark scene related to the topic/i.test(p), "★배경은 비우지 않고 주제 맥락을 남긴다(오독 ①)");
  ok(/Never an empty flat backdrop/i.test(p), "★텅 빈 배경 금지");
  ok(/swallowed by darkness/i.test(p), "★어둠에 잠기게 — 물체를 덮는 게 아니다(오독 ②)");
  ok(/wonders what is back there/i.test(p), "궁금증 유도");
  ok(/Apple ad/i.test(p) && /YouTube thumbnail/i.test(p), "애플 미니멀 + 유튜브 CTR");
  ok(/No brand names, no logos/i.test(p), "브랜드·로고 금지");
  ok(/NO TEXT of any kind/i.test(p), "★글자 금지(계정 리스크 — 우리 규칙)");
  ok(!/16:9/.test(p), "★16:9가 되살아나지 않음");
}

// ── ② 실제 생성도 정사각인가 ───────────────────────────────────────────
{
  const gi = fs.readFileSync(new URL("../lib/geminiImage.ts", import.meta.url), "utf-8");
  ok(/buildTextlessThumbPrompt[\s\S]{0,160}"1:1"/.test(gi), "★무문구 생성이 1:1");
}

// ── ③ 소재가 추상으로 흐르지 않는가 ─────────────────────────────────────
//  ★실측: '유리 상자와 커튼'이 나왔다. 추상 조형은 주제를 말하지 못한다.
{
  const ts = fs.readFileSync(new URL("../lib/thumbSubject.ts", import.meta.url), "utf-8");
  ok(/CONCRETE, INSTANTLY RECOGNIZABLE/.test(ts), "★구체적이고 즉시 알아보는 물건을 요구");
  ok(/Never an abstract shape, a glass box, a cube, drapery/.test(ts), "★추상 조형(유리상자·큐브·커튼) 금지");
  ok(/employee ID badge/.test(ts), "예시가 레퍼런스와 같은 결(사원증)");
}

// ── ④ 계정 지문은 글로우 색 한 축 ───────────────────────────────────────
{
  ok(PHOTO_PRESETS.length === 7, `프리셋 7석 (현재 ${PHOTO_PRESETS.length})`);
  const glows = new Set(PHOTO_PRESETS.map((_, i) => {
    process.env.ATEFLO_PHOTO_ASSIGN = `seat${i}:${i}`;
    return /strong ([a-z ]+) neon rim/.exec(buildTextlessThumbPrompt("", `seat${i}`, 0, "x", "t"))?.[1];
  }));
  delete process.env.ATEFLO_PHOTO_ASSIGN;
  ok(glows.size === 7, `★7석의 글로우 색이 전부 다름 (현재 ${glows.size})`);
  ok(photoPresetFor("blog-x").seat === photoPresetFor("blog-x").seat, "같은 계정은 항상 같은 색");
}

// ── ⑤ 촬영 주문서가 그 글을 따르고 규격과 맞는가 ────────────────────────
{
  const b = manualShotBrief("", "u1", "새만금일자리박람회 채용", "목걸이형 사원증");
  ok(/새만금/.test(b), "★주문서에 그 글 제목");
  ok(/사원증/.test(b), "★소재가 그 글에서 뽑은 것");
  ok(!/동전 몇 개/.test(b), "엉뚱한 폴백 소재가 안 나온다");
  ok(/60~80%/.test(b), "주문서도 60~80%");
  ok(/어둠에 묻히게/.test(b), "주문서도 어둠 은닉");
  ok(/색 조명/.test(b), "주문서도 색 조명(림라이트)");
  ok(/글자가 보이면 안 됩니다/.test(b) && /로고가 보이면 안 됩니다/.test(b), "주문서 금지 규칙");
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
