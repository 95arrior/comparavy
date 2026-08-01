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
  { betType: "평균 위치확인", device: "대비", subject: "a small pile of coins on a table, shot from the side so the rims face the camera" },
  { betType: "몰라서 못 받는 돈", device: "발견", subject: "a hand pulling a small fabric pouch out of a drawer" },
  { betType: "계산 충격", device: "압도", subject: "a hand holding a few coins, close up" },
  { betType: "통념 파괴", device: "반전", subject: "a ceramic piggy bank on a desk" },
  { betType: "손해 공포 마감", device: "시간", subject: "an hourglass on a windowsill with the sand nearly run out" },
  { betType: "인생 이벤트 돈 타임라인", device: "정황", subject: "a house key on a wooden desk" },
  { betType: "시장 급변 번역", device: "번역", subject: "a shopping basket with groceries in a store aisle" },
  { betType: "돈 격차 자극", device: "대비", subject: "a leather wallet open on a table with a few folded notes inside, face down" },
];

const FALLBACK_SUBJECT = "a few coins and a piggy bank on a desk";

/** ★device별 연출(2026-08-02 유저 확정: "그냥 딱 어그로, 씹 어그로, 무조건 클릭").
 *  차분한 스냅으로 몰아놨던 걸 되돌린다 — 홈피드에서 지는 건 못생긴 사진이 아니라 '안 보이는 사진'이다.
 *  단 과장은 구도·스케일로만 만든다. 채도를 올리거나 없는 물건을 지어내는 건 여전히 금지. */
export const DEVICE_STAGING: Record<SubjectGrammar["device"], string[]> = {
  대비: [
    "Two piles of the same thing with an absurd quantity gap — one towering, one down to a couple of pieces.",
    "The same object twice, one worn to ruin and one untouched, side by side.",
    "One enormous version next to one tiny version of the same thing.",
    "A split frame: one half crammed full, the other half bare.",
  ],
  발견: [
    "A huge quantity mostly hidden, only a sliver spilling into view.",
    "Something pulled halfway out of a drawer, the rest still in shadow.",
    "A cover lifted just enough to reveal what is underneath.",
    "Seen through a narrow gap, as if you were not meant to see it.",
  ],
  압도: [
    "Stacked into a precarious tower shot from a low angle so it looms.",
    "Spread wall to wall across the floor until it runs out of frame.",
    "Lined up in endless rows receding into the distance.",
    "Packed so densely it fills every inch of the frame.",
    "One single object shot so close and huge it becomes overwhelming.",
  ],
  반전: [
    "Toppled and spilled everywhere, mid-collapse.",
    "Upside-down, in a position it could never be in normally.",
    "Broken open with the inside exposed.",
    "Something ordinary placed somewhere it absolutely does not belong.",
  ],
  시간: [
    "Almost everything gone, only the last one or two left, with the empty space where the rest was.",
    "Caught mid-fall, a fraction of a second before it hits.",
    "Half consumed, half still intact, the boundary sharp.",
    "The very last one, isolated in a vast empty frame.",
  ],
  정황: [
    "The aftermath — abandoned, still warm, nobody there.",
    "One thing left behind in a space that has been completely emptied.",
    "Traces of use everywhere but no person in sight.",
    "Packed up and ready to leave, nothing else remaining.",
  ],
  번역: [
    "Shot so close it fills the entire frame and feels confrontational.",
    "An extreme macro on the one detail that matters.",
    "A wide view where the ordinary thing dominates everything around it.",
    "From directly underneath, looking up, so it towers.",
  ],
};

/** ★모든 연출에 공통으로 거는 규칙(2026-08-02 유저 피드백) — 이게 '동전 탑 풍'의 정체다.
 *  실측: 동전 탑은 "너무 좋다", 빈 지갑 두 장은 "손이 안 간다"였다. 차이는 소재가 아니라 스케일이었다.
 *  탑은 화면을 뚫고 올라가고 세어보고 싶어지는데, 지갑은 그냥 놓여 있다. 조용하면 스크롤된다. */
export const SCALE_RULE = "★It must stop a thumb mid-scroll. Quantity is one way (far more or far emptier than normal) but not the only one — extreme closeness, a strange angle, something caught mid-motion, one thing isolated in a huge empty frame, or a scale that feels wrong all work. Pick whichever fits this subject. ★A subject simply placed in the middle of a table with nothing happening is a failure.";

export function grammarFor(betType: string, _title?: string | null): SubjectGrammar {
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
/** 소재가 '장면(장소·현장)'인가 — 장면이면 손·단일 초점 지시가 어울리지 않는다(실측: 벌판 사진에 손 지시가 붙었다). */
export function isSceneSubject(subject: string): boolean {
  return /\b(field|fields|factory|plant|site|skyline|landscape|view|rows of|aerial|horizon|yard|complex|district|street|road|bridge|port|warehouse)\b/i.test(subject || "");
}

/* ── 글별 회전축(2026-08-02 유저: "경우의 수를 무궁무진하게, 아직 타이트하다") ──
   종전엔 톤·각도·배경이 전부 계정 프리셋에 묶여 있어 같은 계정이면 늘 같은 조합이 나왔다.
   ★계정 지문으로 남길 것은 '빛(톤)' 하나면 충분하다 — 사람도 카메라 각도는 매번 바꾼다.
   각도·거리·시간대·연출 형태를 글별로 돌리면 조합이 곱셈으로 늘어난다. */
const ANGLES = [
  "straight overhead flat lay", "45-degree three-quarter view", "straight-on eye level",
  "extreme macro close-up", "low angle looking up", "tilted dutch angle",
  "shot from behind the subject", "wide establishing view",
];
const DISTANCES = ["filling the frame edge to edge", "with a little breathing room", "small in a large empty space", "so close it crops past the edges"];
const TIMES = ["early morning light", "flat midday light", "late afternoon golden light", "blue dusk", "a single lamp in a dark room"];

function pickBy(seed: number, arr: readonly string[]): string { return arr[seed % arr.length]!; }

export function buildTextlessThumbPrompt(betType: string, userId: string, variant = 0, subjectOverride?: string | null, title?: string | null): string {
  const p = photoPresetFor(userId);
  const subject = (subjectOverride ?? "").trim() || grammarFor(betType, title).subject;
  const seed = fnv1a(`${title ?? ""}|${subject}|${variant}`);
  // ★계정 지문은 배경 밝기 한 축만 남긴다 — 나머지는 유저 규격이 정한다.
  const bg = p.tone.includes("dark") || p.tone.includes("blue-hour") || p.tone.includes("amber")
    ? "a dark, simple single-color gradient background"
    : "a bright, simple single-color gradient background";
  const hides = [
    "cropped by the frame edge so part of it is outside the picture",
    "partly wrapped or covered by cloth",
    "half sunk in shadow",
    "seen from an angle that hides its far side",
    "emerging from darkness, the rest swallowed by it",
  ];
  return [
    // ★2026-08-02 유저 지급 프롬프트를 그대로 반영. 앞선 '평범한 폰 사진' 방향에서 다시 뒤집은 것이다 —
    //  유저가 CTR 디자이너 규격(미니멀·림라이트·부분 은닉)을 직접 지정했다. 규격은 유저 몫이고 우리는 집행한다.
    `You are a Korean blog thumbnail designer optimizing for click-through rate.`,
    `Choose the single symbolic object a person would think of first for this topic, and remove everything else from the frame.`,
    `The symbol: ${subject}.`,
    `It occupies 60-80% of the frame. Nothing else is in the picture.`,
    `Background: ${bg}. Simple, clean, empty.`,
    `Lighting: strong rim light and glow around the subject.`,
    // ★궁금증 장치 — 유저 규격의 핵심. 다 보여주면 클릭할 이유가 사라진다.
    `★Do NOT show the object completely. Hide 20-40% of it — ${hides[seed % hides.length]}. The viewer should feel "why?", "what is that?", "what's inside?".`,
    `Style: minimal like an Apple advertisement, curiosity-driving like a high-CTR YouTube thumbnail. Premium advertising photography, not an obvious digital composite.`,
    `No brand names, no logos, no trademarked products.`,
    // ★글자 금지만은 우리 규칙으로 남긴다 — 계정 리스크(유저 4회 지적).
    `NO TEXT of any kind: no letters, numbers, Korean characters, signage, labels or watermarks.`,
  ].join("\n");
}

/** 유저가 직접 찍을 때 쓰는 한국어 주문서 — AI가 두 번 실패하면 이걸 보여준다.
 *  ★소재는 그 글에서 뽑은 것을 그대로 쓴다(2026-08-02 실측: 새만금 채용 글에 '동전 몇 개'라는
 *   엉뚱한 주문서가 나갔다 — 유형 폴백 표를 쓰고 있어서 제목과 무관했다). */
export function manualShotBrief(_betType: string, userId: string, title?: string | null, subjectKo?: string | null): string {
  const p = photoPresetFor(userId);
  const dark = p.tone.includes("dark") || p.tone.includes("blue-hour") || p.tone.includes("amber");
  return [
    `[대표컷 주문서]`,
    title ? `글: ${String(title).slice(0, 40)}` : "",
    `무엇을: ${(subjectKo ?? "").trim() || "이 글 하면 가장 먼저 떠오르는 물건 하나"}`,
    `어떻게: 그 물건 하나만. 화면의 60~80%를 채우게 크게.`,
    `배경: ${dark ? "어두운" : "밝은"} 단색 배경, 다른 물건 없이 깨끗하게`,
    `빛: 물건 가장자리에 빛이 걸리게(역광·측광). 밋밋하지 않게.`,
    `★다 보여주지 마세요 — 20~40%는 잘리거나 그림자에 묻히게. "뭐지?" 싶어야 눌러요.`,
    `★글자가 보이면 안 됩니다 — 고지서·영수증·간판처럼 글자 있는 물건은 쓰지 마세요.`,
    `★브랜드 로고가 보이면 안 됩니다.`,
  ].filter(Boolean).join("\n");
}

export async function subjectFromTitle(title: string, betType: string): Promise<{ en: string; ko: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const t = (title ?? "").trim();
  if (!apiKey || t.length < 2) return null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5", max_tokens: 150,
      messages: [{ role: "user", content: [
        `A Korean blog post is titled: "${t.slice(0, 80)}"`,
        `Name the ONE thing to photograph for its thumbnail so that someone scrolling instantly knows what the post is about.`,
        // ★2026-08-02 전면 단순화 — 유저 레퍼런스(실제 홈피드 썸네일)는 전부 '제목에 나온 그것'을 그냥 찍은 사진이었다.
        //  종전엔 돈 물건·실루엣·쌓을 수 있는 것 같은 제약을 겹겹이 걸어 엉뚱한 소재로 흘렀다.
        `Just pick the most obvious real thing from the title — if the post is about air conditioner bills, that is an air conditioner remote or the unit itself; if it is about a job fair, that is a factory or a work site; if it is about pension, that is a bankbook-free object like a piggy bank or an elderly person's hands. Do not be clever or symbolic.`,
        `Two rules only:`,
        `1. It must carry no writing — no receipts, documents, screens, signs, calendars or labels (their whole point is text, and the image will be rejected).`,
        `2. No brand logos or trademarked products. Describe it generically.`,
        `Answer with JSON only: {"subject":"<short plain English phrase naming the thing>","ko":"<같은 것을 한국어 한 구절로 — 유저가 직접 찍을 때 보는 주문서에 들어간다>"}`,
      ].join("\n") }],
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]) as { subject?: string; ko?: string };
    const sub = (j.subject ?? "").trim();
    if (!sub || /[가-힣]/.test(sub)) return null;
    // ★글자가 본질인 물건만 막는다(단어 경계 필수 — de(sign)·(paper)clip 오탐 방지).
    if (/\b(receipts?|invoices?|bills?|documents?|bankbooks?|passbooks?|screens?|displays?|signs?|signage|labels?|calendars?|newspapers?|books?|notes?|notebooks?|papers?)\b/i.test(sub)) return null;
    return { en: sub.slice(0, 120), ko: (j.ko ?? "").trim().slice(0, 60) || sub.slice(0, 60) };
  } catch { return null; }
}
