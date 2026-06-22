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
  fit: number;   // 업종 핵심 적합도 2(핵심)/1(관련)/0(주변). context 있을 때만 의미, 없으면 1
}

/**
 * 키워드 배열 → {제목, 카테고리칩, 의미여부} 배열. 순서·개수 보존.
 * 한 번의 AI 호출에서 제목 + 내용 카테고리 분류 + 노이즈 판별을 같이 한다.
 * AI 키 없음/오류면 템플릿으로 채우고 ok=true(드롭 안 함).
 */
export async function keywordsToTitles(keywords: string[], context?: string): Promise<TitledTopic[]> {
  if (keywords.length === 0) return [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fallback = (): TitledTopic[] => keywords.map((k, i) => ({ title: templateTitle(k, i), tag: "", ok: true, fit: 1 }));
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
            (context ? `이 키워드들은 '${context}' 분야 블로그용이야. '${context}'와 '명백히 무관한 다른 분야'(전혀 다른 학문·취미·주제, 예: 물리/역학·사주 등) 키워드는 ok=false로 빼. 단 조금이라도 연관되거나 애매하면 통과시켜.\n` : "") +
            "다음 각 '검색 키워드'를 블로그 글감 제목으로 바꿔줘. 화면에 이 키워드의 실제 검색량이 같이 표시되니, 제목이 키워드에서 멀어지면 안 된다. 키워드마다:\n" +
            "• t = 제목. ★키워드를 거의 그대로 살려라 — 키워드의 핵심어를 모두 포함하고, '키워드에 없는 정보(지역·대상·숫자·기관·주장 등)는 절대 추가하지 마'. 변형은 자연스러운 어미·질문 정도만(키워드 + 최소 연결어). 한 줄 16자 안팎, 과장·낚시·이모지·따옴표 금지.\n" +
            "  ▸ 자연스럽고 친근한 '현대 한국어'로. '뭐하는 건가?', '어떤 곳?', '~란 무엇인가' 같은 막연·어색·번역투 어미 금지 — 구체적이고 사람이 진짜 검색하듯 자연스럽게.\n" +
            "  ⚠ 키워드가 너무 막연/모호해서 '없는 말'을 안 붙이면 제목이 안 나오는 경우 → t는 비우고 ok=false. (절대 억지로 살 붙이지 마. 예: '블로그' 한 단어는 막연 → ok=false)\n" +
            "• c = 이 글이 어떤 분야인지 '2~4자 카테고리 한 단어'. 예: 맛집, 블로그, 재테크, 여행, 다이어트, 육아, 게임, 부동산, 인테리어, IT.\n" +
            "• ok = 키워드만으로 충실한 글감이 되면 true. 무의미·조각·약어('스블 자네','블연플'), 또는 막연해서 지어내야만 제목이 되는 경우 false.\n" +
            (context
              ? `• f = 이 키워드가 '${context}'의 '핵심 업무·관심사'에 얼마나 중심인가: 2=핵심(그 분야 사람 대부분이 관심 갖는 주제), 1=관련은 되나 주변 업무, 0=거의 안 봄. 예: '감정평가사'면 '부동산 감정평가'=2(업무 대부분이 부동산), '기업가치 평가'=1.\n`
              : "• f = 전부 1로 둬.\n") +
            "예) 강남 맛집 → {\"t\":\"강남 맛집, 어디가 진짜?\",\"c\":\"맛집\",\"ok\":true,\"f\":2}\n" +
            "예) ETF → {\"t\":\"ETF, 초보는 뭐부터?\",\"c\":\"재테크\",\"ok\":true,\"f\":2}\n" +
            "예) 지식인 → {\"t\":\"\",\"c\":\"\",\"ok\":false,\"f\":0} (막연 → 없는 말 붙이지 말고 제외)\n" +
            "예) 스블 자네 → {\"t\":\"\",\"c\":\"\",\"ok\":false,\"f\":0}\n\n" +
            `키워드: ${JSON.stringify(keywords)}\n\n` +
            'JSON 배열로만 답해. 형식: [{"t":"...","c":"...","ok":true,"f":2}, ...] (입력과 같은 순서·개수).',
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    const m = text.match(/\[[\s\S]*\]/);
    const arr = m ? (JSON.parse(m[0]) as unknown[]) : [];
    return keywords.map((k, i) => {
      const o = arr[i] as { t?: unknown; c?: unknown; ok?: unknown; f?: unknown } | undefined;
      const title = o && typeof o.t === "string" && o.t.trim() ? o.t.trim() : templateTitle(k, i);
      const tag = o && typeof o.c === "string" ? o.c.trim() : "";
      const ok = o ? o.ok !== false : true; // 명시적 false만 노이즈로 제외
      const fit = o && typeof o.f === "number" ? Math.max(0, Math.min(2, o.f)) : 1; // 업종 적합도
      return { title, tag, ok, fit };
    });
  } catch {
    return fallback();
  }
}
