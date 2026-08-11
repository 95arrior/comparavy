// ★인스타 카드뉴스 압축(2026-08-11 유저: "네이버만 올리는 게 아깝다 — 한 글감을 인스타용으로도").
//
//  구조: 완성된(팩트 크로스체크 통과한) 블로그 글을 카드뉴스 문구로 압축한다 — 새 사실 생성 금지, 압축만.
//  그래서 인스타 버전도 본문과 같은 신뢰도를 갖는다. 이미지는 유저가 직접 구한다(문구만 만든다).
//  ★표지는 홈판 썸네일 문법(유저 지시: "결핍을 긁거나 돈으로 유혹") — 검색이 아니라 피드 판이라 대중 훅이 무기다.
//  ★장수는 6~10 가변(유저 '제한 없이' 요청에 상한을 되돌려 제안·승인 — 인스타 캐러셀 기술 상한 10장, 완독은 6~8장).

import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

export interface InstaCard { head: string; body: string }
export interface ClipSegment { say: string; motion: string }
// ★hook도 컷이다 + 캐릭터·배경 묘사를 프롬프트에 통째로 굽는다(2026-08-11 유저: "캐릭터까지 묘사, 프롬프트에 아예 녹여내자" —
//  'reference image' 문구는 이미지 없는 모드에서 오류·혼란을 만든다. 글로 고정하면 어느 모드든 돌고 컷 간 일관성도 글이 보장).
export interface ClipScript { hook: ClipSegment; segments: ClipSegment[]; character: string; background: string; styleAnchor: string; cta: string }
export interface InstaPack { cover: string; cards: InstaCard[]; cta: InstaCard; caption: string; clip?: ClipScript }

export async function articleToInstaCards(title: string, bodyHtml: string, keyword: string, userId?: string | null): Promise<InstaPack | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const text = String(bodyHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
  if (text.length < 300) return null;
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 3200, // ★1900→3200(2026-08-11 실측: 컷별 모션 프롬프트 추가 후 실본문에서 JSON이 상한에 잘려 복불복 실패 — 로컬 짧은 본문만 성공)
    messages: [{
      role: "user",
      content: [
        `아래 블로그 글(제목: "${title}", 키워드: "${keyword}")을 인스타그램 카드뉴스 문구로 압축해라. 경제·재테크 계정이다.`,
        "★절대 규칙: 글에 있는 사실만 쓴다 — 새 숫자·새 주장 금지(이 글은 팩트체크를 통과했고, 카드는 압축본이다).",
        "",
        "[표지 cover] 홈피드 훅 문법 — 결핍을 긁거나 돈으로 유혹: 잃는 돈·놓치는 혜택·구체 숫자 앵커. 최대 2줄(\\n), 줄당 12자 내. 제목 문장 반복 금지 — 표지는 궁금증, 카드가 답. 예: '현금 3,000만\\n없으면 막힌다'.",
        "[카드 cards] 4~8장. 각 장 = head(한 줄 12자 내) + body(2~3줄, 줄당 18자 내, \\n 구분). 표지의 궁금증을 순서대로 푼다: 무슨 일이 → 왜 → 핵심 숫자·조건 → 함정 → 지금 할 것. 앞 장 끝이 다음 장을 궁금하게(넘기게 만드는 흐름).",
        "[마지막 장 cta] head=행동 한 줄, body=오늘 할 첫걸음 + '자세한 계산·최신 기준은 프로필 링크에'.",
        "[caption] 인스타 캡션: 훅 1줄 + 핵심 요약 2~3줄 + 해시태그 12~15개(#재테크 #경제 같은 대중 태그 + 소재 태그. 한 줄에 몰아서).",
        "[클립 clip] 네이버 클립용 — 캐릭터가 '키워드 그 자체'가 되어 가르치듯 말한다(2026-08-11 유저 확정 규격·예시):",
        "  hook = 의인화 오프닝 컷 {say, motion}: say는 '나 {키워드 핵심}인데! {가장 충격적인 돈 팩트 한 문장}! 지금부터 빠르게 알려줄게! 잘 들어!' 결(유저 실례: '나 레버리지인데! 주식 1억 있어도 현금 3천만원 없으면 이제 못 산대!'), motion은 시선을 확 잡는 등장 동작(예: 'The character bursts into frame pointing at the camera with wide excited eyes, quick zoom-in').",
        "  segments = 4~5개(★6개 미만 엄수). 각 세그 say = 10초 분량(2~3문장, 60~90자). ★대사 규칙(2026-08-11 유저 2·3차: '알기 쉽게 재밌게 + 말투 통일'):",
        "   ⓪★화자 고정(최우선, 2026-08-11 유저: '당사자가 이야기하듯 — 지금 레버리지가 이야기하는 거야'): 처음부터 끝까지 화자는 키워드 당사자 본인이다. 3인칭 해설('레버리지는 ~입니다') 절대 금지 — 모든 문장이 자기 이야기다('나는', '나를 사려면', '나한테 걸리면'). 말투는 전부 친근한 반말('~야/~해/~된다고/~봐/~지?')이다. 존댓말('~요/~습니다') 절대 금지 — 컷마다 말투가 바뀌면 캐릭터가 다른 사람처럼 들린다.",
        "   ①훅의 캐릭터를 끝까지 유지 — 컷 2부터 선생님 말투로 돌아가지 마라. 캐릭터=키워드 자신이니 계속 '나'로 말한다('나를 사려면 현금 3천만이 필요해', '나 이제 아무나 못 만나').",
        "   ②중학생도 아는 말만 — 전문용어는 일상어로 번역해서 말한다('대용증권 인정 제외' → '주식으로 대신 내는 건 안 쳐줘', 'T+2일' → '판 돈도 이틀 뒤에야 쳐줘'). 번역 불가능한 용어는 아예 빼라.",
        "   ③한 컷에 개념 하나 + 콕 박히는 숫자 하나만 — 정보를 쑤셔 넣지 마라. 어려운 세부는 '자세한 건 블로그에'로 미룬다.",
        "   ④재미 장치를 컷마다 1개: 충격 대비('1억 있어도 나 못 사'), 실감 숫자('나 하루 거래 12조였는데 3조로 쪼그라들었어'), 가벼운 되물음('빡세지?', '억울하지?').",
        "   ⑤마지막 세그 = 행동 지시('지금 계좌에 진짜 현금 얼마 있는지 봐 봐' + '자세한 계산은 블로그에 정리해 뒀어').",
        "  character = ★주제를 의인화한 캐릭터의 영어 외형 묘사 2문장(2026-08-11 유저: '캐릭터까지 묘사해서 프롬프트에 녹여내자'): 종·형태·색·복장·표정 스타일을 구체적으로 — 이 묘사만 읽고 누가 그려도 같은 캐릭터가 나오게. 몸이나 배경에 글자·숫자 금지. 예(레버리지): 'A round bouncy green coin character with two bold red upward-arrow horns on its head, wearing a tiny navy suit vest, with big expressive cartoon eyes and a confident grin.'",
        "  background = 모든 컷 공통 배경 영어 1문장(주제 분위기, 글자 없는 요소만). 예: 'A clean pastel trading-floor studio with soft glowing chart shapes on the back wall.'",
        "  각 세그 motion = 그 컷의 동작·표정·카메라만 영어 1~2문장(캐릭터·배경·스타일 묘사 금지 — 코드가 구워서 합친다). 예: 'The character leans in and points at the viewer with a warning face, subtle push-in.'",
        "  styleAnchor = 스타일 한 줄(영어): 'Consistent 2D cartoon style, soft shading, subtle smooth motion.' 결 — ★'reference image' 같은 말 금지(이미지 없는 모드에서 오류를 만든다).",
        "  cta = 마무리 대사(반말): '블로그 링크에서 최신 기준 확인하고, 증권사에도 꼭 물어봐! 그래야 정확해' 결. 대사 전부 글에 있는 사실만.",
        "",
        '출력 JSON만: {"cover":"...","cards":[{"head":"...","body":"..."}],"cta":{"head":"...","body":"..."},"caption":"...","clip":{"hook":{"say":"...","motion":"..."},"character":"...","background":"...","styleAnchor":"...","segments":[{"say":"...","motion":"..."}],"cta":"..."}}',
        "", "[본문]", text,
      ].join("\n"),
    }],
  });
  void logUsage({ userId, model: "claude-haiku-4-5", kind: "insta_cards", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
  const t = res.content.find((b) => b.type === "text");
  const m = /\{[\s\S]*\}/.exec(t && t.type === "text" ? t.text : "");
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Partial<InstaPack>;
    const cards = (Array.isArray(j.cards) ? j.cards : [])
      .map((c) => ({ head: String(c?.head ?? "").trim().slice(0, 40), body: String(c?.body ?? "").trim().slice(0, 200) }))
      .filter((c) => c.head && c.body)
      .slice(0, 8); // 표지+내용 8+CTA = 최대 10장(인스타 캐러셀 상한)
    if (!j.cover || cards.length < 3) return null;
    const clipRaw = j.clip as { hook?: { say?: string; motion?: string } | string; character?: string; background?: string; styleAnchor?: string; segments?: { say?: string; motion?: string }[]; cta?: string } | undefined;
    const character = String(clipRaw?.character ?? "").trim().slice(0, 320);
    const backgroundDesc = String(clipRaw?.background ?? "").trim().slice(0, 200);
    const anchor = String(clipRaw?.styleAnchor ?? "Consistent 2D cartoon style, soft shading, subtle smooth motion.").trim().slice(0, 160);
    // ★캐릭터·배경·스타일을 각 컷에 통째로 굽는다(유저: "프롬프트에 아예 녹여내자") — 복사 한 번 = 완성 프롬프트, 레퍼런스 이미지 의존 없음.
    const bake = (m: string) => `${character} ${backgroundDesc} ${anchor} The exact same character and background in every shot. ${m}`.replace(/\s+/g, " ").trim().slice(0, 900);
    const segments = (Array.isArray(clipRaw?.segments) ? clipRaw!.segments : [])
      .map((g) => ({ say: String(g?.say ?? "").trim().slice(0, 160), motion: bake(String(g?.motion ?? "").trim().slice(0, 220)) }))
      .filter((g) => g.say)
      .slice(0, 5); // ★6개 미만(유저 확정)
    const hookRaw = clipRaw?.hook;
    const hook: { say: string; motion: string } = typeof hookRaw === "object" && hookRaw
      ? { say: String(hookRaw.say ?? "").trim().slice(0, 160), motion: bake(String(hookRaw.motion ?? "The character bursts into frame pointing at the camera with an excited face, quick zoom-in.").trim().slice(0, 220)) }
      : { say: String(hookRaw ?? "").trim().slice(0, 160), motion: bake("The character bursts into frame pointing at the camera with an excited face, quick zoom-in.") };
    return {
      cover: String(j.cover).trim().slice(0, 60),
      cards,
      cta: { head: String(j.cta?.head ?? "지금 확인").trim().slice(0, 40), body: String(j.cta?.body ?? "자세한 내용은 프로필 링크에").trim().slice(0, 200) },
      caption: String(j.caption ?? "").trim().slice(0, 1200),
      clip: segments.length >= 3 && hook.say ? { hook, segments, character, background: backgroundDesc, styleAnchor: anchor, cta: String(clipRaw?.cta ?? "블로그 링크에서 최신 기준 확인하고, 증권사에도 꼭 물어봐! 그래야 정확해").trim().slice(0, 160) } : undefined,
    };
  } catch { return null; }
}
