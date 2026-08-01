// ★무문구 썸네일 설계(2026-08-02 유저 확정: "이건 문이에요, 우리 글을 여는 문").
//
//  왜 무문구인가 — 근거 셋:
//   ① PTRP 실측(유튜브 16,215편, 2026-07-17 반영): 썸네일 '이미지'의 강한 감정은 조회를 올리지만
//      '텍스트'에 실은 강한 감정은 정반대로 낮춘다. 우리는 텍스트 조판 카드라 불리한 쪽에 서 있었다.
//   ② 홈피드엔 개인 블로그 글이 섞여 흐른다 — 조판된 카드는 광고 신호가 되고, 사람은 광고를 0.2초에 거른다.
//   ③ 카드는 이미지+제목 세트다. 이미지에 또 글자를 넣으면 같은 자리를 두 번 쓰는 것이고,
//      '썸네일=질문, 제목=답'(2026-07-17 확정) 원칙을 무문구가 더 깨끗하게 실현한다.
//
//  ★그리고 "AI 이미지에 글자 절대 금지"(유저 4회 지적, 예외 조항 금지)의 완성형이다.
//
//  ★★설계 중 걸러낸 함정: 처음 소재 후보로 고지서·영수증·통장을 뒀는데 전부 실격이다.
//   글자가 본질인 물건이라 이미지 모델이 그리면 반드시 '텅 빈 판'이 되거나 가짜 글자가 박힌다
//   (articlePrompt의 [금지 1]과 같은 이유). 아래 소재는 전부 '글자가 없어도 성립하는 물건'만 남긴 것이다.

/** 홈판 유형 → 썸네일 문법. subject는 이미지 모델에 그대로 넘기는 영어 소재다. */
export interface SubjectGrammar {
  /** 홈판 배팅 유형 키(BET_TYPES와 1:1) */
  betType: string;
  /** 구도가 만드는 감정 — 글자 없이 긴장을 만드는 유일한 수단 */
  device: "대비" | "발견" | "압도" | "반전" | "시간" | "정황" | "번역";
  /** ★폴백 소재(2026-08-02 개정) — 제목에서 소재를 못 뽑았을 때만 쓴다.
   *  주 경로는 제목·키워드에서 뽑는다(subjectFromTitle) — 유형 고정 소재는 제목과 무관한 그림을 만든다:
   *  "에어컨 하루 10시간, 8월 전기요금" 글에 동전 탑이 붙는 게 실측된 문제였고, 같은 유형이면 매번 같은 그림이라
   *  중복까지 났다. 유형은 이제 '구도와 감정'(device)만 정하고, '무엇을 찍나'는 그 글이 정한다. */
  subject: string;
}

// ★소재 선정 기준: (1)글자가 없어도 성립 (2)피사체 1개(대비형은 같은 사물 2개) (3)AI가 잘 그리는 것
//  — 사람 전신·복잡한 실내·서류 내용은 뺐다(AI 티가 가장 심하게 나는 3종).
export const SUBJECT_GRAMMAR: SubjectGrammar[] = [
  { betType: "평균 위치확인", device: "대비", subject: "two stacks of coins side by side seen from the side, one clearly taller, only the rims visible" },
  { betType: "몰라서 못 받는 돈", device: "발견", subject: "a fabric drawstring pouch overflowing so much it cannot close, half pulled from the back of a drawer" },
  { betType: "계산 충격", device: "압도", subject: "a tall precarious tower of stacked coins seen from the side, only the rims visible, extreme close-up" },
  { betType: "통념 파괴", device: "반전", subject: "a shattered ceramic piggy bank with its contents scattered wide across the table" },
  { betType: "손해 공포 마감", device: "시간", subject: "a wide scatter of coins seen from the side with only two left standing on their rims, the rest already swept away" },
  { betType: "인생 이벤트 돈 타임라인", device: "정황", subject: "a completely emptied desk drawer with only one key left in the corner" },
  { betType: "시장 급변 번역", device: "번역", subject: "a shopping basket overflowing far past its rim, shot so close it fills the frame" },
  { betType: "돈 격차 자극", device: "대비", subject: "two piles of banknotes face-down side by side, one thick tall pile and one with two notes left" },
];

const FALLBACK_SUBJECT = "a small stack of coins seen from the side on a plain surface, only the rims visible";

/** ★device별 연출(2026-08-02 유저 확정: "그냥 딱 어그로, 씹 어그로, 무조건 클릭").
 *  차분한 스냅으로 몰아놨던 걸 되돌린다 — 홈피드에서 지는 건 못생긴 사진이 아니라 '안 보이는 사진'이다.
 *  단 과장은 구도·스케일로만 만든다. 채도를 올리거나 없는 물건을 지어내는 건 여전히 금지. */
export const DEVICE_STAGING: Record<SubjectGrammar["device"], string> = {
  대비: "Two piles of the SAME object with an absurd quantity gap — one towering, one down to a couple of pieces. The gap must be visible in half a second.",
  발견: "A huge quantity is hidden and only a small part spills into view, implying much more behind. Make the viewer want to pull the rest out.",
  압도: "One object stacked or piled far beyond anything normal — towering, precarious, filling the frame top to bottom. Shot from a low angle so it looms over the viewer.",
  반전: "A large quantity in a state it should never be in — toppled, spilled everywhere, broken open. The mess itself is the shock.",
  시간: "Almost everything is gone and only the last one or two remain, with the empty space where the rest used to be clearly visible.",
  정황: "The aftermath, made extreme — either an abnormally large amount left behind, or a space so completely emptied that the absence is loud.",
  번역: "An ordinary everyday object shot so close and so large that it fills the entire frame and feels confrontational.",
};

/** ★모든 연출에 공통으로 거는 규칙(2026-08-02 유저 피드백) — 이게 '동전 탑 풍'의 정체다.
 *  실측: 동전 탑은 "너무 좋다", 빈 지갑 두 장은 "손이 안 간다"였다. 차이는 소재가 아니라 스케일이었다.
 *  탑은 화면을 뚫고 올라가고 세어보고 싶어지는데, 지갑은 그냥 놓여 있다. 조용하면 스크롤된다. */
export const SCALE_RULE = "★The quantity or scale must feel ABNORMAL — far more, far taller, or far emptier than could ever be normal. A single object simply placed on a table is a failure. If the viewer would not react with 'whoa, that much?', it is wrong.";

export function grammarFor(betType: string): SubjectGrammar {
  return SUBJECT_GRAMMAR.find((g) => g.betType === betType)
    ?? { betType, device: "정황", subject: FALLBACK_SUBJECT };
}

/* ── 사진 프리셋 7석 ────────────────────────────────────────────────────
   무문구가 되면 레이아웃·폰트 축이 무의미해진다(조판이 없다). 그래서 '사진 축'으로 갈아탄다.
   ★같은 고지서를 찍어도 톤·구도·거리가 다르면 아예 다른 사람이 찍은 것처럼 보인다 —
    지금까지의 팔레트 회전보다 훨씬 크게 갈린다(팔레트는 색만 달랐고 구조가 같았다).
   7석은 서로 최대한 멀게 배치했다: 톤 7종 전부 다름, 구도 4종을 고르게, 손 포함은 2석만. */
export interface PhotoPreset {
  seat: number;
  /** 촬영 톤 */
  tone: string;
  /** 카메라 각도 */
  angle: string;
  /** 배경 처리 */
  backdrop: string;
  /** 손이 프레임에 들어가는가 — 사물만인 쪽이 AI 티가 덜 난다(손가락이 가장 잘 망가진다) */
  hands: boolean;
}

export const PHOTO_PRESETS: PhotoPreset[] = [
  { seat: 0, tone: "desaturated minimal, cool neutral grays", angle: "straight overhead flat lay", backdrop: "plain matte tabletop, nothing else on it", hands: false },
  { seat: 1, tone: "warm natural daylight, soft film grain", angle: "45-degree three-quarter view", backdrop: "worn wooden desk surface", hands: true },
  { seat: 2, tone: "bright morning light coming through a window", angle: "straight-on eye level", backdrop: "plain bright wall", hands: false },
  { seat: 3, tone: "soft overcast diffused light", angle: "extreme macro close-up", backdrop: "blurred indoor depth of field", hands: false },
  { seat: 4, tone: "warm amber evening light, long shadows", angle: "45-degree three-quarter view", backdrop: "dark wooden surface", hands: true },
  { seat: 5, tone: "calm blue-hour cool light", angle: "straight overhead flat lay", backdrop: "dark matte table surface, nothing else on it", hands: false },
  { seat: 6, tone: "soft window light from the side", angle: "straight-on eye level", backdrop: "textured linen cloth", hands: false },
];

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** 환경변수 1:1 고정 배정("userId:0,userId2:3") — 7명 운영 시 이걸로 못 박으면 충돌 0. */
function seatFromEnv(userId: string): number | null {
  const raw = process.env.ATEFLO_PHOTO_ASSIGN;
  if (!raw) return null;
  for (const pair of raw.split(",")) {
    const [id, seat] = pair.split(":").map((x) => x.trim());
    if (id === userId && seat !== undefined) {
      const n = Number(seat);
      if (Number.isInteger(n) && n >= 0 && n < PHOTO_PRESETS.length) return n;
    }
  }
  return null;
}

/** 이 계정의 사진 스타일. 같은 userId는 항상 같은 프리셋(블로그 내 일관성). */
export function photoPresetFor(userId: string): PhotoPreset {
  const seat = seatFromEnv(userId) ?? fnv1a(`${userId}|photo`) % PHOTO_PRESETS.length;
  return PHOTO_PRESETS[seat]!;
}

/**
 * 무문구 썸네일 프롬프트(영어) — 이미지 모델에 그대로 넘긴다.
 * ★글자 금지를 프롬프트에서도 세 번 말한다. 코드 게이트(verifyImage)가 최종 방어지만,
 *  생성 단계에서 줄여야 재시도 비용이 안 든다(실측: 글자 검출 탈락이 썸네일 실패의 최대 원인이었다).
 */
export function buildTextlessThumbPrompt(betType: string, userId: string, variant = 0, subjectOverride?: string | null): string {
  const g = grammarFor(betType);
  const p = photoPresetFor(userId);
  const subject = (subjectOverride ?? "").trim() || g.subject; // ★제목에서 뽑은 소재 우선
  const poses = ["centered in frame", "slightly off-center to the left", "slightly off-center to the right"];
  return [
    // ★2026-08-02 실측 수정: 첫 줄이 "Editorial still-life photograph"이었는데 그게 곧 상업 사진 장르라
    //  뒤에서 "NOT an advertisement"라고 말해도 소용이 없었다(판독성 검사가 2회 다 '광고처럼 보인다'로 반려).
    //  장르 자체를 '집에서 대충 찍은 스냅'으로 바꾼다 — 홈피드에서 이기는 건 잘 찍은 사진이 아니라 진짜 같은 사진이다.
    `An unstaged everyday snapshot, as if someone quickly photographed this at home with a phone. Square 1:1.`,
    `Subject: ${subject}. ${p.hands ? "A single human hand may enter the frame, fingers partially visible, no face." : "Objects only, no people."}`,
    `Lighting and tone: ${p.tone}.`,
    `Camera: ${p.angle}, ${poses[variant % poses.length]}.`,
    // ★어그로 연출 — 이 한 줄이 '스크롤을 멈추게 하는' 장치다(2026-08-02 유저 확정)
    `Staging: ${DEVICE_STAGING[g.device]}`,
    SCALE_RULE,
    `Setting: ${p.backdrop}. A real lived-in home or desk, not a studio.`,
    // ★축소 생존 — 홈피드 썸네일은 200~400px로 렌더된다. 명함보다 작다.
    `Composition: the subject fills at least 60% of the frame and reads clearly even when the image is shrunk to a thumbnail. Exactly one focal point. No clutter, no scattered props.`,
    // ★2026-08-02 실측: 명함 더미가 나왔고 종이 뭉치로만 보였다. 평면 사물은 쌓으면 실루엣이 같아진다.
    `Silhouette: the object must be recognizable from its outline alone at thumbnail size. Do not photograph flat paper-like things stacked into a featureless block.`,
    // ★광고 냄새 제거
    // ★2026-08-02 유저 확정으로 완화: 종전엔 "광고처럼 보이면 안 된다"를 강하게 걸었는데,
    //  그게 이미지를 얌전하게 만들어 클릭률을 깎았다. 홈피드에서 지는 건 못생긴 사진이 아니라 안 보이는 사진이다.
    //  '진짜 같은 사진'이라는 최소선만 남기고, 시선 강탈 쪽으로 연다.
    `Style: shot like a real person's photo, not a studio product shot — natural uneven light, real shadows, slightly imperfect framing. But make it impossible to scroll past: bold scale, strong contrast between the subject and the background, dramatic angle. No smiling models, no logos, no branding.`,
    // ★글자 금지 3중
    `ABSOLUTELY NO TEXT of any kind: no letters, no numbers, no Korean characters, no signage, no labels, no watermarks, no printed documents, no receipts, no screens showing text. Any surface that would normally carry writing must be blank or turned away from the camera.`,
    // ★2026-08-02 실측: 광고 톤을 고쳤더니 이번엔 글자 검출에 걸렸다. 원인은 동전이었다 —
    //  동전 앞면에는 숫자(100·500)와 글자가 새겨져 있어서, 접사로 찍으면 그게 그대로 '글자'다.
    //  소재를 버리지 않고 방향만 돌린다: 쌓거나 세워서 모서리만 보이게 하면 글자가 사라진다.
    `Coins: if any coin appears, it must be stacked or standing on its rim so that only the smooth edge is visible. Never show the face of a coin — coin faces carry engraved numbers and letters, which count as text.`,
  ].join("\n");
}

/** 유저가 직접 찍을 때 쓰는 한국어 주문서 — AI가 두 번 실패하면 이걸 보여준다.
 *  ★유형 키로 찾는다(2026-08-02): 종전엔 영어 소재 문자열을 키로 썼는데, 소재를 손볼 때마다
 *   번역이 조용히 안 맞았다(실측으로 회귀가 잡음). 소재는 계속 바뀌고 유형은 안 바뀐다. */
const MANUAL_KO: Record<string, string> = {
  "평균 위치확인": "동전을 두 더미로 쌓되 한쪽은 아주 높게, 다른 쪽은 두어 개만 남기고 (옆에서 찍어 앞면이 안 보이게)",
  "몰라서 못 받는 돈": "빈 봉투를 여러 장 겹쳐 천 밑에서 삐져나오게",
  "계산 충격": "동전을 아슬아슬할 만큼 높이 쌓아 올리고 아래에서 올려다보며 (옆면만 보이게)",
  "통념 파괴": "저금통을 깨거나 엎어서 내용물이 넓게 흩어진 상태로",
  "손해 공포 마감": "동전을 넓게 흩어놓고 딱 두 개만 세워 남기기 (나머지는 치운 티가 나게)",
  "인생 이벤트 돈 타임라인": "서랍을 완전히 비우고 열쇠 하나만 구석에",
  "시장 급변 번역": "장바구니가 넘치도록 채우고 아주 가까이서 화면 가득",
  "돈 격차 자극": "지폐를 뒷면으로 두 더미 쌓되 한쪽은 두툼하게, 한쪽은 두 장만",
};

export function manualShotBrief(betType: string, userId: string): string {
  const g = grammarFor(betType);
  const p = photoPresetFor(userId);
  return [
    `[대표컷 주문서] ${g.device}형`,
    `무엇을: ${MANUAL_KO[betType] ?? "동전을 높이 쌓아 옆에서 (앞면이 안 보이게)"}`,
    `어떻게: ${p.angle.includes("overhead") ? "위에서 수직으로" : p.angle.includes("macro") ? "아주 가까이 접사로" : p.angle.includes("45") ? "45도 비스듬히" : "정면 눈높이에서"}, ${p.hands ? "손이 살짝 들어가도 좋아요(얼굴은 금지)" : "사물만, 사람 없이"}`,
    `배경: ${p.backdrop.includes("wooden") ? "나무 책상" : p.backdrop.includes("linen") ? "천(리넨) 위" : p.backdrop.includes("wall") ? "밝은 벽 앞" : "단색 배경"}, 잡동사니 없이`,
    `★양이 '비정상'으로 보여야 해요 — 그냥 놓인 물건은 스크롤됩니다. 너무 많거나 너무 텅 비거나.`,
    `★피사체가 화면의 60% 이상을 채우게. 작게 줄여도 뭔지 알아볼 수 있어야 해요.`,
    `★글자가 보이면 안 됩니다 — 고지서·영수증·통장처럼 글자 있는 물건은 쓰지 마세요.`,
  ].join("\n");
}

/**
 * ★제목 → 썸네일 소재(2026-08-02 유저 확정: "제목과 연관있게").
 *  종전엔 소재가 홈판 유형 8종에 고정돼 있었다 — "에어컨 하루 10시간, 8월 전기요금" 글에 동전 탑이 붙었고,
 *  같은 유형이면 매번 같은 그림이라 중복까지 났다. 이제 그 글의 제목에서 뽑는다.
 *  ★실패하면 null → 호출측이 유형 폴백 소재를 쓴다(빈손이 엉뚱한 그림보다 낫다).
 */
export async function subjectFromTitle(title: string, betType: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const t = (title ?? "").trim();
  if (!apiKey || t.length < 2) return null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const g = grammarFor(betType);
    const res = await client.messages.create({
      model: "claude-haiku-4-5", max_tokens: 150,
      messages: [{ role: "user", content: [
        `A Korean personal-finance blog post has this title: "${t.slice(0, 80)}"`,
        `Pick ONE physical object to photograph for its thumbnail. The photo will use this staging: ${DEVICE_STAGING[g.device]}`,
        `Rules — all mandatory:`,
        `1. It must be a concrete object that makes the reader think of the title's topic within half a second. Money objects are ideal (coins, a piggy bank, a wallet, a jar of change), but if the topic is not about money itself, pick the object that most directly symbolizes it — a job fair means empty office chairs or hard hats, an apartment subscription means a door key or a scale model, an electricity bill means an air conditioner outdoor unit or a tangle of plugs.`,
        `1b. ★CRITICAL — the object must have a DISTINCT SILHOUETTE that survives being shrunk to 200px. Flat, thin, stackable-into-sameness objects are FORBIDDEN: business cards, brochures, flyers, leaflets, sheets of paper, files, folders, books, envelopes. When piled, all of those become an indistinguishable block of paper and the thumbnail says nothing. Choose something with a recognizable three-dimensional shape.`,
        `2. It must carry NO writing of any kind. Bills, receipts, documents, bankbooks, screens, signs, calendars, labeled packaging and coin faces are all FORBIDDEN — writing is their essence and the image will be rejected.`,
        `3. One object only (or two identical objects if the staging is a contrast).`,
        `4. It must be something an ordinary Korean household actually has.`,
        `5. It must still read clearly when the image is shrunk to a 200px thumbnail — no fine detail.`,
        `6. It must be something that can be piled, stacked, multiplied or emptied out, because the photo exaggerates quantity: ${SCALE_RULE}`,
        `Answer with JSON only: {"subject":"<short English noun phrase describing the object and how it is arranged>"}`,
      ].join("\n") }],
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]) as { subject?: string };
    const sub = (j.subject ?? "").trim();
    if (!sub || /[가-힣]/.test(sub)) return null;
    // ★단어 경계 필수(2026-08-02 실측): 경계 없이 썼다가 de(sign)·(paper)clip이 걸려
    //  멀쩡한 소재가 버려졌다 — 에어컨 글에도 폴백 동전 탑이 나온 원인이다.
    if (/\b(receipts?|invoices?|bills?|documents?|bankbooks?|passbooks?|screens?|displays?|signs?|signage|labels?|calendars?|newspapers?|books?|notes?|notebooks?|papers?)\b/i.test(sub)) return null;
    // ★평면 사물 차단(2026-08-02 실측): '새만금 일자리박람회' 글에 명함 더미가 나왔고 종이 뭉치로만 보였다.
    //  얇고 평평한 것은 쌓으면 실루엣이 전부 같아져 200px에서 무엇인지 사라진다 — 스케일 규칙과 최악의 조합이다.
    if (/\b(business\s*cards?|name\s*cards?|brochures?|flyers?|leaflets?|pamphlets?|sheets?|files?|folders?|envelopes?|stack of paper)\b/i.test(sub)) return null;
    return sub.slice(0, 120);
  } catch { return null; }
}
