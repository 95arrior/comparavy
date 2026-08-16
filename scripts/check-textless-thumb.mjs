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
//  ★규격 교체(2026-08-05): 종전은 '3D 제품 렌더 + 공장 야경 + 네온 글로우'였다.
//   그날 유저가 토스피드 화면을 주며 "토스톤 그 일러스트가 아닌데? 기존인데?"라고 정정했다.
//   ★그래서 이 테스트도 갈아끼운다 — 낡은 테스트를 남겨두면 '유저가 기각한 규격'을 코드가 지키게 된다.
//   (실제로 그 사이 이 파일이 계속 FAIL을 냈다. 테스트가 틀렸는데 코드를 의심하게 만든다.)
{
  const p = buildTextlessThumbPrompt("", "u1", 0, "a glowing employee ID badge on a lanyard", "새만금 채용");
  // ★3차 규격(2026-08-05 유저 레퍼런스): 비비드 단색 방사 배경 + 정중앙 대칭 + 주제 실물 크게.
  //  같은 날 오전의 '플랫 벡터 토스톤'을 대체한다. 8/2의 '3D 네온 + 공장 야경'과도 다르다 —
  //  ★차이는 배경이다: 야경·보케가 아니라 '한 가지 색으로 꽉 찬 방사선(sunburst)'.
  ok(/radial sunburst rays/i.test(p), "★방사선 배경(레퍼런스의 핵심)");
  ok(/halftone dot pattern in the corners/i.test(p), "모서리 하프톤 도트");
  ok(/one vivid saturated color filling the whole frame/i.test(p), "★배경은 강조 색상 한 가지로 꽉");
  ok(/no night city, no bokeh/i.test(p), "★야경·보케는 여전히 금지(8/2 규격이 되살아나지 않게)");
  ok(/70-85% of the frame/.test(p), "★주제가 화면의 70~85%");
  ok(/Render the actual thing, not a metaphor/i.test(p), "★은유가 아니라 주제의 실물(유저: 디에이치 아파트를 딱 박은 거야)");
  ok(/four-point sparkle glints/i.test(p), "반짝임 효과");
  // ★훅 은유 지시가 남아 있으면 모델이 아파트 대신 '열리는 뚜껑'을 그린다 — 상충하는 지시는 나쁜 쪽이 이긴다
  ok(!/JUST BEFORE the reveal/i.test(p), "★'답 직전의 순간' 은유 지시가 빠졌다(새 규격과 상충)");
  ok(!/flat vector editorial illustration/i.test(p), "★플랫 벡터 규격이 되살아나지 않는다");
  ok(/square \(1:1\)/i.test(p), "★정사각(홈피드 카드가 정사각)");
  ok(/No company names or trademarked wordmarks/i.test(p), "회사 상표 금지");
  // ★이 허용 문구가 유저 화면의 '맨 위 집 아이콘'을 불렀다(2026-08-05) — 제거가 맞다.
  //  이 규격이 원하는 건 심볼이 아니라 '주제의 실물' 하나뿐이다.
  ok(!/lettering-free symbol/i.test(p), "★심볼 허용 문구가 제거됨(집 아이콘을 부른 원인)");
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
  ok(/Never an abstract form/.test(ts), "★추상 조형 금지");
  ok(!/employee ID badge/.test(ts), "★사원증 예시가 제거됨(모델이 베껴서 엉뚱한 글에 붙었다)");
}

// ── ③-2 예시 복사·빈 사각형 차단(2026-08-02 실측 사고) ────────────────
//  건강보험료 글에 '사원증 + 공사장 크레인'이 나왔다. 그건 내가 프롬프트에 적어둔 예시 문장이었다.
//  ★모델은 예시를 주면 베낀다. 그리고 사원증·카드류는 글자를 빼면 빈 사각형이 된다(고지서와 같은 병).
{
  const ts = fs.readFileSync(new URL("../lib/thumbSubject.ts", import.meta.url), "utf-8");
  ok(!/employee ID badge on a lanyard or a hard hat/.test(ts), "★소재 예시가 프롬프트에서 제거됨(베끼기 방지)");
  ok(!/a factory skyline, cranes, an office tower, an apartment block/.test(ts), "★배경 예시도 제거됨");
  ok(/Derive it from the title itself/.test(ts), "제목에서 직접 도출하라고 지시");
  ok(/Never a card, badge, ID, certificate/.test(ts), "★카드·증서류 금지(글자 빼면 빈 판)");
  ok(/blank slab/.test(ts), "빈 판이 되는 이유를 명시");

  const RE_FLAT = /\b(cards?|badges?|IDs?|identification|certificates?|tickets?|envelopes?|passes?|placards?|panels?|plaques?)\b/i;
  const RE_ABS = /\b(cube|box|panel|drapery|curtain|light beams?|glow(ing)? (rectangle|shape|form))\b/i;
  for (const t of ["a glowing employee ID badge on a lanyard", "a glass cube", "a curtain over a window"])
    ok(RE_FLAT.test(t) || RE_ABS.test(t), "★빈 사각형·추상 조형 차단", t);
  for (const t of ["a stethoscope coiled on a desk", "a hospital reception bell", "a pill organizer"])
    ok(!RE_FLAT.test(t) && !RE_ABS.test(t), "멀쩡한 소재는 통과", t);
  for (const g of SUBJECT_GRAMMAR)
    ok(!RE_FLAT.test(g.subject) && !RE_ABS.test(g.subject), `[${g.betType}] 폴백도 빈 사각형이 아님`);
}

// ── ④ 주조색이 글마다 갈리는가 ────────────────────────────────────────
//  ★유저: "늘 같은 색이 나오면 안 돼요." 종전엔 계정 좌석에 묶여 한 블로그는 늘 한 색이었다.
//  ★2026-08-05 규격 교체로 네온 → 토스 팔레트가 됐다. 색을 읽는 자리도 함께 옮긴다.
//   (이 자리를 안 옮겨서 '1종'으로 오탐이 났다 — 규칙을 바꾸면 그걸 재는 자도 같이 바꿔야 한다.)
{
  const glow = (t, u = "u1", v = 0) => /#([0-9a-f]{6})/i.exec(buildTextlessThumbPrompt("", u, v, "x", t))?.[1];
  const 제목들 = ["에어컨 전기요금", "새만금 채용", "30대 평균 저축액", "숨은 보험금", "연금저축 비교", "실업급여 신청", "건보료 정산"];
  ok(new Set(제목들.map((t) => glow(t))).size >= 4, "★한 계정 안에서도 글마다 색이 갈린다", `현재 ${new Set(제목들.map((t) => glow(t))).size}종`);
  ok(new Set(["u1", "u2", "u3"].map((u) => glow("에어컨 전기요금", u))).size >= 2, "★같은 글이라도 계정이 다르면 색이 갈린다");
  ok(glow("에어컨 전기요금") === glow("에어컨 전기요금"), "같은 입력은 재현된다");
  ok(PHOTO_PRESETS.length === 7, `프리셋 7석 유지 (현재 ${PHOTO_PRESETS.length})`);
  ok(photoPresetFor("blog-x").seat === photoPresetFor("blog-x").seat, "좌석 배정 자체는 계정 고정");
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
  // ★2026-08-02 완화: 게이트를 겹겹이 쌓아 AI가 아예 못 만드는 상태가 됐다(유저 지적).
  //  실제로 막는 건 '피사체 하나'와 '작게 줄여도 보임' 둘뿐이다.
  ok(legibilityFromRaw('{"nameableInOneWord":false}').ok === true, "★한 단어로 못 대도 통과(반려 사유에서 제외)");
  const ct2 = fs.readFileSync(new URL("../lib/composeThumbnail.ts", import.meta.url), "utf-8");
  ok(/attempt < 3/.test(ct2), "★재시도 3회(2회로는 자주 전멸했다)");

  const ct = fs.readFileSync(new URL("../lib/composeThumbnail.ts", import.meta.url), "utf-8");
  ok(/manualShotBrief/.test(ct), "★AI 2회 실패 시 촬영 주문서로 전환");
  ok(/strict: true/.test(ct), "무문구도 글자 검사는 fail-closed");
  ok(/picked\?\.ko/.test(ct), "★주문서에 한국어 소재가 전달된다");
}


// ★2026-08-05 유저 화면에서 잡은 두 결함 — 규격은 맞는데 '무엇을 그릴지'가 틀렸다.
//  실물: '양평역 한라비발디 2단지 무순위 청약' 글에 손바닥 위 동전이 나왔고, 맨 위에 집 아이콘이 떴다.
{
  const src = fs.readFileSync(new URL("../lib/thumbSubject.ts", import.meta.url), "utf-8");
  const p2 = buildTextlessThumbPrompt("", "u1", 0, "Halla Vivaldi apartment complex", "양평역 한라비발디 2단지 무순위");
  // ① 장식 아이콘 — 내 프롬프트가 '집 윤곽 같은 심볼은 괜찮다'고 적어 둬서 모델이 얹었다
  ok(!/house outline\) is allowed/i.test(p2), "★'심볼 허용' 문구가 제거됨(집 아이콘을 부른 원인)");
  ok(/no floating icons, no badges, no small symbols/i.test(p2), "★장식 아이콘을 명시적으로 막는다");
  ok(!/a house outline for housing/.test(src), "★소재 고르는 쪽에서도 아이콘 폴백을 뺐다");
  ok(/do not fall back to a generic icon or symbol/.test(src), "실물을 요구한다");

  // ② 소재 — 제목에 고유명사가 있으면 그게 주제다
  ok(/If the title contains a proper noun/.test(src), "★고유명사가 있으면 그것이 소재");
  ok(/not coins or a hand/.test(src), "실패 사례가 프롬프트에 박혀 있다");
  ok(/Buildings, places and structures are valid subjects/.test(src), "★건물·장소도 소재가 된다(작은 소품만 고르던 편향)");
  ok(/If the topic has no physical object/.test(src), "★실물 없는 절차형은 '장소'로 답하게 한다");
  ok(/brochures\?\|pamphlets\?/.test(src), "★팜플렛·도면도 금지(종이는 글자가 본질)");

  // ③ 배경 실루엣 요청 제거 — 단색 방사 배경과 충돌한다
  ok(!/glowing night silhouette/.test(src), "★야경 실루엣 요청이 빠졌다(새 배경 규격과 충돌)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 무문구 썸네일(유저 지급 CTR 규격)");
process.exit(fail ? 1 : 0);
