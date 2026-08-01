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
  /** 이미지 모델용 영어 소재. ★단일 피사체 원칙 — 200px로 줄여도 살아남게. */
  subject: string;
}

// ★소재 선정 기준: (1)글자가 없어도 성립 (2)피사체 1개(대비형은 같은 사물 2개) (3)AI가 잘 그리는 것
//  — 사람 전신·복잡한 실내·서류 내용은 뺐다(AI 티가 가장 심하게 나는 3종).
export const SUBJECT_GRAMMAR: SubjectGrammar[] = [
  { betType: "평균 위치확인", device: "대비", subject: "two stacks of coins side by side, one clearly taller than the other" },
  { betType: "몰라서 못 받는 돈", device: "발견", subject: "a plain unmarked envelope peeking out from under a folded cloth" },
  { betType: "계산 충격", device: "압도", subject: "a glass jar overflowing with coins, extreme close-up" },
  { betType: "통념 파괴", device: "반전", subject: "an upside-down ceramic piggy bank with coins spilled around it" },
  { betType: "손해 공포 마감", device: "시간", subject: "a small hourglass beside a single coin, sand almost finished" },
  { betType: "인생 이벤트 돈 타임라인", device: "정황", subject: "a single key resting on an empty wooden desk" },
  { betType: "시장 급변 번역", device: "번역", subject: "a shopping basket handle held in one hand, groceries blurred behind" },
  { betType: "돈 격차 자극", device: "대비", subject: "two leather wallets side by side, one thick and one flat" },
];

const FALLBACK_SUBJECT = "a small stack of coins on a plain surface, close-up";

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
export function buildTextlessThumbPrompt(betType: string, userId: string, variant = 0): string {
  const g = grammarFor(betType);
  const p = photoPresetFor(userId);
  const poses = ["centered in frame", "slightly off-center to the left", "slightly off-center to the right"];
  return [
    // ★2026-08-02 실측 수정: 첫 줄이 "Editorial still-life photograph"이었는데 그게 곧 상업 사진 장르라
    //  뒤에서 "NOT an advertisement"라고 말해도 소용이 없었다(판독성 검사가 2회 다 '광고처럼 보인다'로 반려).
    //  장르 자체를 '집에서 대충 찍은 스냅'으로 바꾼다 — 홈피드에서 이기는 건 잘 찍은 사진이 아니라 진짜 같은 사진이다.
    `An unstaged everyday snapshot, as if someone quickly photographed this at home with a phone. Square 1:1.`,
    `Subject: ${g.subject}. ${p.hands ? "A single human hand may enter the frame, fingers partially visible, no face." : "Objects only, no people."}`,
    `Lighting and tone: ${p.tone}.`,
    `Camera: ${p.angle}, ${poses[variant % poses.length]}.`,
    `Setting: ${p.backdrop}. A real lived-in home or desk, not a studio.`,
    // ★축소 생존 — 홈피드 썸네일은 200~400px로 렌더된다. 명함보다 작다.
    `Composition: the subject fills at least 60% of the frame and reads clearly even when the image is shrunk to a thumbnail. Exactly one focal point. No clutter, no scattered props.`,
    // ★광고 냄새 제거
    `Style: it must look like a photo from a personal blog, NOT a magazine, catalog, product shot, or advertisement. Slightly imperfect framing, natural uneven lighting with real shadows, muted everyday color. No studio lighting, no seamless backdrop, no glossy polish, no smiling models, no logos, no branding, no props arranged for the camera.`,
    // ★글자 금지 3중
    `ABSOLUTELY NO TEXT of any kind: no letters, no numbers, no Korean characters, no signage, no labels, no watermarks, no printed documents, no receipts, no screens showing text. Any surface that would normally carry writing must be blank or turned away from the camera.`,
  ].join("\n");
}

/** 유저가 직접 찍을 때 쓰는 한국어 주문서 — AI가 두 번 실패하면 이걸 보여준다. */
export function manualShotBrief(betType: string, userId: string): string {
  const g = grammarFor(betType);
  const p = photoPresetFor(userId);
  const ko: Record<string, string> = {
    "two stacks of coins side by side, one clearly taller than the other": "동전을 두 더미로 쌓되 한쪽을 확연히 높게",
    "a plain unmarked envelope peeking out from under a folded cloth": "접힌 천 밑으로 빈 봉투 모서리만 살짝 보이게",
    "a glass jar overflowing with coins, extreme close-up": "유리병에 동전을 가득 채우고 아주 가까이서",
    "an upside-down ceramic piggy bank with coins spilled around it": "저금통을 거꾸로 엎고 동전이 쏟아진 상태로",
    "a small hourglass beside a single coin, sand almost finished": "모래시계 옆에 동전 하나, 모래가 거의 다 떨어진 순간",
    "a single key resting on an empty wooden desk": "빈 책상 위에 열쇠 하나만",
    "a shopping basket handle held in one hand, groceries blurred behind": "장바구니 손잡이를 든 손, 뒤는 흐리게",
    "two leather wallets side by side, one thick and one flat": "지갑 두 개를 나란히, 하나는 두툼하고 하나는 납작하게",
  };
  return [
    `[대표컷 주문서] ${g.device}형`,
    `무엇을: ${ko[g.subject] ?? "동전 몇 개를 단순한 바닥 위에 가까이서"}`,
    `어떻게: ${p.angle.includes("overhead") ? "위에서 수직으로" : p.angle.includes("macro") ? "아주 가까이 접사로" : p.angle.includes("45") ? "45도 비스듬히" : "정면 눈높이에서"}, ${p.hands ? "손이 살짝 들어가도 좋아요(얼굴은 금지)" : "사물만, 사람 없이"}`,
    `배경: ${p.backdrop.includes("wooden") ? "나무 책상" : p.backdrop.includes("linen") ? "천(리넨) 위" : p.backdrop.includes("wall") ? "밝은 벽 앞" : "단색 배경"}, 잡동사니 없이`,
    `★피사체가 화면의 60% 이상을 채우게. 작게 줄여도 뭔지 알아볼 수 있어야 해요.`,
    `★글자가 보이면 안 됩니다 — 고지서·영수증·통장처럼 글자 있는 물건은 쓰지 마세요.`,
  ].join("\n");
}
