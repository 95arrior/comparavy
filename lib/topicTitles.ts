// 키워드 → 매력적인 질문/클릭형 글감 제목 변환. haiku 1회 일괄 변환, 실패 시 템플릿 폴백.
import Anthropic from "@anthropic-ai/sdk";

// 템플릿 폴백 — AI 키 없음/오류 시. 키워드를 자연스러운 글감 제목으로.
const TEMPLATES = [
  (k: string) => `${k}, 꼭 알아야 할 것들`,
  (k: string) => `${k} 전에 확인하면 좋은 것`,
  (k: string) => `${k} 총정리`,
  (k: string) => `${k}, 이것만 알면 됩니다`,
];

function templateTitle(keyword: string, i: number): string {
  return TEMPLATES[i % TEMPLATES.length](keyword);
}

/**
 * 키워드 배열 → 같은 길이의 글감 제목 배열. 순서·개수 보존.
 * AI는 클릭하고 싶은 질문/정리형 제목으로(과장·낚시 금지). 실패하면 템플릿으로 채운다.
 */
export async function keywordsToTitles(keywords: string[]): Promise<string[]> {
  if (keywords.length === 0) return [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return keywords.map((k, i) => templateTitle(k, i));

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content:
            "다음 키워드 각각을, 블로그 방문자가 클릭하고 싶어지는 한국어 글감 제목으로 바꿔줘.\n" +
            "규칙: ① 검색 의도가 담기게(정보형) ② 과장·낚시·이모지·따옴표 금지 ③ 한 줄에 들어가게 16자 안팎(최대 20자) — 짧고 간결하게, 절대 길게 늘리지 말 것 ④ 키워드 핵심어는 제목에 유지.\n" +
            "예) 임플란트 → 임플란트, 며칠 걸릴까?\n" +
            "예) 종합소득세 → 종소세 신고, 이 순서대로\n" +
            "예) ETF → ETF, 초보는 뭐부터?\n\n" +
            `키워드: ${JSON.stringify(keywords)}\n\n` +
            'JSON 배열로만 답해. 형식: ["제목1","제목2",...] (입력과 같은 순서·개수).',
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    const m = text.match(/\[[\s\S]*\]/);
    const arr = m ? (JSON.parse(m[0]) as unknown[]) : [];
    // 개수 보존: AI가 빠뜨리면 그 자리에 템플릿
    return keywords.map((k, i) => {
      const t = arr[i];
      return typeof t === "string" && t.trim() ? t.trim() : templateTitle(k, i);
    });
  } catch {
    return keywords.map((k, i) => templateTitle(k, i));
  }
}
