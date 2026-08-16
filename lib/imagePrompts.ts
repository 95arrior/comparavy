// ★이미지 프롬프트 v3(2026-08-17 유저 2차 판정: "대부분 비슷하게 나오네, 홈판과도 안 맞고, 아래 여백도 안 주고").
//  v2의 문제: 주제군당 장면이 1개 고정이라 같은 카테고리 글은 전부 같은 그림 + '여백을 남긴다'는
//  부드러운 문장을 이미지 모델이 무시. v3: 장면 변주 엔진(주제군×장면 3종×장소×색 무드×인물 배치 시드 조합)
//  + 하단 여백을 숫자로 못 박는 하드 구도 규칙 + 내장 생성(geminiImage)용 영어 미러 제공.
//  대원칙 불변: 썸네일은 '경제 주제'가 아니라 '경제 때문에 벌어진 생활 장면'(내 돈에 생긴 일).

export type ImageLane = "home" | "search";
export type BodyImageRole = "scene" | "evidence" | "explain" | "rest";

interface SceneVariant { persona: string; personaEn: string; action: string; actionEn: string; emotion: string; emotionEn: string; props: [string, string]; propsEn: [string, string] }

// 주제군별 장면 3종 — 같은 카테고리라도 글(시드)마다 다른 장면이 걸린다
const TOPIC_PROFILES: [RegExp, SceneVariant[]][] = [
  [/(예산|일정|마감|타이밍|시기|접수|신청 기간|발표)/, [
    { persona: "30~40대 직장인", personaEn: "an office worker in their 30s-40s", action: "달력 메모와 휴대폰을 번갈아 보며 일정을 확인하는", actionEn: "checking dates between a wall calendar note and a phone", emotion: "'언제 챙겨야 하지?'라는 긴장과 당황", emotionEn: "tense 'when do I need to act?' urgency", props: ["일정 체크가 된 달력 메모", "스마트폰"], propsEn: ["a calendar note with a circled date", "a smartphone"] },
    { persona: "30대 맞벌이 부부 중 한 명", personaEn: "one half of a working couple in their 30s", action: "휴대폰 알림을 보다가 벽시계를 돌아보는", actionEn: "glancing back at a wall clock after seeing a phone alert", emotion: "'벌써 시간이 이렇게 됐나' 하는 조급함", emotionEn: "a jolt of 'is it that late already?'", props: ["휴대폰", "벽시계"], propsEn: ["a phone", "a wall clock"] },
    { persona: "40대 가장", personaEn: "a parent in their 40s", action: "포스트잇이 붙은 냉장고 앞에서 날짜를 손가락으로 짚는", actionEn: "pointing at a date on a sticky note on the fridge", emotion: "'놓치면 안 되는데'라는 다짐 섞인 긴장", emotionEn: "determined 'I can't miss this' focus", props: ["포스트잇", "냉장고 문"], propsEn: ["a sticky note", "a fridge door"] },
  ]],
  [/(예금|적금|금리|이자|통장|저축)/, [
    { persona: "30~50대 생활자", personaEn: "an everyday person in their 30s-50s", action: "통장을 펼쳐 보고 표정이 굳는", actionEn: "freezing mid-expression while looking at a bankbook", emotion: "'생각보다 적네'라는 실망과 놀람", emotionEn: "disappointed surprise — 'less than I thought'", props: ["통장", "계산기"], propsEn: ["a bankbook", "a calculator"] },
    { persona: "20~30대 사회초년생", personaEn: "a young professional in their 20s-30s", action: "휴대폰 뱅킹 화면을 보다가 눈이 커지는", actionEn: "eyes widening at a mobile banking screen", emotion: "'이 금리 실화야?'라는 놀람", emotionEn: "startled disbelief at a number", props: ["휴대폰", "커피잔"], propsEn: ["a phone", "a coffee cup"] },
    { persona: "40대 주부", personaEn: "a homemaker in their 40s", action: "두 은행 안내지를 나란히 놓고 비교하며 고개를 갸웃하는", actionEn: "tilting their head comparing two bank leaflets side by side", emotion: "'어디가 나은 거지?'라는 진지한 고민", emotionEn: "serious 'which one is better?' deliberation", props: ["안내지 두 장", "볼펜"], propsEn: ["two leaflets", "a pen"] },
  ]],
  [/(청약|분양|아파트|부동산|전세|월세|입주)/, [
    { persona: "30~40대 신혼부부", personaEn: "a newlywed couple in their 30s", action: "서류 봉투를 사이에 두고 마주 앉아 눈을 마주치는", actionEn: "sitting across from each other locking eyes over a document envelope", emotion: "'기회를 놓치면 안 된다'는 긴장감", emotionEn: "shared 'we can't miss this chance' tension", props: ["서류 봉투", "휴대폰"], propsEn: ["a document envelope", "a phone"] },
    { persona: "30대 직장인", personaEn: "an office worker in their 30s", action: "창밖 아파트 단지를 올려다보며 휴대폰을 꼭 쥔", actionEn: "gripping a phone while looking up at apartment towers through a window", emotion: "'저기 들어갈 수 있을까'라는 간절함", emotionEn: "wistful longing — 'could that be mine?'", props: ["휴대폰", "창문 너머 아파트 실루엣"], propsEn: ["a phone", "apartment silhouettes beyond the window"] },
    { persona: "40대 부모", personaEn: "a parent in their 40s", action: "식탁에 계약서류를 펼쳐 두고 이마에 손을 얹은", actionEn: "hand on forehead over contract papers spread on the table", emotion: "'조건이 왜 이렇게 복잡해' 하는 부담", emotionEn: "overwhelmed by complicated terms", props: ["계약서류", "안경"], propsEn: ["contract papers", "glasses"] },
  ]],
  [/(세금|고지서|납부|주민세|재산세|종부세|국세|공과금|전기요금|관리비)/, [
    { persona: "30~50대 생활자", personaEn: "an everyday person in their 30s-50s", action: "식탁 위 고지서를 보고 눈이 커지는", actionEn: "eyes going wide at a bill on the kitchen table", emotion: "'돈이 더 나가네'라는 놀람과 부담감", emotionEn: "startled burden — 'more money going out'", props: ["고지서", "펜"], propsEn: ["a paper bill", "a pen"] },
    { persona: "40대 직장인", personaEn: "an office worker in their 40s", action: "우편함에서 꺼낸 봉투를 뜯다 멈칫하는", actionEn: "pausing mid-tear opening an envelope from the mailbox", emotion: "'이번엔 얼마나 나왔을까'라는 불안", emotionEn: "anxious anticipation of the amount", props: ["봉투", "우편함"], propsEn: ["an envelope", "a mailbox"] },
    { persona: "30대 1인 가구", personaEn: "a single-household person in their 30s", action: "휴대폰 납부 알림과 지갑을 번갈아 보는", actionEn: "looking back and forth between a payment alert and a wallet", emotion: "'이번 달 빠듯한데' 하는 한숨 직전의 표정", emotionEn: "on the verge of a sigh — tight month", props: ["휴대폰", "지갑"], propsEn: ["a phone", "a wallet"] },
  ]],
  [/(연금|월급|급여|보험료|국민연금|실수령|연봉)/, [
    { persona: "30~40대 직장인", personaEn: "an office worker in their 30s-40s", action: "급여명세서를 확인하며 멈칫하는", actionEn: "pausing while reading a payslip", emotion: "'월급에서 또 빠지네'라는 손해 느낌", emotionEn: "a sting of loss — 'deducted from my pay again'", props: ["급여명세서", "휴대폰"], propsEn: ["a payslip", "a phone"] },
    { persona: "50대 직장인", personaEn: "an office worker in their 50s", action: "노트에 은퇴 후 계획을 적다가 펜을 멈춘", actionEn: "pen frozen mid-note while planning retirement", emotion: "'이걸로 충분할까'라는 진지한 걱정", emotionEn: "sober worry — 'will this be enough?'", props: ["노트", "펜"], propsEn: ["a notebook", "a pen"] },
    { persona: "20~30대 사회초년생", personaEn: "a young professional in their 20s-30s", action: "첫 월급 명세서를 들고 갸웃하는", actionEn: "tilting their head at a first-ever payslip", emotion: "'이 항목은 뭐지?'라는 어리둥절함", emotionEn: "puzzled curiosity at a line item", props: ["명세서", "머그컵"], propsEn: ["a payslip", "a mug"] },
  ]],
  [/(물가|생활비|장보기|배달|카드값|소비|외식)/, [
    { persona: "30~50대 생활자", personaEn: "an everyday person in their 30s-50s", action: "가계부 앞에서 지갑 사정을 확인하는", actionEn: "checking their wallet over a household ledger", emotion: "'체감이 다르네'라는 놀람", emotionEn: "surprise at how different it feels", props: ["가계부 또는 영수증", "지갑"], propsEn: ["a ledger or receipts", "a wallet"] },
    { persona: "40대 주부", personaEn: "a homemaker in their 40s", action: "장바구니를 든 채 가격표를 다시 들여다보는", actionEn: "re-reading a price tag while holding a shopping basket", emotion: "'지난달엔 안 이랬는데'라는 당혹", emotionEn: "baffled — 'it wasn't like this last month'", props: ["장바구니", "가격표"], propsEn: ["a shopping basket", "a price tag"] },
    { persona: "30대 직장인", personaEn: "an office worker in their 30s", action: "카드 명세 알림을 보고 휴대폰을 내려놓는", actionEn: "setting the phone down after a card statement alert", emotion: "'내가 이렇게 썼다고?'라는 놀람", emotionEn: "disbelief at their own spending", props: ["휴대폰", "카드"], propsEn: ["a phone", "a credit card"] },
  ]],
  [/(지원금|환급|보조금|혜택|장려금|바우처)/, [
    { persona: "30~40대 생활자", personaEn: "an everyday person in their 30s-40s", action: "휴대폰 알림을 보고 반색하며 몸을 앞으로 기울이는", actionEn: "leaning in with a bright face at a phone alert", emotion: "'나도 받을 수 있나?'라는 기대와 조급함", emotionEn: "eager hope — 'can I get this too?'", props: ["휴대폰", "메모지"], propsEn: ["a phone", "a memo pad"] },
    { persona: "20~30대 사회초년생", personaEn: "a young professional in their 20s-30s", action: "노트북 신청 화면 앞에서 주먹을 살짝 쥔", actionEn: "a small fist pump in front of an application screen on a laptop", emotion: "'됐다!' 직전의 설렘", emotionEn: "the flutter right before 'got it!'", props: ["노트북", "머그컵"], propsEn: ["a laptop", "a mug"] },
    { persona: "40대 부모", personaEn: "a parent in their 40s", action: "아이 옆에서 안내문을 짚어 가며 읽는", actionEn: "tracing lines of a notice sheet with a child nearby", emotion: "'우리 애도 해당되네'라는 반가움", emotionEn: "pleased recognition — 'our kid qualifies'", props: ["안내문", "형광펜"], propsEn: ["a notice sheet", "a highlighter"] },
  ]],
  [/(대출|한도|상환|이자율|주담대|전세자금)/, [
    { persona: "30~40대 직장인", personaEn: "an office worker in their 30s-40s", action: "은행 창구 번호표를 쥐고 기다리는", actionEn: "waiting with a bank queue ticket in hand", emotion: "'한도가 나올까'라는 초조함", emotionEn: "nervous 'will I qualify?' suspense", props: ["번호표", "서류 파일"], propsEn: ["a queue ticket", "a document folder"] },
    { persona: "30대 부부", personaEn: "a couple in their 30s", action: "노트북 화면의 숫자를 같이 들여다보는", actionEn: "leaning together over numbers on a laptop screen", emotion: "'월 상환이 이만큼이라고?'라는 놀람", emotionEn: "shared surprise at a monthly payment figure", props: ["노트북", "계산기"], propsEn: ["a laptop", "a calculator"] },
    { persona: "40대 가장", personaEn: "a breadwinner in their 40s", action: "서류 뭉치에 도장을 쥐고 잠시 멈춘", actionEn: "pausing with a stamp held over a stack of papers", emotion: "'이 결정이 맞나'라는 신중함", emotionEn: "weighty hesitation before committing", props: ["서류 뭉치", "도장"], propsEn: ["a stack of papers", "a personal seal stamp"] },
  ]],
  [/(주식|증시|배당|공모주|상장|투자)/, [
    { persona: "30~40대 직장인", personaEn: "an office worker in their 30s-40s", action: "휴대폰 시세 화면을 보다 숨을 삼키는", actionEn: "catching their breath at a price chart on a phone", emotion: "'지금 들어가야 하나'라는 갈등", emotionEn: "torn 'should I get in now?' conflict", props: ["휴대폰", "이어폰"], propsEn: ["a phone", "earphones"] },
    { persona: "20~30대 사회초년생", personaEn: "a young investor in their 20s-30s", action: "점심시간 사무실 구석에서 몰래 휴대폰을 확인하는", actionEn: "sneaking a phone check in an office corner at lunch", emotion: "'오늘은 올랐을까'라는 두근거림", emotionEn: "heart-racing 'did it go up today?'", props: ["휴대폰", "도시락"], propsEn: ["a phone", "a lunchbox"] },
    { persona: "50대 생활자", personaEn: "an everyday person in their 50s", action: "신문 경제면을 접어 두고 안경을 고쳐 쓰는", actionEn: "adjusting glasses over a folded newspaper business section", emotion: "'이번엔 신중하게'라는 차분한 결심", emotionEn: "calm resolve to be careful this time", props: ["신문", "안경"], propsEn: ["a newspaper", "glasses"] },
  ]],
  [/(보험|실손|보장|청구)/, [
    { persona: "30~40대 생활자", personaEn: "an everyday person in their 30s-40s", action: "보험 안내장을 펼쳐 들고 갸웃하는", actionEn: "tilting their head at an unfolded insurance leaflet", emotion: "'내가 가입한 게 뭐였지?'라는 어리둥절함", emotionEn: "puzzled — 'what did I even sign up for?'", props: ["안내장", "형광펜"], propsEn: ["a leaflet", "a highlighter"] },
    { persona: "40대 부모", personaEn: "a parent in their 40s", action: "병원 영수증과 휴대폰을 나란히 놓고 확인하는", actionEn: "checking a hospital receipt against a phone side by side", emotion: "'이거 돌려받을 수 있나?'라는 기대", emotionEn: "hopeful — 'can I get this back?'", props: ["영수증", "휴대폰"], propsEn: ["a receipt", "a phone"] },
    { persona: "30대 직장인", personaEn: "an office worker in their 30s", action: "서류에 서명하기 직전 펜을 든 채 멈춘", actionEn: "pen hovering right before signing a form", emotion: "'조건을 다시 봐야 하나'라는 신중함", emotionEn: "cautious pause before signing", props: ["서류", "펜"], propsEn: ["a form", "a pen"] },
  ]],
];

const DEFAULT_SCENES: SceneVariant[] = [
  { persona: "30~50대 생활자", personaEn: "an everyday person in their 30s-50s", action: "휴대폰과 문서를 번갈아 확인하는", actionEn: "checking between a phone and a document", emotion: "놀람과 긴장 중 하나만 분명하게", emotionEn: "one clear emotion — surprise or tension", props: ["휴대폰", "문서"], propsEn: ["a phone", "a document"] },
  { persona: "30~40대 직장인", personaEn: "an office worker in their 30s-40s", action: "책상에 앉아 화면을 보다 몸을 앞으로 기울이는", actionEn: "leaning forward at a screen at their desk", emotion: "'이건 나도 해당되는데?'라는 몰입", emotionEn: "drawn-in focus — 'this applies to me'", props: ["노트북", "머그컵"], propsEn: ["a laptop", "a mug"] },
  { persona: "40대 생활자", personaEn: "an everyday person in their 40s", action: "식탁에서 안내문을 짚어 가며 읽는", actionEn: "tracing lines of a notice sheet at the kitchen table", emotion: "'미리 알아 다행이다'라는 안도 직전의 진지함", emotionEn: "serious focus just before relief", props: ["안내문", "볼펜"], propsEn: ["a notice sheet", "a pen"] },
];

// ★변주 축 — 장소·색 무드·인물 배치가 시드로 돌아 같은 주제군도 다른 그림이 된다
const PLACES: { ko: string; en: string }[] = [
  { ko: "집 식탁", en: "a home kitchen table" },
  { ko: "사무실 책상", en: "an office desk" },
  { ko: "거실 소파", en: "a living room sofa" },
  { ko: "아침의 부엌", en: "a morning kitchen" },
  { ko: "퇴근길 지하철 안", en: "a subway car on the evening commute" },
];
const MOODS: { ko: string; en: string }[] = [
  { ko: "따뜻한 베이지·크림 톤", en: "warm beige and cream pastel tones" },
  { ko: "연한 민트·화이트 톤", en: "soft mint and white pastel tones" },
  { ko: "라벤더·연보라 톤", en: "lavender pastel tones" },
  { ko: "피치·코랄 톤", en: "peach and coral pastel tones" },
  { ko: "연하늘·화이트 톤", en: "pale sky-blue and white pastel tones" },
];
const SIDES: { ko: string; en: string }[] = [
  { ko: "화면 왼쪽", en: "the left side of the frame" },
  { ko: "화면 오른쪽", en: "the right side of the frame" },
  { ko: "화면 중앙", en: "the center of the frame" },
];

function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

function scenesFor(text: string): SceneVariant[] {
  for (const [re, list] of TOPIC_PROFILES) if (re.test(text)) return list;
  return DEFAULT_SCENES;
}

export interface ThumbSceneParts { scene: SceneVariant; place: { ko: string; en: string }; mood: { ko: string; en: string }; side: { ko: string; en: string } }
/** 시드 → 장면 조합(장면×장소×무드×배치). 같은 키워드라도 시드가 다르면 다른 그림. */
export function pickThumbScene(keyword: string, seed?: number | string): ThumbSceneParts {
  const s = typeof seed === "number" ? seed : fnv(`${keyword}|${seed ?? ""}`);
  const list = scenesFor(keyword);
  return {
    scene: list[s % list.length]!,
    place: PLACES[(s >>> 3) % PLACES.length]!,
    mood: MOODS[(s >>> 6) % MOODS.length]!,
    side: SIDES[(s >>> 9) % SIDES.length]!,
  };
}

// ★하단 여백 — v2의 '여백을 남긴다'는 부드러운 문장을 모델이 무시했다(2026-08-17 실물). 숫자로 못 박는다.
const MARGIN_KO = "★구도(가장 중요한 규칙): 인물과 모든 소품은 화면 위쪽 65% 안에만 배치한다. 화면 아래쪽 35%는 아무것도 없는 단순한 단색 배경 띠로 완전히 비워 둔다 — 이 자리에 나중에 문구가 올라간다. 인물의 손, 팔, 소품, 가구가 아래쪽 35%로 내려오면 실패작이다.";
const MARGIN_EN = "COMPOSITION (the single most important rule): the person and every prop stay strictly inside the TOP 65% of the square. The BOTTOM 35% is a completely empty band of plain flat background color — no hands, arms, props, furniture, patterns, or details there (a Korean headline will be overlaid on that band later). If anything enters the bottom 35%, the image fails.";

const THUMB_BAN_KO = "금지: 차트, 그래프, 건물 전경 단독, 돈다발 중심 구도, 소품 3개 이상, 복잡한 배경, 무표정 인물, 작게 보이는 피사체, 경제 기사 삽화 느낌. 이미지 안에 글자·숫자·로고 절대 금지.";
const THUMB_BAN_EN = "FORBIDDEN: charts, graphs, standalone building exteriors, piles of cash as the focus, more than 2 props, busy backgrounds, expressionless faces, tiny distant subjects, news-editorial illustration vibes. Absolutely no letters, numbers, or logos anywhere in the image.";

/** 썸네일(한국어 — 복사해서 외부 생성기에 쓰는 용). 0.5초 안에 감정이 읽히는 '내 돈에 생긴 일' 장면. */
export function buildThumbImagePrompt(keyword: string, scene?: string | null, lane: ImageLane = "home", seed?: number | string): string {
  const p = pickThumbScene(keyword, seed);
  const laneTone = lane === "search"
    ? "검색형 정보글 썸네일이므로 과한 감정보다 주제와 상황이 명확하게 전달되도록."
    : "홈피드에서 스크롤을 멈추게 하는 강한 생활경제 장면 — 표정과 몸짓에서 감정이 0.5초 안에 읽히게.";
  return [
    `${p.mood.ko}의 부드럽고 깔끔한 2D 일러스트.`,
    scene?.trim()
      ? `${scene.trim()} 장면을 상반신 위주로 크게 보여준다.`
      : `${p.place.ko}에서 한국의 ${p.scene.persona} 1명이 ${p.scene.action} 장면을 상반신 위주로 크게 보여준다.`,
    `감정은 ${p.scene.emotion} — 하나만 분명하게, 표정과 손짓에 드러나게.`,
    `소품은 ${p.scene.props[0]}, ${p.scene.props[1]}까지만.`,
    `경제 뉴스나 제도 자체보다 '${keyword}' 때문에 벌어진 생활 장면이 보이게.`,
    `인물은 ${p.side.ko}에 크게(상반신 클로즈업 — 얼굴과 손이 작게 보이면 실패), 배경은 매우 단순하게.`,
    MARGIN_KO,
    laneTone,
    THUMB_BAN_KO,
    "모바일 썸네일 용도이므로 작은 크기에서도 감정과 핵심 장면이 즉시 읽히게.",
  ].join(" ");
}

/** 썸네일(영어 미러 — 내장 생성 geminiImage 경로용. 한글을 프롬프트에 넣으면 모델이 글자를 그린다 — 전량 영어 원칙). */
export function buildThumbScenePromptEn(topicEn: string, koKeyword: string, lane: ImageLane = "home", seed?: number | string): string {
  const p = pickThumbScene(koKeyword || topicEn, seed);
  const laneTone = lane === "search"
    ? "This is for an informational search-result thumbnail: clarity of situation over exaggerated emotion."
    : "This is for a social home feed: a strong everyday-money moment that stops the scroll — the emotion must read within half a second.";
  return [
    `Soft, clean 2D flat illustration in ${p.mood.en}.`,
    `In ${p.place.en}, ONE Korean person — ${p.scene.personaEn} — is ${p.scene.actionEn}, shown large from the waist up.`,
    `Their emotion: ${p.scene.emotionEn} — exactly one emotion, clearly visible in the face and hands.`,
    `Props: only ${p.scene.propsEn[0]} and ${p.scene.propsEn[1]}, nothing else.`,
    `Topic context (understand only — never render as text): "${topicEn}". Show the LIFE MOMENT this topic causes, not the topic itself.`,
    `Place the person large on ${p.side.en} (close-up from the waist up — if the face or hands look small, it fails). Keep the background extremely simple.`,
    MARGIN_EN,
    laneTone,
    THUMB_BAN_EN,
    "This is a mobile thumbnail: the emotion and the moment must read instantly even at small sizes. Square 1:1, full-bleed, no frames or borders.",
  ].join(" ");
}

// ── v4(2026-08-17): 설계 장면(designThumbScene) → 최종 프롬프트 — 하드 규칙(여백·금지)은 코드가 강제 ──
import type { DesignedScene } from "./thumbScene";
export function buildThumbPromptFromDesign(d: DesignedScene, keyword: string, lane: ImageLane = "home", seed?: number | string): string {
  const mood = MOODS[(typeof seed === "number" ? seed : fnv(`${keyword}|${seed ?? ""}`)) % MOODS.length]!;
  const laneTone = lane === "search"
    ? "검색형 정보글 썸네일이므로 과한 감정보다 주제와 상황이 명확하게 전달되도록."
    : "홈피드에서 스크롤을 멈추게 하는 강한 생활경제 장면 — 표정과 몸짓에서 감정이 0.5초 안에 읽히게.";
  return [
    `${mood.ko}의 부드럽고 깔끔한 2D 일러스트.`,
    `${d.placeKo}에서 한국의 ${d.personaKo} 1명이 ${d.actionKo} 장면을 상반신 위주로 크게 보여준다.`,
    `감정은 ${d.emotionKo} — 하나만 분명하게, 표정과 손짓에 드러나게.`,
    `소품은 ${d.propsKo[0]}, ${d.propsKo[1]}까지만.`,
    `★주제 앵커(반드시 그림에 보이게): ${d.anchorKo} — 이 요소가 있어야 '${keyword}' 글의 썸네일임이 1초 안에 전해진다. 단 글자·숫자 없이.`,
    "인물은 크게(상반신 클로즈업 — 얼굴과 손이 작게 보이면 실패), 배경은 매우 단순하게.",
    MARGIN_KO,
    laneTone,
    THUMB_BAN_KO,
    "모바일 썸네일 용도이므로 작은 크기에서도 감정과 핵심 장면이 즉시 읽히게.",
  ].join(" ");
}
export function buildThumbPromptFromDesignEn(d: DesignedScene, topicEn: string, lane: ImageLane = "home", seed?: number | string): string {
  const mood = MOODS[(typeof seed === "number" ? seed : fnv(`${topicEn}|${seed ?? ""}`)) % MOODS.length]!;
  const laneTone = lane === "search"
    ? "This is for an informational search-result thumbnail: clarity of situation over exaggerated emotion."
    : "This is for a social home feed: a strong everyday-money moment that stops the scroll — the emotion must read within half a second.";
  return [
    `Soft, clean 2D flat illustration in ${mood.en}.`,
    `In ${d.placeEn}, ONE Korean person — ${d.personaEn} — is ${d.actionEn}, shown large from the waist up.`,
    `Their emotion: ${d.emotionEn} — exactly one emotion, clearly visible in the face and hands.`,
    `Props: only ${d.propsEn[0]} and ${d.propsEn[1]}, nothing else.`,
    `TOPIC ANCHOR (must be clearly visible): ${d.anchorEn} — this element tells viewers in one second what the article is about. It must work WITHOUT any letters or numbers.`,
    `Topic context (understand only — never render as text): "${topicEn}".`,
    "Place the person large (close-up from the waist up — if the face or hands look small, it fails). Keep the background extremely simple.",
    MARGIN_EN,
    laneTone,
    THUMB_BAN_EN,
    "This is a mobile thumbnail: the emotion and the moment must read instantly even at small sizes. Square 1:1, full-bleed, no frames or borders.",
  ].join(" ");
}

// 본문 역할 자동 판별 — 슬롯 설명에서 유추(SCENE/EVIDENCE/EXPLAIN/REST)
export function inferBodyRole(sceneDesc: string): BodyImageRole {
  const t = String(sceneDesc ?? "");
  if (/(서류|절차|신청|도장|접수|준비물|달력|일정|캘린더|마감)/.test(t)) return "explain";
  if (/(표|자료|캡처|공고|공식|근거|화면)/.test(t)) return "evidence";
  if (/(휴식|분위기|정리|마무리)/.test(t)) return "rest";
  return "scene";
}

const ROLE_LINE: Record<BodyImageRole, string> = {
  scene: "이 이미지는 본문 속 생활 장면(분위기 환기·체감 전달) 역할이다.",
  evidence: "이 이미지는 본문 속 근거 보조 역할이다 — 실제 자료를 떠올리게 하되 글자는 넣지 않는다.",
  explain: "이 이미지는 본문 속 절차·개념 설명 보조 역할이다 — 서류·달력·통장 같은 개념적 장면으로.",
  rest: "이 이미지는 긴 텍스트 사이 쉬어가는 환기 역할이다 — 차분하고 정돈된 장면으로.",
};

/** 본문 — 읽는 흐름을 돕는 것. 썸네일보다 감정이 약해야 한다. */
export function buildBodyImagePrompt(sceneDesc: string, keyword: string, role?: BodyImageRole): string {
  const r = role ?? inferBodyRole(sceneDesc);
  return [
    "깔끔하고 부드러운 2D 일러스트.",
    `${sceneDesc.trim()} 장면을 보여준다.`,
    keyword?.trim() ? `이 글의 주제 '${keyword.trim()}'가 연상되는 시각 요소를 최소 1개 담는다(글자·숫자 없이 그릴 수 있는 것만).` : "",
    "한국의 생활경제/직장인 맥락에 어울리게, 과한 표정이나 과장된 연출은 줄이고 본문 내용을 보조하는 자연스러운 장면으로 표현.",
    ROLE_LINE[r],
    "배경은 단순하되 썸네일보다는 조금 더 문맥이 느껴지게. 소품은 3개 이내.",
    "정보글 본문에 들어갈 이미지이므로 설명을 방해하지 않도록 차분하고 정돈된 분위기.",
    "텍스트가 없어도 의미가 전달되게 — 이미지 안에 글자·숫자·로고 금지.",
    "너무 광고 같거나 자극적인 구도는 피한다.",
  ].filter(Boolean).join(" ");
}
