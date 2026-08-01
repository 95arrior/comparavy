import { SUBJECT_GRAMMAR, PHOTO_PRESETS, DEVICE_STAGING, SCALE_RULE, isSceneSubject, deviceFromTitle, grammarFor, photoPresetFor, buildTextlessThumbPrompt, manualShotBrief } from "../lib/thumbSubject.ts";
import { legibilityFromRaw } from "../lib/imageVerify.ts";
import fs from "node:fs";

// ★무문구 썸네일 회귀(2026-08-02 유저: "이건 문이에요, 우리 글을 여는 문. 완벽하지 않으면 안 들어와요").
//  이 테스트가 지키는 것:
//   ① 글자가 본질인 소재가 다시 기어들어오지 않는가(고지서·영수증·통장 — 설계 중 걸러낸 함정)
//   ② 프롬프트가 글자 금지·단일 피사체·축소 생존을 실제로 말하는가
//   ③ 7석이 서로 충분히 다른가(무문구가 되면 팔레트가 아니라 사진 톤이 유일한 구분선이다)
//   ④ 판독성 검사가 fail-open인가(글자 검사와 달리 여기서 막으면 썸네일이 아예 없어진다)
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 글자가 본질인 소재 금지 ──────────────────────────────────────────
//  설계 초안에 고지서·영수증·통장을 넣었다가 걷어냈다 — 이미지 모델이 그리면 반드시
//  텅 빈 판이 되거나 가짜 글자가 박힌다(articlePrompt [금지 1]과 같은 이유).
const 금지소재 = /receipt|invoice|bill|bankbook|passbook|document|paper.*writing|sign(board)?|label|screen|display|calendar|newspaper/i;
for (const g of SUBJECT_GRAMMAR) {
  ok(!금지소재.test(g.subject), `[${g.betType}] 글자가 본질인 소재 아님`, g.subject.slice(0, 48));
  // 동전이 들어간 소재는 반드시 방향을 지정해야 한다(안 하면 앞면이 나와 글자로 잡힌다)
  if (/coin/i.test(g.subject)) ok(/rim|from the side|edge/i.test(g.subject), `[${g.betType}] 동전 방향 지정됨`, g.subject.slice(0, 52));
  // ★폴백 소재에도 수량·스케일 표현이 있어야 한다 — '그냥 놓인 지갑'이 실측으로 죽었다
  ok(/tower|stack|pile|piles|overflow|spill|scatter|shatter|emptied|bundle|left|towering|far past/i.test(g.subject),
     `[${g.betType}] 폴백 소재에 스케일이 있다`, g.subject.slice(0, 56));
}
ok(SUBJECT_GRAMMAR.length === 8, `홈판 8유형 전부 커버 (현재 ${SUBJECT_GRAMMAR.length})`);
ok(new Set(SUBJECT_GRAMMAR.map((g) => g.subject)).size === 8, "★8유형의 소재가 서로 다름(같으면 유형 구분이 죽는다)");

// 모르는 유형이 와도 죽지 않는다
ok(grammarFor("없는유형").subject.length > 0, "미등록 유형은 폴백 소재로");

// ── ② 프롬프트가 실제로 말하는가 ───────────────────────────────────────
{
  const p = buildTextlessThumbPrompt("계산 충격", "user-a");
  ok(/NO TEXT/i.test(p), "★글자 금지가 프롬프트에 명시");
  ok(/no Korean characters/i.test(p), "한글 금지 명시(실측 사고가 한글 '은행'이었다)");
  ok(/one focal point/i.test(p), "★단일 피사체 요구");
  ok(/60%/.test(p), "★피사체가 화면 60% 이상(축소 생존)");
  ok(/thumbnail/i.test(p) && /shrunk/i.test(p), "작게 줄여도 읽히게 요구");
  ok(/impossible to scroll past/i.test(p), "★스크롤 못 지나가게 — 어그로 지시가 있다");
  ok(/bold scale|strong contrast|dramatic angle/i.test(p), "★과장은 구도·스케일로 만든다");
  // ★2026-08-02 실측: 첫 줄이 "Editorial still-life photograph"이라 판독성 검사가 2회 다 '광고처럼 보인다'로 반려했다.
  //  상업 사진 장르 어휘를 앞에 두면 뒤에서 아무리 부정해도 소용없다 — 그 어휘가 다시 들어오는지 검사한다.
  ok(!/editorial|still-life/i.test(p.split("\n")[0]), "★첫 줄에 상업 사진 장르 어휘가 없다");
  ok(/snapshot|phone/i.test(p), "★스냅 사진 장르로 지정(진짜 같은 사진이 이긴다)");
  ok(/Staging:/.test(p), "★device별 어그로 연출이 주입된다");
  ok(/Silhouette:/.test(p), "★실루엣 관문이 프롬프트에 있다(평면 사물 금지)");
  // ★장면(장소·현장)도 소재가 된다(2026-08-02 유저: "새만금 드넓은 벌판·공장") — 사물 강제가 과했다
  {
    ok(isSceneSubject('a vast empty development field at dusk'), '벌판=장면으로 판별');
    ok(isSceneSubject('a car assembly plant skyline'), '공장=장면으로 판별');
    ok(!isSceneSubject('a tall tower of stacked coins'), '동전 탑=사물로 판별');
    const sc = buildTextlessThumbPrompt('계산 충격', 'u2', 0, 'a vast empty development field at dusk');
    ok(!/A single human hand may enter/.test(sc), '★장면엔 손 지시가 안 붙는다');
    ok(/wide sweeping view or a dramatic low angle/.test(sc), '★장면은 규모 구도로 찍는다');
    const ob = buildTextlessThumbPrompt('계산 충격', 'u2', 0, 'a tall tower of stacked coins');
    ok(!/wide sweeping view/.test(ob), '사물엔 규모 구도 지시가 안 붙는다');
  }
  // ★2026-08-02 유저 실측: 동전 탑="너무 좋다", 빈 지갑="손이 안 간다". 차이는 소재가 아니라 스케일이었다.
  ok(/stop a thumb mid-scroll/.test(p), "★스크롤을 멈추게 하는 게 의무로 걸린다");
  ok(/nothing happening is a failure/i.test(p), "★아무 일도 안 일어나는 그림은 실패로 명시");
  // ★2026-08-02 실측 2차: 광고 톤을 고쳤더니 글자 검출에 걸렸다 — 동전 앞면의 숫자(100·500)가 원인.
  ok(/only the smooth edge is visible|Never show the face of a coin/i.test(p), "★동전은 모서리만 보이게(앞면 숫자=글자)");
  ok(/no smiling models|no face/i.test(p), "얼굴 금지");
  ok(!/text overlay|caption|headline/i.test(p), "조판 관련 지시가 섞여 있지 않다(무문구다)");
}

// ── ③ 7석이 서로 다른가 ────────────────────────────────────────────────
{
  ok(PHOTO_PRESETS.length === 7, `사진 프리셋 7석 (현재 ${PHOTO_PRESETS.length})`);
  ok(new Set(PHOTO_PRESETS.map((p) => p.tone)).size === 7, "★7석의 촬영 톤이 전부 다름");
  const angles = new Set(PHOTO_PRESETS.map((p) => p.angle));
  ok(angles.size >= 4, `카메라 각도가 4종 이상 (현재 ${angles.size})`);
  ok(new Set(PHOTO_PRESETS.map((p) => p.backdrop)).size === 7, "배경 처리가 전부 다름");
  // ★손 포함은 소수여야 한다 — AI가 가장 잘 망가뜨리는 게 손가락이다
  const hands = PHOTO_PRESETS.filter((p) => p.hands).length;
  ok(hands <= 2, `손 포함은 2석 이하 (현재 ${hands}석 — AI 손가락 붕괴 위험)`);

  // 같은 계정은 항상 같은 스타일(블로그 내 일관성), 프롬프트도 계정마다 갈린다
  ok(photoPresetFor("blog-x").seat === photoPresetFor("blog-x").seat, "같은 계정은 항상 같은 사진 프리셋");
  process.env.ATEFLO_PHOTO_ASSIGN = "blog-1:5,blog-2:2";
  ok(photoPresetFor("blog-1").seat === 5, "★환경변수 1:1 배정이 해시를 이긴다(7명 운영 시 충돌 0)");
  delete process.env.ATEFLO_PHOTO_ASSIGN;

  // ★해시 배정만으로는 7석이 안 갈린다 — 7명을 7석에 해시로 넣으면 최소 1쌍 충돌 확률이 99.4%다
  //  (1 - 7!/7^7). 무문구에선 사진 톤이 유일한 구분선이라 충돌이 곧 '같은 블로그로 보임'이다.
  //  그래서 환경변수 1:1 배정이 선택이 아니라 필수다 — 그 경로가 실제로 7석을 전부 갈라내는지 검사한다.
  {
    const ids = ["u1", "u2", "u3", "u4", "u5", "u6", "u7"];
    process.env.ATEFLO_PHOTO_ASSIGN = ids.map((id, i) => `${id}:${i}`).join(",");
    const seats = ids.map((id) => photoPresetFor(id).seat);
    ok(new Set(seats).size === 7, "★환경변수 배정이면 7석이 전부 다르다(충돌 0)");
    const prompts = ids.map((id) => buildTextlessThumbPrompt("계산 충격", id));
    ok(new Set(prompts).size === 7, "★같은 유형이라도 7명의 프롬프트가 전부 다르다");
    delete process.env.ATEFLO_PHOTO_ASSIGN;
  }
}

// ── ③-2 제목에서 뽑은 소재가 유형 폴백을 이긴다 ────────────────────────
//  ★유형 고정 소재는 제목과 무관한 그림을 만든다 — "에어컨 전기요금" 글에 동전 탑이 붙던 실측 문제.
{
  const 폴백 = buildTextlessThumbPrompt("계산 충격", "u1");
  const 제목소재 = buildTextlessThumbPrompt("계산 충격", "u1", 0, "an air conditioner outdoor unit covered in dust");
  ok(/tower of stacked coins/.test(폴백), "소재 미지정이면 유형 폴백을 쓴다");
  ok(/air conditioner outdoor unit/.test(제목소재), "★제목에서 뽑은 소재가 주입된다");
  ok(!/tower of stacked coins/.test(제목소재), "★주입되면 폴백 소재는 안 쓴다");
  ok(SCALE_RULE.includes("mid-scroll") && Object.keys(DEVICE_STAGING).length === 7, `연출 7종(대비·발견·압도·반전·시간·정황·번역) (현재 ${Object.keys(DEVICE_STAGING).length})`);
}

// ── ③-3 소재 필터는 단어 경계가 있어야 한다 ────────────────────────────
//  ★실측(2026-08-02): 경계 없이 쓴 정규식이 de(sign)·(paper)clip을 걸러 멀쩡한 소재를 버렸고,
//   그래서 에어컨 글에도 폴백 동전 탑이 나왔다. 필터가 과하면 제목 연관이 통째로 죽는다.
{
  const src = fs.readFileSync(new URL("../lib/thumbSubject.ts", import.meta.url), "utf-8");
  const m = /if \((\/\\b\(receipts.+?\/i)\.test\(sub\)\) return null;/.exec(src);
  ok(Boolean(m), "소재 필터 정규식을 소스에서 읽음");
  if (m) {
    const RE = new RegExp(m[1].replace(/^\//, "").replace(/\/i$/, ""), "i");
    for (const t of ["an air conditioner outdoor unit covered in dust", "a designer wallet on a desk", "a paperclip holder"])
      ok(!RE.test(t), "★멀쩡한 소재는 통과", t);
    for (const t of ["a stack of receipts", "an electricity bill on a table", "a phone screen showing numbers", "a wall calendar", "a notebook computer closed"])
      ok(RE.test(t), "글자 물건은 차단", t);
  }
}

// ── ③-4 연출이 글마다 갈린다 ───────────────────────────────────────────
//  ★실측(2026-08-02): 모든 썸네일이 탑이 됐다. betType이 썸네일 시트까지 안 넘어가
//   전부 기본값('계산 충격'=압도=쌓기)으로 떨어졌기 때문이다 — 안전모 탑이 거실에 놓였다.
//   DB 배선 대신 제목 신호로 고른다. 이 테스트가 '전부 같은 연출'로 되돌아가는 걸 막는다.
{
  const 케이스 = [
    ["근로장려금 신청 마감 8월 31일까지", "시간"],
    ["무이자 할부가 오히려 더 비쌀 수 있는 이유", "반전"],
    ["연금저축 vs IRP 어느 쪽이 유리한가", "대비"],
    ["안 찾아간 숨은 돈 조회하세요", "발견"],
    ["30대 평균 저축액 통계", "압도"],
    ["실업급여 신청 방법과 순서", "정황"],
  ];
  for (const [t, want] of 케이스) ok(deviceFromTitle(t) === want, `제목→연출 ${want}`, t.slice(0, 24));
  ok(new Set(케이스.map(([t]) => deviceFromTitle(t))).size === 6, "★여섯 글이 여섯 연출로 갈린다(전부 탑이 되지 않는다)");

  // 유형이 안 넘어오는 수동 경로에서도 제목이 연출을 정한다
  const 마감 = buildTextlessThumbPrompt("", "u1", 0, "safety helmets", "채용 마감 임박");
  const 평균 = buildTextlessThumbPrompt("", "u1", 0, "coins", "30대 평균 저축액");
  ok(!/precarious tower|Lined up in endless rows/.test(마감), "★마감 글은 압도 연출이 아니다");
  ok(/tower|rows|wall to wall|densely|overwhelming/i.test(평균), "평균 글은 압도 계열 연출");
  
  ok(/where it actually belongs in real life/.test(평균), "★장소는 소재가 정한다(안전모는 현장, 동전은 책상)");
}

// ── ③-5 경우의 수 ─────────────────────────────────────────────────────
//  ★유저: "모든 글감이 다 비슷할까봐 걱정. 경우의 수를 무궁무진하게. 아직 타이트하다."
//   종전엔 톤·각도·배경이 전부 계정 프리셋에 묶여 글당 3가지뿐이었다.
//   계정 지문으로 남길 것은 '빛(톤)' 하나면 충분하다 — 나머지는 글별로 돌린다.
{
  const 제목들 = ["새만금 일자리박람회 채용", "8월 건보료 정산", "30대 평균 저축액", "안 찾아간 숨은 보험금", "연금저축 vs IRP 비교", "전기요금 할인 신청 방법"];
  const key = (t, v) => {
    const p2 = buildTextlessThumbPrompt("", "u1", v, null, t);
    return ["Staging", "Camera", "Lighting"].map((k) => p2.split("\n").find((l) => l.startsWith(k))).join("|");
  };
  const combos = new Set(제목들.map((t) => key(t, 0)));
  ok(combos.size === 제목들.length, "★여섯 글이 여섯 조합으로 갈린다", `현재 ${combos.size}/6`);

  const retries = new Set([0, 1, 2].map((v) => key("30대 평균 저축액", v)));
  ok(retries.size === 3, "★같은 글 재시도도 매번 다른 조합", `현재 ${retries.size}/3`);

  const total = Object.values(DEVICE_STAGING).reduce((a, b) => a + b.length, 0);
  ok(total >= 25, "연출 형태 25종 이상", `현재 ${total}`);

  // ★연출이 화각을 정하면 카메라 축이 모순되면 안 된다(실측: "wide view"인데 "extreme macro"가 같이 나갔다)
  const wide = buildTextlessThumbPrompt("", "u1", 0, null, "새만금 일자리박람회 채용");
  ok(!/A wide view[\s\S]*extreme macro/.test(wide), "★연출과 카메라가 모순되지 않는다");
}

// ── ④ 판독성 검사는 fail-open ─────────────────────────────────────────
{
  ok(legibilityFromRaw("완전 쓰레기").ok, "★파싱 실패면 통과(fail-open — 막으면 썸네일이 아예 없어진다)");
  ok(legibilityFromRaw('{"singleSubject":false}').ok === false, "피사체 여러 개면 불합격");
  ok(legibilityFromRaw('{"identifiableWhenTiny":false}').ok === false, "작게 줄여 안 보이면 불합격");
  // ★2026-08-02 유저 확정("어그로, 무조건 클릭") — adLike는 관측만 하고 반려하지 않는다.
  //  이 판정이 이미지를 얌전하게 만들어 클릭률을 깎고 있었다(실측: 1차 시도가 이것 때문에 2회 반려).
  ok(legibilityFromRaw('{"looksLikeAd":true}').ok === true, "★광고처럼 보여도 통과(어그로 우선 — 반려하지 않는다)");
  ok(legibilityFromRaw('{"looksLikeAd":true}').adLike === true, "다만 관측은 유지(나중에 판단 근거로)");
  ok(legibilityFromRaw('{"nameableInOneWord":false}').ok === false, "★한 단어로 이름을 못 대면 불합격(명함 더미=종이 뭉치)");
  ok(legibilityFromRaw('{"singleSubject":true,"identifiableWhenTiny":true,"looksLikeAd":false,"nameableInOneWord":true}').ok, "전부 통과면 합격");
}

// ── ⑤ AI 실패 시 촬영 주문서 ───────────────────────────────────────────
{
  const brief = manualShotBrief("돈 격차 자극", "user-a");
  ok(/지폐/.test(brief), "주문서가 한국어 소재로 번역돼 있다");
  ok(/글자가 보이면 안 됩니다/.test(brief), "★주문서에도 글자 금지가 있다");
  ok(/60%/.test(brief), "주문서에도 축소 생존 기준이 있다");
  ok(/비정상/.test(brief), "★주문서에도 스케일 과장 기준이 있다");

  const ct = fs.readFileSync(new URL("../lib/composeThumbnail.ts", import.meta.url), "utf-8");
  ok(/textless/.test(ct), "★무문구 경로가 배선됨");
  ok(/manualShotBrief/.test(ct), "★AI 2회 실패 시 촬영 주문서로 전환(유저 확정 운영 방식)");
  ok(/strict: true/.test(ct), "무문구 경로도 글자 검사는 fail-closed");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 무문구 썸네일");
process.exit(fail ? 1 : 0);
