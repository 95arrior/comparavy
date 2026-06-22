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

export interface TitledTopic {
  title: string; // 짧은 글감 제목(한 줄)
  tag: string;   // 내용 카테고리 칩(맛집·블로그·재테크 등). 분류 불가/노이즈면 ""
  ok: boolean;   // 의미 있는 주제면 true. 노이즈(스블 자네·블연플 등)면 false → 호출측에서 제외
}

/**
 * 키워드 배열 → {제목, 카테고리칩, 의미여부} 배열. 순서·개수 보존.
 * 한 번의 AI 호출에서 제목 + 내용 카테고리 분류 + 노이즈 판별을 같이 한다.
 * AI 키 없음/오류면 템플릿으로 채우고 ok=true(드롭 안 함).
 */
export async function keywordsToTitles(keywords: string[]): Promise<TitledTopic[]> {
  if (keywords.length === 0) return [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fallback = (): TitledTopic[] => keywords.map((k, i) => ({ title: templateTitle(k, i), tag: "", ok: true }));
  if (!apiKey) return fallback();

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content:
            "다음 각 키워드를 블로그 글감으로 바꿔줘. 키워드마다 세 가지를 만들어:\n" +
            "• t = 클릭하고 싶은 한국어 제목. 한 줄 16자 안팎(최대 20자), 과장·낚시·이모지·따옴표 금지, 검색의도 유지.\n" +
            "• c = 이 글이 어떤 분야인지 '2~4자 카테고리 한 단어'(글 내용 기준). 예: 맛집, 블로그, 재테크, 여행, 다이어트, 육아, 게임, 부동산, 인테리어, IT.\n" +
            "• ok = 실제로 의미 있는 주제면 true. 무의미한 조각·오타·알 수 없는 약어(예: '스블 자네', '블연플')면 false.\n" +
            "예) 강남맛집블로그 → {\"t\":\"강남 맛집, 어디가 진짜?\",\"c\":\"맛집\",\"ok\":true}\n" +
            "예) ETF → {\"t\":\"ETF, 초보는 뭐부터?\",\"c\":\"재테크\",\"ok\":true}\n" +
            "예) 스블 자네 → {\"t\":\"\",\"c\":\"\",\"ok\":false}\n\n" +
            `키워드: ${JSON.stringify(keywords)}\n\n` +
            'JSON 배열로만 답해. 형식: [{"t":"...","c":"...","ok":true}, ...] (입력과 같은 순서·개수).',
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    const m = text.match(/\[[\s\S]*\]/);
    const arr = m ? (JSON.parse(m[0]) as unknown[]) : [];
    return keywords.map((k, i) => {
      const o = arr[i] as { t?: unknown; c?: unknown; ok?: unknown } | undefined;
      const title = o && typeof o.t === "string" && o.t.trim() ? o.t.trim() : templateTitle(k, i);
      const tag = o && typeof o.c === "string" ? o.c.trim() : "";
      const ok = o ? o.ok !== false : true; // 명시적 false만 노이즈로 제외
      return { title, tag, ok };
    });
  } catch {
    return fallback();
  }
}
