// Gemini 이미지 생성(REST) — 서버 전용. GEMINI_API_KEY 없으면 ready=false.
// ★파이프라인 최종: 본문=실사 사진 톤(텍스트 전면 금지), 대표이미지=AI 배경만(한글은 코드 합성).
//  하드 규칙은 buildBodyPrompt/buildThumbBgPrompt 두 순수 함수에 코드로 강제(단위 테스트 대상).

const MODEL = "gemini-2.5-flash-image";

export function imageReady(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY); // 어느 프로바이더든 키 하나면 가동
}

// ★하드 규칙(모든 프롬프트에 강제) — 텍스트·얼굴·손클로즈업·브랜드/UI·지폐정면 금지.
const HARD_RULES_ARR = [
  "ABSOLUTELY NO text of any kind: no letters, numbers, Korean characters (Hangul), signs, labels, captions, watermarks, logos, or UI text anywhere.",
  "NEVER reproduce a real branded product's identifiable design (specific car models, phones, devices): depict a GENERIC unbranded version of that object category instead — no brand logos, no signature grilles/shapes that identify a specific model. (Design-right safety — 실존 제품 디자인 재현 금지)",
  "Any screen, sign, book, paper, or package in the scene must be completely blank.",
  "NO human faces — if a person appears, only from behind or cropped below the face, never showing facial features.",
  "NO close-up of hands.",
  "NO brand logos and NO app or phone UI screens.",
  "NO front close-up of banknotes, cash, or bills — use a bankbook or a plain blank card instead. NEVER piggy banks.", // ★돼지저금통 '권장' 문구가 진범이었음 — 금지로 반전
];
export const IMAGE_HARD_RULES = HARD_RULES_ARR.join(" ");
// ★한국어 텍스트 허용판(gpt-image-1 전용) — 텍스트 금지·백지 강제·UI 금지·손 금지 해제(정보 데스크 씬에 필요)
export const IMAGE_HARD_RULES_TEXT_OK = HARD_RULES_ARR.filter((r) =>
  !/NO text of any kind|completely blank|NO close-up of hands|app or phone UI screens/.test(r)).join(" ");

function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// ── 본문 이미지: 실사 사진 톤 다양성 ──
// ★토스톤 팔레트 회전(개념·수치·비교용) + 실사 톤 회전(실제 씬용) — 혼합 정책(유저 결정 2026-07-05)
const TOSS_TONES = [
  "vivid blue (#3182F6) primary with soft sky-blue pastels",
  "vivid blue accent with warm coral pastel touches",
  "vivid blue accent with fresh mint pastel touches",
  "vivid blue accent with soft lavender pastel touches",
  "vivid blue accent with gentle amber pastel touches",
];
const PHOTO_TONES = [
  "warm natural window light, soft film-like tones",
  "clean minimal desaturated studio light",
  "bright morning sunlight, airy and fresh",
  "low-saturation pastel daylight",
  "soft overcast diffused light",
];
// 슬롯 설명 성격 분기 — 실제 씬(장소·물건·현장) vs 개념(비교·절차·수치). 애매하면 시드 랜덤.
const CONCRETE_RE = /전경|모습|현장|매장|가게|음식|요리|거리|풍경|장소|건물|실내|외관|제품|실물|기기|착용|모음|재료|간판|메뉴|차량|도로|공원|바다|산|숙소|객실|사람|손|책상|주방|화면을 보는/;
const ABSTRACT_RE = /비교|정리|요약|절차|단계|순서|구성|개념|금액|비용|수익|금리|계산|조건|장단점|체크리스트|일정|통계|그래프|표|자료|아이콘|상징/;
export function pickImageStyle(slotDesc: string, seed: number): "photo" | "toss" {
  const c = CONCRETE_RE.test(slotDesc), a = ABSTRACT_RE.test(slotDesc);
  if (c && !a) return "photo";
  if (a && !c) return "toss";
  return seed % 10 < 7 ? "photo" : "toss"; // ★애매하면 실사 70%(실측: 3D 비중 과다 판정)
}
const PHOTO_COMPOS = [
  "subject centered with generous negative space",
  "subject on the left third, airy background",
  "gentle top-down flat-lay arrangement",
  "shallow depth of field, close but not macro",
  "wide calm scene with the object small in frame",
  "diagonal arrangement with soft natural shadow",
];
const PHOTO_MOODS = ["calm and tidy", "warm and inviting", "fresh and clean", "quiet and refined", "cozy everyday"];

/** 본문 이미지 프롬프트(순수 함수) — ★혼합 정책(유저 결정): 실제 씬=실사 / 개념·수치=토스톤 3D / 애매=시드 랜덤. 테스트 대상. */
export function buildBodyPrompt(slotDesc: string, articleTitle: string, seed: number, opts?: { context?: string }): string {
  const compo = PHOTO_COMPOS[(seed >> 3) % PHOTO_COMPOS.length];
  const mood = PHOTO_MOODS[(seed >> 7) % PHOTO_MOODS.length];
  const conceptSlot = /개념|상징|아이콘|기분|마음|정리|요약/.test(slotDesc);
  const docSlot = /계약서|서류|양식|증명서|등본|고지서|신청서|위임장|약관/.test(slotDesc); // ★문서류=실사로 찍으면 텍스트가 끼어 깨짐 → 이모지 3D(매끈한 무지 종이 오브젝트)
  const useEmoji3d = conceptSlot || docSlot || seed % 5 === 0; // ★토스 이모지풍 3D(유저 재지정) — 개념 슬롯 + 글당 1개꼴 로테이션
  if (!useEmoji3d) { // 기본=실사 다큐
    const tone = PHOTO_TONES[seed % PHOTO_TONES.length];
    return [
      "ZERO TEXT IMAGE — absolutely no letters, numbers or Hangul anywhere in the image (any rendered text will be broken and ruin the photo).",
      `Realistic lifestyle photograph for a Korean blog post. Topic context (for understanding only — never render as text): ${articleTitle}.`,
      `Scene hint (may be overly detailed): ${slotDesc}.`,
      // ★은유 극화(유저 최종 인사이트): 이미지는 슬롯 문구가 아니라 '그 자리 문단의 메시지'를 시각 은유로 —
      //  예: '연 90만원 환급을 안 받는 것' → 돈·통장이 쓰레기통에 버려지는 한 장면. 앱 화면 묘사보다 은유가 백배 강하다.
      opts?.context?.trim() ? `THE PARAGRAPH THIS IMAGE ILLUSTRATES (understand only — never render as text): "${opts.context.trim().slice(0, 300)}". Extract its ONE emotional point and stage it as a BOLD VISUAL METAPHOR that makes the reader feel that point instantly — staged THEATRICALLY like a viral thumbnail (e.g. losing an annual refund → stylized Korean banknotes and coins tumbling into a trash bin, dramatic light; a deadline passing → a calendar page burning out). Prefer a striking exaggerated metaphor over literally depicting app screens or procedures.` : "",
      // ★장면 단순화(유저 컨셉 확정) — 설명의 디테일을 그리려 하면 텍스트·복잡성이 끼어 깨진다. 핵심 명사 1개로 환원.
      "RADICAL SIMPLIFICATION (final rule — a clean beautiful PLACE photo always beats a complex scene done badly): from the scene hint keep ONLY the place, rendered as a professional unmanned establishing shot — 도청·관공서 → the building facade only; 민원 창구 → the empty counter interior only; 논밭 → the fields only; 은행 → the branch exterior or lobby only. ABSOLUTELY NO people, NO hands, NO banners, NO signs, NO documents, NO tablets/phones/devices, NO drones — every added element tempts broken text or awkward staging. Just the place, great light, great composition.",
      // ★단일 문법(유저 최종 판정: 텍스트 절대 금지 — 깨짐, 빈 화면도 금지 — 허접) — 상황이 스스로 말하는 씬 3택.
      "Pick the ONE scene type that best fits this topic: (a) INDUSTRY/PLACE topics (energy, real estate, cars, travel, markets) → a cinematic wide establishing shot of the real-world place itself — industrial plant, apartment complex, dealership lot, harbor — impressive scale, natural light, professional editorial photograph. (b) PAPERWORK/APPLICATION topics → stage the SITUATION using NON-PAPER objects only: keys, a small house model, a calendar (numbers-free), coins in a tray, a phone lying face-down. DO NOT include documents, forms, sticky notes, books or screens AT ALL — any paper-like object tempts text and text always renders broken. (c) otherwise → a clean bright STILL-LIFE: multiple objects of the topic category neatly arranged on a light wooden table near a window, soft daylight, airy minimal styling — like a lifestyle magazine product spread. The image must spark curiosity and instantly convey what the article is about — a scene that tells the story by itself.",
      `Setting is always KOREA (Korean apartments, Korean streets, Korean products; any hands or partial figures are Korean). The topic-specific OBJECTS are the hero of the frame — a person may appear only as hands interacting with them (no full figures, face never visible). Include at least 2 physical objects that are UNIQUELY specific to the topic above (e.g., housing topic → door keys, moving boxes, apartment window view; car topic → car interior, charging cable). NEVER generic clichés: NO piggy banks, NO coin stacks, NO calculators, NO lightbulbs, NO miniature house models, NO keys-next-to-props. AVOID the tired 'objects arranged on a desk' composition unless the topic is literally desk work — when the topic has a real-world place (bank, apartment complex, market, road), GO THERE with a wide editorial shot instead.`,
      `${tone}, ${compo}, ${mood} mood. Natural realistic photography with PUNCH — rich saturated colors, dramatic directional light, crisp textures (not flat muted stock). Wide horizontal 16:9 composition.`,
      IMAGE_HARD_RULES,
    ].join(" ");
  }
  const tone = TOSS_TONES[seed % TOSS_TONES.length];
  return [
    "ZERO TEXT IMAGE — absolutely no letters, numbers or Hangul anywhere.",
    `Premium 3D emoji in the style of Toss (Korean fintech) Tossface: EXACTLY ONE glossy rounded hero object — count must be ONE, never a collage of icons (documents → a smooth blank paper icon, growth → a single thick upward arrow with coins, refund → a single coin with a wing). Vivid soft gradient colors, polished-toy highlights, centered LARGE on a clean single-color pastel background. NOT a cluttered scene. Topic context (understand only, never render as text): ${articleTitle}.`,
    opts?.context?.trim() ? `The paragraph this illustrates (understand only): "${opts.context.trim().slice(0, 200)}". Pick the ONE object that embodies its emotional point.` : "",
    `Depict EXACTLY this: ${slotDesc}. Choose 2-4 distinct objects that are explicitly mentioned in, or uniquely specific to, that description — ${["show the tools/items used for it", "show the place or setting where it happens", "show the end result or benefit of it", "show the items being compared side by side"][seed % 4]}.`,
    "NEVER use generic clichés: NO piggy banks, NO plain coin stacks, NO generic calculators, NO lightbulbs — unless that exact object is in the description.",
    `Color: ${tone}, on a clean single-color light background. ${compo}, ${mood} mood. Tactile smooth clay material, soft studio lighting, gentle shadows, no clutter. Playful but premium. Wide horizontal 16:9 composition.`,
    IMAGE_HARD_RULES,
  ].join(" ");
}

/** 대표이미지 AI 배경 프롬프트(순수 함수) — ★주제 인식(실측 비교 판정: 추상 blob은 짜침, 주제 오브젝트가 정답).
 *  topic이 있으면 그 주제를 나타내는 구체 오브젝트(차·동전·달력 등), 없으면 기존 추상. 텍스트 절대 금지 + 상단 여백. */
export function buildThumbBgPrompt(bgStyleHint: string, paletteHint: string, seed: number, topic?: string): string {
  const mood = PHOTO_MOODS[seed % PHOTO_MOODS.length];
  const subject = topic && topic.trim()
    ? `Cute rounded clay-like 3D objects that clearly represent this topic (understand only — never render as text): "${topic.trim()}". Pick 2-4 real objects uniquely specific to this exact topic — NEVER generic clichés (NO piggy banks, NO plain coin stacks, NO generic calculators) unless the topic is literally about them.`
    : `Soft matte 3D abstract objects (rounded blobs, spheres, gentle geometric forms).`;
  return [
    `${subject} Floating on a solid single-color background, color palette of ${paletteHint}.`,
    `Playful premium 3D render like a Toss/Danggeun event card illustration. Objects arranged in the LOWER two-thirds — keep the TOP 35% a clean empty area (text goes there later).`,
    `${mood} mood, soft studio lighting, tactile clay-like material, no busy clutter. Square 1:1 composition.`,
    "ABSOLUTELY NO text of any kind: no letters, numbers, Korean characters, signs, labels, captions, watermarks, or logos anywhere.",
  ].join(" ");
}
/** 실사 배경(썸네일) — 주제 씬 사진. center=true면 중앙 저디테일(정중앙 텍스트용), 아니면 상단 여백형. */
// ★문구 유형 → 감정 팔레트 4종(유저 확정: '자극=부정 감정' 고착 해소 — 채널이 불안 마케팅 톤으로 굳는 것 방지)
function emotionOf(copy: string): string {
  if (/(손해|손실|주의|위험|놓치|사라|새는|날리|폭탄|마감|늦으면|모르면|실수|거부|탈락|소멸|해지|취소|박탈|삭감|중단|끊기|날아가)/.test(copy))
    return "EMOTION = concern/seriousness (worry, gravity) — warning copy";
  if (/(지원|혜택|환급|받는|받을|아끼|절약|기회|무료|추가|더 준|올랐|커진)/.test(copy))
    return "EMOTION = bright discovery ('ah, THIS was it') — lit-up focused face, hopeful energy, NOT worry";
  if (/(비교|차이|vs|VS|뭐가|어디가|어느|선택|고르|나을까)/.test(copy))
    return "EMOTION = weighing/deliberating — looking between two options, thoughtful tilt, NOT distress";
  return "EMOTION = calm concentration — checking documents, taking notes, steady focused hands, NOT anxiety";
}

// ★구도 코드 배정(유저 확정: 프롬프트 재량 로테이션이 미작동 — 전부 사람+오브젝트) — 문구 주어가 구도를 결정한다
export function compositionOf(copy: string): 0 | 1 | 2 {
  // (c) 대비: 전/후·손익·비교 페어
  if (/(vs|VS|비교|차이|전과 후|전후|받은.*놓친|놓친.*받은|오른.*내린|내린.*오른|유리|손해.*이득|이득.*손해)/.test(copy)) return 2;
  // (a) 사람: 문구의 주인공이 사람일 때만
  if (/(사람|사장|~?라면|당신|나만|엄마|아빠|부모|직장인|주부|신혼|은퇴|초보|분들|누구|가구)/.test(copy)) return 0;
  // (b) 기본: 장소·사물·숫자가 주인공 — 사람 넣지 않기
  return 1;
}

export function buildThumbPhotoBgPrompt(topic: string, seed: number, center = false, opts?: { copyText?: string; variant?: number }): string {
  const tone = PHOTO_TONES[seed % PHOTO_TONES.length];
  const copy = opts?.copyText?.trim() ?? "";
  const v = Math.max(0, opts?.variant ?? 0);
  // 첫 생성 = 문구 주어 판정 구도, 재생성 = (a)→(b)→(c) 코드 순환(AI 재량 없음)
  const comp = ((compositionOf(copy) + v) % 3) as 0 | 1 | 2;
  const persona = [
    "a Korean woman in her 30s",
    "a Korean man in his 40s-50s",
    "a young Korean person in their 20s",
    "hands only — no face in frame (the situation told through hand gestures and objects)",
  ][(seed + v) % 4];
  const compRule = [
    `COMPOSITION (fixed, not optional) = PERSON + OBJECT: ${persona} interacting with the topic object (the owner in front of the containers, a hand holding the bill). ${emotionOf(copy)}. Never repeat the previous attempt's person type or facial staging.`,
    `COMPOSITION (fixed, not optional) = OBJECT/PLACE ONLY — ABSOLUTELY NO PEOPLE in frame, no faces, no hands. The topic's object or place IS the hero, dramatic and larger-than-life. When the copy's hero is a place or number, the place is the star (예: '2026년 역세권 기회는 지금' → sunset skyline of a high-rise apartment complex rising above a subway station, no people).`,
    `COMPOSITION (fixed, not optional) = CONTRAST: before/after, the one who got it vs the one who missed it, rising vs falling — split or juxtaposed in ONE frame. ${emotionOf(copy)}`,
  ][comp];
  const subjectRule = copy
    ? `THE COPY IS THE SCRIPT (highest priority): the Korean copy overlaid on this image reads "${copy}" (understand only — never render it). Draw the SCENE this copy describes. NON-NEGOTIABLE: include at least ONE topic-identifying object from "${topic.trim()}" so the field is recognizable even with the text covered (수출→shipping containers/cargo ship, 에너지지원금→utility bill/power meter, 대출→house/contract, 적금→bankbook/coins, 역세권→station+apartment skyline). Government buildings (국회의사당·청사) only when the copy names an institution or policy announcement. ${compRule} LITMUS TEST: with the text hidden, a viewer should still guess the article's field. 'Eye-catching' is the job of COMPOSITION, CONTRAST and the overlaid copy — NOT of negative emotion.`
    : `Viral Korean YouTube-thumbnail photograph for this topic (understand only — never render as text): "${topic.trim()}". DEFAULT SUBJECT = the topic's most iconic dramatic object or scene. People only if the topic is about people — then KOREAN features.`;
  const layout = center
    ? `Subjects arranged toward the edges/corners; the CENTER of the frame stays calm and low-detail — large Korean text will be overlaid dead-center later.`
    : `Main subject in the UPPER two-thirds; the BOTTOM third must stay calm and low-detail (soft surface, gentle falloff) — text overlay goes there.`;
  return [
    subjectRule,
    "EXAGGERATED cinematic staging that stops a scrolling thumb: vivid saturated colors, dramatic studio-quality lighting, larger-than-life scale.",
    layout,
    `${tone}, vivid and punchy, crisp focus on the subject, glossy commercial quality. Square 1:1 composition.`,
    "ABSOLUTELY NO text of any kind: no letters, numbers, Korean characters, signs, labels, captions, watermarks, or logos anywhere. This includes text ON objects: shipping containers, boxes, documents, bills, storefronts and machines must have BLANK or blurred surfaces — no container markings, no fake brand names, no gibberish lettering (no 'GOAI TAE'-style pseudo-text). If a surface would normally carry text, render it clean or out of focus.",
  ].join(" ");
}


// ★프로바이더 스위치(유저 결정: GPT 품질 우위) — OPENAI_API_KEY 있으면 gpt-image-1, 없으면 Gemini 폴백.
//  원가: gpt-image-1 medium 1024²≈$0.04(~60원) — IMAGE_COST 6cr(300~400원) 마진 유지. 실패 시 상호 폴백.
async function callOpenAIImage(prompt: string, aspectRatio: "16:9" | "1:1"): Promise<{ base64: string; mime: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NOT_READY");
  const size = aspectRatio === "16:9" ? "1536x1024" : "1024x1024";
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt: prompt.slice(0, 4000), size, quality: "medium", n: 1 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message ?? `OpenAI ${res.status}`;
    const quota = res.status === 429 || /quota|billing|rate/i.test(msg);
    throw new Error(quota ? "QUOTA" : msg);
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (b64) return { base64: b64, mime: "image/png" };
  throw new Error("이미지가 생성되지 않았어요.");
}

async function callImage(prompt: string, aspectRatio: "16:9" | "1:1"): Promise<{ base64: string; mime: string; provider: string }> {
  const prefer = process.env.IMAGE_PROVIDER === "openai" && process.env.OPENAI_API_KEY ? "openai" : "gemini"; // ★기본=Gemini 회귀(유저 확정: GPT는 텍스트 금지를 못 지켜 배경 검증 연쇄 탈락 — 실측 자막으로 확인). GPT 재실험은 env IMAGE_PROVIDER=openai로만
  if (prefer === "openai") {
    try { return { ...(await callOpenAIImage(prompt, aspectRatio)), provider: "gpt-image-1" }; }
    catch (e) {
      console.error("[image] openai 실패 → gemini 폴백:", String(e).slice(0, 300)); // 조용한 폴백 금지 — 원인 로그
      if (process.env.GEMINI_API_KEY) return { ...(await callGemini(prompt, aspectRatio)), provider: "gemini(폴백)" }; // ★QUOTA 포함 전면 폴백(실측: 썸네일 단색 — 폴백 불발로 AI 배경 전멸)
      throw e;
    }
  }
  return { ...(await callGemini(prompt, aspectRatio)), provider: "gemini" };
}

async function callGemini(prompt: string, aspectRatio: "16:9" | "1:1"): Promise<{ base64: string; mime: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NOT_READY");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { imageConfig: { aspectRatio } } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message ?? `Gemini ${res.status}`;
    const quota = res.status === 429 || /quota|billing|exhausted/i.test(msg);
    throw new Error(quota ? "QUOTA" : msg);
  }
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) if (p.inlineData?.data) return { base64: p.inlineData.data, mime: p.inlineData.mimeType ?? "image/png" };
  throw new Error("이미지가 생성되지 않았어요.");
}

/** 본문 이미지 1장(실사, base64). userSeed로 계정 축 + 요청 난수 변주. 실패 시 throw. */
export async function generateBlogImage(slotDesc: string, articleTitle: string, userSeed?: string, _opts?: { thumbnail?: boolean; context?: string }): Promise<{ base64: string; mime: string; provider?: string }> {
  // 장마다 변주 — 만 명이 써도, 한 명이 백 장을 만들어도 겹치지 않게.
  const seed = (fnv((userSeed ?? "") + ":") + Math.floor(Math.random() * 1e9)) >>> 0;
  return callImage(buildBodyPrompt(slotDesc, articleTitle, seed, _opts as { context?: string } | undefined), "16:9");
}

/** 대표이미지 AI 배경 1장(1:1, base64) — 한글은 코드(satori)가 합성. 실패는 호출측이 코드 폴백. */
export async function generateThumbBackground(bgStyleHint: string, paletteHint: string, userSeed?: string, topic?: string, opts?: { forceStyle?: "photo" | "toss"; centerText?: boolean; copyText?: string; variant?: number }): Promise<{ base64: string; mime: string; provider?: string }> {
  const seed = (fnv((userSeed ?? "") + ":bg") + Math.floor(Math.random() * 1e9)) >>> 0;
  // ★스타일: 강제 지정(썸네일 메이커=실사 기본) > 주제 자동(구체 씬=실사)
  const style = opts?.forceStyle ?? (topic ? pickImageStyle(topic, seed) : "toss");
  let prompt = style === "photo" && topic ? buildThumbPhotoBgPrompt(topic, seed, opts?.centerText === true, { copyText: opts?.copyText, variant: opts?.variant }) : buildThumbBgPrompt(bgStyleHint, paletteHint, seed, topic);
  return callImage(prompt, "1:1");
}

export const GEMINI_IMAGE_MODEL = MODEL;
