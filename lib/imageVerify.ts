import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

// ★생성 후 비전 검증 1회(Haiku) — 텍스트 포함/얼굴/장면 일치. 대표 배경은 텍스트만 검사.
//  실패 시 호출측이 재생성 1회 → 재실패 시 컷 드롭(본문) / 코드 폴백(배경).
//
// ★4회차 사고(2026-07-31): 썸네일 배경에 한글 '은행'이 박힌 카드가 그대로 나갔다.
//  유저가 같은 지적을 네 번 했고 메모에 "예외 조항 두지 말 것"이라고 못박혀 있던 항목이다.
//  통과시킨 경로가 하나가 아니라 넷이었다 — 전부 '조용히 통과'였다:
//   ① API 오류·타임아웃 → catch에서 ok:true
//   ② JSON 파싱 실패 → 빈 객체 → hasText=false
//   ③ ANTHROPIC_API_KEY 없음 → 검사 없이 통과
//   ④ composeThumbnail의 press 모드는 검증 자체를 건너뜀
//  ★배경 검증은 fail-closed로 바꾼다. 배경은 떨어져도 코드 폴백이 항상 있어서 잃는 게 없다 —
//   '검증 실패는 발행 막지 않음'이라는 원칙은 대안이 없는 경로에나 맞는 말이었다.
export interface ImageVerdict { hasText: boolean; hasFace: boolean; matchesScene: boolean; ok: boolean }

export interface VerifyOpts {
  bgOnly?: boolean;
  userId?: string;
  /** 판정 불가(오류·파싱 실패·키 없음)를 '글자 있음'으로 본다. 코드 폴백이 있는 배경 경로에서 켠다. */
  strict?: boolean;
}

/** 판정 불가 상태의 결과 — strict면 불합격으로 떨어뜨린다. */
export function unknownVerdict(strict: boolean | undefined): ImageVerdict {
  return strict
    ? { hasText: true, hasFace: false, matchesScene: true, ok: false }
    : { hasText: false, hasFace: false, matchesScene: true, ok: true };
}

/**
 * 모델 응답 텍스트 → 판정. ★순수 함수로 분리해 회귀 테스트가 '조용히 통과' 경로를 직접 검증한다.
 * 파싱이 안 되거나 hasText 필드가 아예 없으면 판정 불가로 본다(빈 객체를 '글자 없음'으로 읽던 것이 ②번 사고).
 */
export function verdictFromRaw(raw: string, opts?: VerifyOpts): ImageVerdict {
  const m = /\{[\s\S]*\}/.exec(raw ?? "");
  if (!m) return unknownVerdict(opts?.strict);
  let j: Record<string, unknown>;
  try { j = JSON.parse(m[0]) as Record<string, unknown>; } catch { return unknownVerdict(opts?.strict); }
  if (typeof j.hasText !== "boolean") return unknownVerdict(opts?.strict); // 필드 자체가 없으면 '없다'가 아니라 '모른다'
  const hasText = j.hasText;
  const hasFace = j.hasFace === true;
  const matchesScene = opts?.bgOnly ? true : (j.matchesScene !== false);
  return { hasText, hasFace, matchesScene, ok: !hasText && !hasFace && matchesScene };
}

// ★무문구 썸네일 판독성 검사(2026-08-02) — 글자가 없어지면 이미지 혼자 3초를 버텨야 한다.
//  홈피드 썸네일은 200~400px로 렌더된다(명함보다 작다). 여기서 실패하는 유형은 정해져 있다:
//   ① 피사체가 2개 이상이라 축소 시 뭉갬  ② 뭘 찍었는지 모르겠음  ③ 스톡 사진·광고처럼 보임
//  픽셀 단위 검사는 이미지 디코더가 없어 못 한다(sharp 미설치) — 대신 이미 쓰고 있는 비전 모델에 묻는다.
//  ★fail-open이다. 판정 불가면 통과시킨다 — 글자 검사(fail-closed)와 달리 여기는 '취향' 영역이고,
//   떨어뜨리면 썸네일이 아예 없어진다. 글자 사고와 달리 잃는 게 크다.
export interface LegibilityVerdict { single: boolean; identifiable: boolean; adLike: boolean; nameable: boolean; ok: boolean }

export function legibilityFromRaw(raw: string): LegibilityVerdict {
  const m = /\{[\s\S]*\}/.exec(raw ?? "");
  const pass: LegibilityVerdict = { single: true, identifiable: true, adLike: false, nameable: true, ok: true };
  if (!m) return pass;
  let j: Record<string, unknown>;
  try { j = JSON.parse(m[0]) as Record<string, unknown>; } catch { return pass; }
  const single = j.singleSubject !== false;
  const identifiable = j.identifiableWhenTiny !== false;
  const adLike = j.looksLikeAd === true;
  // ★실루엣 관문(2026-08-02 실측: 명함 더미가 '종이 뭉치'로만 보였다) — 무엇인지 한 단어로 말할 수 있어야 한다.
  //  identifiable("뭘 찍었는지 알겠나")은 '종이 더미'라고 답해도 통과였다. 이건 '한 단어로 이름 대기'를 요구한다.
  const nameable = j.nameableInOneWord !== false;
  // ★2026-08-02 유저 확정("그냥 딱 어그로, 무조건 클릭") — adLike는 관측만 하고 반려하지 않는다.
  //  실측: 이 판정이 이미지를 얌전하게 만들어 클릭률을 깎고 있었다(1차 시도가 이것 때문에 2회 반려).
  //  홈피드에서 지는 건 못생긴 사진이 아니라 안 보이는 사진이다 — 그래서 single·identifiable만 남긴다.
  // ★2026-08-02 완화: nameable("한 단어로 이름 대기")을 반려 사유에서 뺀다.
  //  게이트를 겹겹이 쌓았더니 AI가 2회 모두 떨어져 아예 못 만드는 상태가 됐다(유저 지적).
  //  관측은 유지하되, 실제로 막는 건 '피사체 하나'와 '작게 줄여도 보임' 둘뿐이다.
  return { single, identifiable, adLike, nameable, ok: single && identifiable };
}

/** 무문구 썸네일이 작은 크기에서 살아남는가. 실패하면 호출측이 재생성 1회. */
export async function verifyThumbLegible(base64: string, mime: string, opts?: { userId?: string }): Promise<LegibilityVerdict> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { single: true, identifiable: true, adLike: false, nameable: true, ok: true };
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 160,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: (mime || "image/png") as "image/png", data: base64 } },
        { type: "text", text: `이 이미지는 블로그 썸네일로 쓰인다. 실제로는 명함보다 작게(가로 200픽셀 정도) 표시된다. (1)초점이 되는 피사체가 딱 하나인가(잡동사니가 흩어져 있으면 아니다) (2)그 크기로 줄였을 때도 무엇을 찍었는지 알아볼 수 있는가 (3)스톡 사진이나 광고처럼 보이는가(반질반질한 스튜디오 톤, 웃는 모델, 과한 채도) (4)★그 크기에서 실루엣만 보고 이게 '무엇'인지 한 단어로 댈 수 있는가 — '종이 뭉치'·'무언가 쌓인 것'처럼 뭉뚱그린 답밖에 안 나오면 아니다. JSON만: {"singleSubject":bool,"identifiableWhenTiny":bool,"looksLikeAd":bool,"nameableInOneWord":bool,"why":"짧게"}` },
      ] }],
    });
    void logUsage({ userId: opts?.userId, model: "claude-haiku-4-5", kind: "thumb_legibility", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const t = res.content[0]?.type === "text" ? res.content[0].text : "";
    return legibilityFromRaw(t);
  } catch {
    return { single: true, identifiable: true, adLike: false, nameable: true, ok: true }; // fail-open
  }
}

export async function verifyImage(
  base64: string, mime: string, sceneDesc: string, opts?: VerifyOpts,
): Promise<ImageVerdict> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return unknownVerdict(opts?.strict); // 키가 없으면 '검사 안 함'이지 '글자 없음'이 아니다
  try {
    const client = new Anthropic({ apiKey });
    // ★잘린 글자·사물 표면 글자를 명시한다 — 실측 사고가 '카드 위에 부분적으로 잘린 한글 두 글자'였다.
    //  where를 함께 요구하는 이유는 값 자체가 필요해서가 아니라, 근거를 대게 하면 실제로 들여다보기 때문이다.
    const q = opts?.bgOnly
      ? `이 이미지에 글자·문자·숫자·로고·워터마크가 조금이라도 보이는가? 간판·카드·표지판·버튼·책·서류 같은 사물 표면에 적힌 글자, 화면 밖으로 잘려 일부만 보이는 글자, 흐릿하거나 작은 글자도 전부 '있음'으로 본다. JSON만: {"hasText":bool,"where":"짧게"}`
      : `이 이미지를 점검한다. (1)글자·문자·숫자·로고·워터마크가 보이는가 — 사물 표면에 적힌 글자와 잘려서 일부만 보이는 글자도 포함한다 (2)사람 얼굴(이목구비)이 보이는가 (3)"${sceneDesc}" 장면과 대체로 맞는가. JSON만: {"hasText":bool,"hasFace":bool,"matchesScene":bool,"where":"짧게"}`;
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 160,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: (mime || "image/png") as "image/png", data: base64 } },
        { type: "text", text: q },
      ] }],
    });
    void logUsage({ userId: opts?.userId, model: "claude-haiku-4-5", kind: "image_verify", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const t = res.content[0]?.type === "text" ? res.content[0].text : "";
    return verdictFromRaw(t, opts);
  } catch {
    return unknownVerdict(opts?.strict); // strict면 떨어뜨린다 — 배경은 코드 폴백이 있어 잃는 게 없다
  }
}
