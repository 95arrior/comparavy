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
export async function keywordsToTitles(keywords: string[], context?: string, opts?: { localBiz?: boolean }): Promise<TitledTopic[]> {
  if (keywords.length === 0) return [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fallback = (): TitledTopic[] => keywords.map((k, i) => ({ title: templateTitle(k, i), tag: "", ok: true, fit: 1 }));
  if (!apiKey) return fallback();

  // ★자영업자(동네 손님 받는 업장): '검색자 = 잠재 손님' 매칭을 1순위 게이트로. 분야가 같아도 검색자가 손님 아니면 제외.
  const customerGate =
    opts?.localBiz && context
      ? "★★[가장 중요 — 검색자가 곧 '잠재 손님'인가] 이 업장은 동네 손님을 받는 자영업자다. 글감의 목적은 '이 키워드를 검색하는 사람'이 '이 업장에 올 손님'이 되는 것이다. 분야 단어가 같아도, 검색하는 사람이 이 업장의 손님(분야·대상이 맞는 사람)이 아니면 무조건 ok=false.\n" +
        "- 검색자를 떠올려라: 이 키워드를 '누가, 왜' 치나? 그 사람이 이 가게 손님인가?\n" +
        "- 예) 업장='유아·초등 영어 학원'(대상=유아·초등) → '여행 영어 표현'(검색자=여행 가는 성인), '스페인어 번역기'(검색자=타 언어 쓰는 성인, 영어도 아님), '성인 영어회화'·'토익'(검색자=성인·취준생) = 전부 우리 손님(유아·초등 자녀를 둔 학부모)이 아님 → ok=false로 제외.\n" +
        "  남길 것 = 그 손님(학부모)이 칠 법한 것: '초등 영어 시작 시기', '파닉스 떼는 법', '유아 영어 노출 방법', '초등 영어 학원 고르는 법' 등.\n" +
        "- 이 '검색자=손님' 매칭은 '애매하면 통과' 규칙의 예외다 — 손님과 안 맞으면 애매해도 뺀다. (분야·대상에 딱 맞는 것만 남겨라.)\n" +
        "- f(적합도)도 이 기준으로: 손님이 자주 검색=2, 손님이 가끔=1, 손님과 거리 있음=0(되도록 ok=false).\n"
      : "";

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content:
            (context
              ? `[블로그 맥락] ${context}\n이 맥락에 맞는 글감만 남겨. 아래는 ok=false로 빼라:\n` +
                "- 맥락 분야와 명백히 무관한 다른 분야(예: 물리·역학·사주처럼 전혀 다른 주제)\n" +
                "- 특정 브랜드·상호·고유 업체명(예: '노부영', 'YBM', 'OO화상영어' 같은 특정 업체 이름). 단 '화상영어'·'학습지'·'영어학원' 같은 일반명사는 통과.\n" +
                "- '사용자 지역'이 주어졌는데 그와 '다른 특정 지역'을 가리키는 키워드(예: 사용자가 충북인데 '대구 OO', '강남 OO'). 단 지역이 안 들어간 전국 키워드(영어 공부법 등)는 통과.\n" +
                "- '대상'이 주어졌는데 명백히 안 맞는 키워드(예: 대상이 초등·중등인데 '성인 토익').\n" +
                "(애매하면 통과 — 과도하게 빼지 마.)\n"
              : "") +
            customerGate +
            "다음 각 '검색 키워드'를 블로그 글감 제목으로 바꿔줘. 화면에 이 키워드의 실제 검색량이 같이 표시되니, 제목이 키워드에서 멀어지면 안 된다. 키워드마다:\n" +
            "• t = 제목. ★이 키워드들은 '꾸준한 검색 수요(에버그린)' 종족 — 검색결과·AI 브리핑이 본진이지만, 홈피드 추천에 유리한 구조도 함께 갖춘다. 규칙: ①앞 15자 자기검증(의무) — 쓴 뒤 앞 15자를 잘라 검사: 구체 숫자·대상 호명(~라면)·궁금증(내 퇴직금 얼마?) 중 하나가 있는가? '총정리·확인하기·알아보기·이것만 알면'은 훅이 아니다 — 없으면 재작성(실측 미달 예: '허그전세대출 전에 확인하면 좋은 것'). 낚시성 금지. ②검색 키워드는 제목에서 빠지지 않되 위치는 유연하게. ③에버그린 제목에 특정 날짜·마감 훅 금지 — 시효가 지나면 제목이 거짓이 된다. 반복 가능한 표현만(예: '7월 16일부터 부과' 금지 → '7월 부과 전 확인' 허용). ④제목의 숫자·금액은 그 글 본문이 근거를 제시할 수 있는 값만 — 키워드에 없는 사실(지역·숫자·기관)은 지어내지 마. ⑤정체를 숨기는 낚시 대신 은은한 신뢰 후킹까지만(20~30자).\n" +
            "  ▸ 자연스럽고 친근한 현대 한국어. '뭐하는 건가?','어떤 곳?','~란 무엇인가' 같은 막연·번역투 금지. 과장·낚시·이모지·따옴표 금지.\n" +
            "  ⚠ 키워드가 너무 막연/모호해서 '없는 말'을 안 붙이면 제목이 안 나오는 경우 → t는 비우고 ok=false. (절대 억지로 살 붙이지 마. 예: '블로그' 한 단어는 막연 → ok=false)\n" +
            "• c = 이 글이 어떤 분야인지 '2~4자 카테고리 한 단어'. 예: 맛집, 블로그, 재테크, 여행, 다이어트, 육아, 게임, 부동산, 인테리어, IT.\n" +
            "• ok = 키워드만으로 충실한 글감이 되면 true. 무의미·조각·약어('스블 자네','블연플'), 또는 막연해서 지어내야만 제목이 되는 경우 false.\n" +
            (context
              ? "• f = 이 키워드가 위 맥락(분야·대상)의 '핵심 업무·관심사'에 얼마나 중심인가: 2=핵심(그 분야 사람 대부분이 관심), 1=관련은 되나 주변, 0=거의 안 봄. 예: '감정평가사'면 '부동산 감정평가'=2, '기업가치 평가'=1.\n"
              : "• f = 전부 1로 둬.\n") +
            "예) 강남 맛집 → {\"t\":\"강남 맛집, 현지인이 진짜 가는 곳\",\"c\":\"맛집\",\"ok\":true,\"f\":2}\n" +
            "예) ETF → {\"t\":\"ETF 초보, 이것만 알면 시작돼요\",\"c\":\"재테크\",\"ok\":true,\"f\":2}\n" +
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
      let title = o && typeof o.t === "string" && o.t.trim() ? o.t.trim() : templateTitle(k, i);
      // ★키워드 포함 보증(유저 확정: 키워드 없는 제목은 노출 판정 자체가 안 된다) — 핵심 토큰 전무 시 템플릿 폴백
      { const toks = k.split(/\s+/).filter((t) => t.length >= 2); if (toks.length > 0 && !toks.some((t) => title.includes(t))) title = templateTitle(k, i); }
      const tag = o && typeof o.c === "string" ? o.c.trim() : "";
      const ok = o ? o.ok !== false : true; // 명시적 false만 노이즈로 제외
      const fit = o && typeof o.f === "number" ? Math.max(0, Math.min(2, o.f)) : 1; // 업종 적합도
      return { title, tag, ok, fit };
    });
  } catch {
    return fallback();
  }
}
