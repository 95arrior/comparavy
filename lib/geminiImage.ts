// Gemini 이미지 생성(REST) — 서버 전용. GEMINI_API_KEY 없으면 ready=false.
// ★파이프라인 최종: 본문=실사 사진 톤(텍스트 전면 금지), 대표이미지=AI 배경만(한글은 코드 합성).
//  하드 규칙은 buildBodyPrompt/buildThumbBgPrompt 두 순수 함수에 코드로 강제(단위 테스트 대상).

const MODEL = "gemini-2.5-flash-image";
import { buildBannerPrompt, bodyStyleRotation } from "./bannerPrompts";

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

// ★아테플로 시그니처 스타일(2026-07-09 유저 확정 — 실사 폐기, 전 유저 공통): 토스풍 플랫 벡터 일러스트.
//  "잘 그린 그림"이 아니라 "3초에 읽히는 기호" — AI 실사의 불쾌함이 원천 부재, 채널 아이덴티티 통일.
const ATEFLO_ILLUST_STYLE = [
  "STYLE (non-negotiable): premium EDITORIAL ILLUSTRATION — the quality of an award-winning fintech brand campaign (Behance/agency grade), NOT clipart, NOT cheap flat icons.",
  "Rendering: hand-crafted feel — rich color blocking, soft airbrush shading, depth with subtle soft shadows, fine grain/noise texture. Confident silhouettes, generous negative space. Think premium fintech campaign art (Toss/Cash App grade), NOT flat UI icons.",
  "Background: one strong saturated SOLID color filling the entire frame (no scenes, no landscapes).",
  "Subject: ONE oversized iconic object as the hero, centered-ish, larger than life. People only as small simple silhouettes if essential.",
  "NOT photorealistic, NOT 3D render, NOT anime, NOT clip-art, NOT icon grids, NO clutter — one idea, told big.",
].join(" ");

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
  // ★차트류 AI 생성 금지(유저 확정: 그래프·차트·표는 무조건 템플릿 렌더러 — AI가 그리면 숫자가 오염된다)
  //  이 자리로 온 차트 요청은 desc를 버리고 '분위기 컷'으로 폴백(빈 슬롯보다 낫되, 숫자는 절대 그리지 않음)
  if (/차트|그래프|다이어그램|도표|막대|추이|그래픽|\[차트/.test(slotDesc)) {
    slotDesc = `글 주제(${articleTitle})와 어울리는 분위기 장면 — 장소·사물 중심, 숫자·글자·그래프 없이`;
  }
  const compo = PHOTO_COMPOS[(seed >> 3) % PHOTO_COMPOS.length];
  const mood = PHOTO_MOODS[(seed >> 7) % PHOTO_MOODS.length];
  // ★글 단위 스타일 통일(유저 실증: 한 글 3장 중 1장만 3D — 질감 불일치) — 슬롯별 3D 분기·랜덤 로테이션 폐기, 전부 실사. 문서류는 장면형 실사(도장 찍는 손과 서류)로, 표면 무텍스트 규칙이 글자 깨짐을 방지한다.
  const useEmoji3d = /^AI 컨셉.*(아이콘|이모지|3D)/.test(slotDesc); // 명시 요청 시에만
  if (!useEmoji3d) { // 기본=실사 다큐
    const tone = PHOTO_TONES[seed % PHOTO_TONES.length];
    return [
      "ZERO TEXT IMAGE — absolutely no letters, numbers or Hangul anywhere in the image (any rendered text will be broken and ruin the photo).",
      `Flat vector illustration for a Korean blog post. Topic context (for understanding only — never render as text): ${articleTitle}.`,
      `Scene hint (may be overly detailed): ${slotDesc}.`,
      ATEFLO_ILLUST_STYLE,
      // ★은유 극화(유저 최종 인사이트): 이미지는 슬롯 문구가 아니라 '그 자리 문단의 메시지'를 시각 은유로 —
      //  예: '연 90만원 환급을 안 받는 것' → 돈·통장이 쓰레기통에 버려지는 한 장면. 앱 화면 묘사보다 은유가 백배 강하다.
      opts?.context?.trim() ? `THE PARAGRAPH THIS IMAGE ILLUSTRATES (understand only — never render as text): "${opts.context.trim().slice(0, 300)}". Extract its ONE emotional point and stage it as a BOLD VISUAL METAPHOR that makes the reader feel that point instantly — staged THEATRICALLY like a viral thumbnail (e.g. losing an annual refund → stylized Korean banknotes and coins tumbling into a trash bin, dramatic light; a deadline passing → a calendar page burning out). Prefer a striking exaggerated metaphor over literally depicting app screens or procedures.` : "",
      // ★장면 단순화(유저 컨셉 확정) — 설명의 디테일을 그리려 하면 텍스트·복잡성이 끼어 깨진다. 핵심 명사 1개로 환원.
      "HARD RULE: MAXIMUM 2 meaningful objects in the frame — if the scene hint lists more, keep only the most symbolic one. RADICAL SIMPLIFICATION — one metaphor beats a complex scene: from the scene hint keep ONE simple visual idea and render it as bold flat shapes (a building = simple geometric facade; fields = layered green shapes; a person learning = a designed character with a giant book). CHARACTER SPEC (when a person appears): NOT a plain circle-head blob — a DESIGNED flat-vector character at premium fintech campaign level: distinct hairstyle, real outfit (office shirt/cardigan/suit — colors from the palette), expressive posture and gesture, head:body about 1:3, soft airbrush shading on clothes. Minimal face (dot eyes, tiny smile) is fine, but silhouette and styling must look like a branded illustration character, never a generic stick figure or plain circle person.",
      // ★단일 문법(유저 최종 판정: 텍스트 절대 금지 — 깨짐, 빈 화면도 금지 — 허접) — 상황이 스스로 말하는 씬 3택.
      "Pick the ONE idea that best fits this topic: (a) PLACE topics → the place as bold simple shapes (apartment silhouette, factory outline). (b) MONEY/APPLICATION topics → one iconic object oversized: giant coin, house shape, calendar shape (no numbers), an envelope. (c) PEOPLE situations → one DESIGNED character (per CHARACTER SPEC) in an expressive pose interacting with ONE object. The image must instantly convey what the article is about — a symbol, not a scene.",
      `Setting is always KOREA (Korean apartments, Korean streets, Korean products; any hands or partial figures are Korean). The topic-specific OBJECTS are the hero of the frame — a person may appear only as hands interacting with them (no full figures, face never visible). Include at least 2 physical objects that are UNIQUELY specific to the topic above (e.g., housing topic → door keys, moving boxes, apartment window view; car topic → car interior, charging cable). NEVER generic clichés: NO piggy banks, NO coin stacks, NO calculators, NO lightbulbs, NO miniature house models, NO keys-next-to-props. AVOID the tired 'objects arranged on a desk' composition unless the topic is literally desk work — when the topic has a real-world place (bank, apartment complex, market, road), GO THERE with a wide editorial shot instead.`,
      `${mood} mood. Wide horizontal 16:9 composition.`,
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

// ★배경 문법 4종(2026-07-09 유저 레퍼런스 — 통일성은 스타일, 다양성은 문법·색으로)
// ★은유 콘셉트 뱅크(2026-07-10 — 실측: 카드·동전·화살표 3종 세트로 게으르게 수렴) — 아이디어를 우리가 공급한다
const METAPHOR_BANK = [
  "갈아타기·환승 → a person hopping across stepping stones, each stone a different color",
  "비교·선택 → an old-fashioned balance scale with two different objects, or a person at a fork in two colored paths",
  "손해·새는 돈 → a pouch or bucket with a small hole and drops leaking out",
  "이자·불어남 → a snowball rolling downhill getting bigger, or a watering can growing a plant",
  "보호·안전 → a money pouch wearing a seatbelt, or an umbrella over a small object",
  "마감·시간 → a melting ice cube, or an hourglass almost empty",
  "자격·문 열림 → a giant door slightly open with light, or a key fitting into a lock",
  "숨은 혜택 → a person lifting a rug corner to find something shiny underneath",
  "순서·절차 → a winding path with numbered flags to a small house or flag",
  "함정·주의 → a banana peel on a clean floor, or a mousetrap with a coin as bait",
  "성장·목돈 → a tiny seedling growing out of a jar of coins",
  "빠른 처리 → a paper plane flying across the frame leaving a color trail",
] as const;

const BG_GRAMMARS = [
  "GRAMMAR = GIANT OBJECT: the topic's single most iconic object, oversized and centered, soft dimensional shading (예: a huge money pouch, three overlapping bank cards, a giant coin).",
  "GRAMMAR = WITTY COMBO: the topic object PLUS one unexpected everyday element fused into a single visual pun — like a money pouch wearing a car seatbelt (= protecting money), a key stuck in a dartboard bullseye (= the exact solution). ONE combined object only.",
  "GRAMMAR = TINY PEOPLE, GIANT THING: one oversized topic object with 1-2 tiny simple human silhouettes interacting with it — scale contrast tells the story.",
  "GRAMMAR = PATTERN: the topic object repeated 3-6 times in a loose playful arrangement (fanned cards, scattered coins), like an editorial magazine spot.",
];
const BG_PALETTES = [
  "solid sky blue background (#7fb5f5 family), hero object in warm orange and navy",
  "solid vivid red background (#e8402d family), hero object in white and charcoal",
  "solid fresh green background (#12b76a family), hero object in cream and dark ink",
  "solid amber yellow background (#ffc933 family), hero object in navy and white",
  "solid deep violet background (#6b5cff family), hero object in peach and light blue",
  "solid warm coral background (#ff7f6e family), hero object in teal and cream",
];

export function buildThumbPhotoBgPrompt(topic: string, seed: number, center = false, opts?: { copyText?: string; variant?: number }): string {
  const tone = PHOTO_TONES[seed % PHOTO_TONES.length];
  const copy = opts?.copyText?.trim() ?? "";
  const v = Math.max(0, opts?.variant ?? 0);
  // 문구 주어 → 시작 문법 매핑(사람=인물 문법, 그 외=심볼), variant·seed로 문법×팔레트 회전
  // 시작 문법 균등 분산(실측: 항상 GIANT OBJECT 시작 → 다시 만들기도 비슷) — 사람 문구는 TINY PEOPLE 우선, 그 외 seed·문구 해시 균등
  let ch = 0; for (const c2 of copy) ch = (ch * 31 + c2.charCodeAt(0)) >>> 0;
  const baseG = compositionOf(copy) === 0 ? 2 : (seed + ch) % BG_GRAMMARS.length;
  const grammar = BG_GRAMMARS[(baseG + v) % BG_GRAMMARS.length];
  const palette = BG_PALETTES[(seed + v) % BG_PALETTES.length];
  const subjectRule = copy
    ? `THE COPY IS THE SCRIPT (highest priority): the Korean copy overlaid on this image reads "${copy}" (understand only — never render it). Draw the IDEA this copy describes as one bold flat-illustration symbol. CLICHE BAN: do NOT default to credit cards, coins, banknotes, arrows or generic money stacks — these are exhausted; use them ONLY if the copy is literally about a card/coin. Instead pick ONE witty metaphor matching the copy's angle from this bank (or invent an equally specific one): ${METAPHOR_BANK[(seed + v) % METAPHOR_BANK.length]} / ${METAPHOR_BANK[(seed + v + 5) % METAPHOR_BANK.length]}. When a person appears, draw an appealing simple editorial character (confident line/shape work, expressive pose, like premium fintech brand mascots — not a stick figure). ${grammar} PALETTE: ${palette} (max 4 colors, subtle film grain finish). MAXIMUM 2 meaningful objects unless the grammar says otherwise — simplicity wins. LITMUS TEST: with the text hidden, a viewer should still guess the article's field. ${ATEFLO_ILLUST_STYLE}`
    : `Flat vector illustration thumbnail for this topic (understand only — never render as text): "${topic.trim()}". ${grammar} PALETTE: ${palette}. ${ATEFLO_ILLUST_STYLE}`;
  const layout = center
    ? `Subjects arranged toward the edges/corners; the CENTER of the frame stays calm and low-detail — large Korean text will be overlaid dead-center later.`
    : `Main subject in the UPPER two-thirds; the BOTTOM third must stay calm and low-detail (soft surface, gentle falloff) — text overlay goes there.`;
  return [
    subjectRule,
    "Bold larger-than-life scale that stops a scrolling thumb — one big symbol, generous negative space.",
    layout,
    "Square 1:1 composition.",
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

export async function callImage(prompt: string, aspectRatio: "16:9" | "1:1"): Promise<{ base64: string; mime: string; provider: string }> {
  const prefer = process.env.IMAGE_PROVIDER === "openai" && process.env.OPENAI_API_KEY ? "openai" : "gemini"; // ★기본=Gemini 회귀(유저 확정: GPT는 텍스트 금지를 못 지켜 배경 검증 연쇄 탈락 — 실측 자막으로 확인). GPT 재실험은 env IMAGE_PROVIDER=openai로만
  if (prefer === "openai") {
    try { return { ...(await callOpenAIImage(prompt, aspectRatio)), provider: "gpt-image-1" }; }
    catch (e) {
      console.error("[image] openai 실패 → gemini 폴백:", String(e).slice(0, 300)); // 조용한 폴백 금지 — 원인 로그
      if (process.env.GEMINI_API_KEY) return { ...(await callGemini(prompt, aspectRatio)), provider: "gemini(폴백)" }; // ★QUOTA 포함 전면 폴백(실측: 썸네일 단색 — 폴백 불발로 AI 배경 전멸)
      throw e;
    }
  }
  // ★역방향 비상 폴백(실측 2026-07-10: Gemini QUOTA → 단색 폴백으로 AI 배경 전멸) — 쿼터 계열 실패만 GPT로.
  //  GPT는 텍스트 금지 준수율이 낮아 기본값으론 기각(유저 확정)이지만, 단색보다는 낫다 — 비상시 한정.
  try { return { ...(await callGemini(prompt, aspectRatio)), provider: "gemini" }; }
  catch (e) {
    const quota = e instanceof Error && e.message === "QUOTA";
    if (quota && process.env.OPENAI_API_KEY) {
      console.error("[image] gemini QUOTA → gpt-image-1 비상 폴백");
      return { ...(await callOpenAIImage(prompt, aspectRatio)), provider: "gpt-image-1(비상)" };
    }
    throw e;
  }
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
    // 어떤 제한(분당 RPM/일일 RPD/티어)인지 원문을 로그로 — 잔액 있어도 429가 나는 원인 구분용
    if (quota) console.error(`[image] gemini 429 원문: ${msg.slice(0, 400)}`);
    throw new Error(quota ? "QUOTA" : msg);
  }
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) if (p.inlineData?.data) return { base64: p.inlineData.data, mime: p.inlineData.mimeType ?? "image/png" };
  throw new Error("이미지가 생성되지 않았어요.");
}

/** 본문 이미지 1장(실사, base64). userSeed로 계정 축 + 요청 난수 변주. 실패 시 throw. */
export async function generateBlogImage(slotDesc: string, articleTitle: string, userSeed?: string, _opts?: { thumbnail?: boolean; context?: string }): Promise<{ base64: string; mime: string; provider?: string }> {
  // ★키워드 배너 문법(2026-07-13 유저 확정 — WP에서 실증) — 슬롯 설명(상황)은 버린다:
  //  상황 프롬프트는 전부 비슷한 손·소품 클로즈업으로 수렴(실측). 주제를 그리는 오브젝트/장면/3D타이포 로테이션.
  //  slotDesc는 스타일 회전 시드로만 사용(같은 글 안에서 슬롯마다 다른 스타일 보장).
  const seed = (fnv((userSeed ?? "") + ":" + slotDesc) + Math.floor(Math.random() * 1e9)) >>> 0;
  const styles = bodyStyleRotation(articleTitle);
  const style = styles[seed % styles.length]!;
  return callImage(buildBannerPrompt(articleTitle, style, seed), "16:9");
}

/** 대표이미지 AI 배경 1장(1:1, base64) — 한글은 코드(satori)가 합성. 실패는 호출측이 코드 폴백. */
export async function generateThumbBackground(bgStyleHint: string, paletteHint: string, userSeed?: string, topic?: string, opts?: { forceStyle?: "photo" | "toss"; centerText?: boolean; copyText?: string; variant?: number }): Promise<{ base64: string; mime: string; provider?: string }> {
  const seed = (fnv((userSeed ?? "") + ":bg" + String(opts?.variant ?? 0)) + Math.floor(Math.random() * 1e9)) >>> 0;
  // ★공용 무대(stage) 문법으로 통일(2026-07-13 유저: 배경이 주제와 무관·전부 비슷) —
  //  주제 오브젝트는 가장자리, 중앙은 문구 자리(조판용 설계). 팔레트 6종 회전으로 색 다양성.
  const prompt = buildBannerPrompt((topic ?? bgStyleHint ?? "").trim() || "재테크", "stage", seed);
  return callImage(prompt, "1:1");
}

export const GEMINI_IMAGE_MODEL = MODEL;
