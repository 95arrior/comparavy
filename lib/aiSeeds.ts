import Anthropic from "@anthropic-ai/sdk";

// 카테고리(라벨) → 그 분야의 '구체 하위주제 키워드' 다수 생성.
// 카테고리명 하나만으론 네이버 연관이 적게 나와 풀이 얕음 → AI로 하위주제를 펼쳐
// 각각을 네이버 연관 수집 시드로 써서 풀을 폭발적으로 키운다(카테고리당 1회·캐싱).
export async function expandSeeds(label: string, max = 15): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const clean = label.replace(/·/g, " ").trim();
  if (!apiKey || clean.length < 1) return [];
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content:
            `'${clean}' 분야의 블로그가 글을 쓸 만한 '구체적인 하위 주제 키워드'를 ${max}개 뽑아줘.\n` +
            "- 사람들이 실제로 네이버에 검색하는 구체 키워드(제품·서비스·상황·비교·후기·방법 등). 한 단어로 너무 일반적인 건 피하고 2~4어절 구체 키워드 위주.\n" +
            "- 이 분야의 '핵심 업무·관심사'를 폭넓게 커버 — 서로 다른 하위주제로 최대한 다양하게.\n" +
            "- 무관한 다른 분야 키워드는 절대 넣지 마.\n" +
            'JSON 배열로만 답해: ["키워드1","키워드2", ...]',
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const m = text.match(/\[[\s\S]*\]/);
    const arr = m ? (JSON.parse(m[0]) as unknown[]) : [];
    return arr
      .filter((x): x is string => typeof x === "string" && x.trim().length > 1)
      .map((x) => x.trim())
      .slice(0, max);
  } catch {
    return []; // 실패 시 기본 시드만(현행 동작)
  }
}
