import Anthropic from "@anthropic-ai/sdk";

/**
 * 1차 방어 (규칙, 무료·즉시): 명백한 쓰레기 입력 차단.
 * - 완성 한글 음절(가–힣)·영문자가 2개 미만 → 자모(ㅁㅇ)·숫자·기호만
 * - 의미 글자 종류가 1개뿐 → aaaa / 가가가
 * - 순수 영문인데 모음이 하나도 없음 → qwrt 같은 자판 난타
 * 반환 true = 쓰레기(차단), false = 일단 통과(→ 2차 판별로)
 */
export function looksLikeGarbageKeyword(raw: string): boolean {
  const k = (raw ?? "").trim();
  const meaningful = k.match(/[가-힣a-zA-Z]/g) ?? [];
  if (meaningful.length < 2) return true;
  const uniq = new Set(meaningful.map((c) => c.toLowerCase()));
  if (uniq.size < 2) return true;
  const latinOnly = /^[a-zA-Z\s]+$/.test(k);
  if (latinOnly && !/[aeiou]/i.test(k)) return true;
  return false;
}

/**
 * 2차 방어 (의미 판별, 아주 싼 모델): 규칙을 통과한 입력이 '실제 블로그 주제'인지 판단.
 * 'asdfqwer', 무작위 음절, 의미 없는 문장 등을 걸러 비싼 생성 낭비를 막는다.
 * fail-open: 모델/키 문제 시 통과시켜 제품이 멈추지 않게 한다.
 */
export async function isMeaningfulKeyword(raw: string): Promise<boolean> {
  const keyword = (raw ?? "").trim();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return true;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 5,
      messages: [
        {
          role: "user",
          content:
            `다음 입력이 블로그 글의 주제·키워드로 쓸 수 있는 '실제로 의미 있는 말'인지 판단해.\n` +
            `무작위 문자열, 키보드 난타, 의미 없는 자모·단어·문장이면 NO. 실제 주제(사물·개념·방법·지역·제품 등)면 YES.\n` +
            `입력: "${keyword}"\n\n` +
            `YES 또는 NO, 한 단어로만 답해.`,
        },
      ],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .toUpperCase();
    return !text.startsWith("NO");
  } catch {
    return true; // fail-open
  }
}
