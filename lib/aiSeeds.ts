import Anthropic from "@anthropic-ai/sdk";

// 지역 글감 '생성' — 검색량(네이버 볼륨)에 의존하지 않고 지역×업종×대상×특성으로 동네 검색어를 만든다.
// 작은 동네 키워드는 측정 검색량이 0이라 네이버 API엔 안 잡히지만, 동네 손님은 꾸준히 검색(고의도·무경쟁) → 생성으로 커버.
const localKwCache = new Map<string, string[]>();
export async function generateLocalKeywords(areas: string[], field: string, audience?: string, traits?: string[]): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const ars = areas.filter(Boolean).slice(0, 3);
  if (!apiKey || !ars.length || !field) return [];
  const cacheKey = `${ars.join(",")}|${field}|${audience ?? ""}|${(traits ?? []).join(",")}`;
  const hit = localKwCache.get(cacheKey);
  if (hit) return hit;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content:
            `지역: ${ars.join("·")} / 업종: ${field}${audience ? ` / 대상: ${audience}` : ""}${traits?.length ? ` / 동네 특성: ${traits.join("·")}` : ""}\n\n` +
            `네이버 검색이 '키워드 → 문장형 질문'으로 바뀌었다(연관검색어 폐지, 관련 질문 중심). 이 동네 손님이 '실제로 검색하거나 궁금해하는 질문' 12개를 만들어줘.\n` +
            `- ★문장형 '질문'으로(키워드 나열 X). 예: "${ars[0]} ${field} 어디가 좋아요?", "${ars[0]}에서 ${audience ? audience.split("·")[0] + " " : ""}${field} 몇 살부터 시작하나요?", "${ars[0]} ${field} 고르는 기준은?"\n` +
            `- ★대상 관점을 정확히 지켜라(중요): 유아·초등·중등 등 '아이' 대상이면 '학부모가 검색하는 질문'(아이 관점) — 절대 '퇴근 후·저녁반·직장인' 같은 성인 표현 쓰지 마. 성인·직장인 대상이면 본인 관점. 대상과 모순되는 질문 금지.\n` +
            `- ★반드시 지역명(${ars.join("/")} 중 하나)을 포함. 가까운 동네(${ars[0]})를 더 많이.\n` +
            `- 검색량 적어도 됨(동네 실수요 — 양은 적어도 경쟁 거의 없어 선점 최고).\n` +
            `- 추천·비용·후기·고르는법·대상별(${audience ?? "유아·초등 등"})·시기·위치 등 '서로 다른 질문 의도'로. 같은 질문 반복 금지.\n` +
            (traits?.length ? `- 동네 특성(${traits.join("·")})을 살린 질문도 1~2개(예: "산단 직장인도 다닐 만한 ${ars[0]} ${field}?").\n` : "") +
            `- 실제 사람이 묻는 자연스러운 질문으로(과장·낚시 금지).\n` +
            `JSON 배열로만: ["${ars[0]} ${field} 어디가 좋아요?", "..."]`,
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const m = text.match(/\[[\s\S]*\]/);
    const arr = m ? (JSON.parse(m[0]) as unknown[]) : [];
    const out = arr
      .filter((x): x is string => typeof x === "string" && x.trim().length > 1)
      .map((x) => x.trim())
      .filter((x) => ars.some((a) => x.includes(a))) // 지역명 포함만
      .slice(0, 12);
    localKwCache.set(cacheKey, out);
    return out;
  } catch {
    return [];
  }
}

// 주소 → 그 동네에서 '실제 통용되는 지역명'(생활권·별칭·동/리/구). 주소 파싱이 못 잡는 별칭(봉산리→오송) 보완.
// 주소는 안 바뀌니 인스턴스 메모리에 캐싱(반복 호출 절감).
const areaCache = new Map<string, string[]>();
export async function expandLocalAreas(address: string, field: string, audience?: string, tight?: boolean): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const addr = (address || "").trim();
  if (!apiKey || addr.length < 4) return [];
  const cacheKey = `${addr}|${field}|${audience ?? ""}|${tight ? "t" : "w"}`;
  const hit = areaCache.get(cacheKey);
  if (hit) return hit;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content:
            `주소: "${addr}"\n업종: ${field}${audience ? ` / 대상: ${audience}` : ""}\n` +
            `이 위치의 손님(또는 대상)이 'OO ${field}' 식으로 검색할 때 실제로 쓰는 '지역명'을 가까운 순서로 2~4개 뽑아줘.\n` +
            "- 행정구역명뿐 아니라 그 동네에서 통용되는 '생활권·별칭'을 우선해라(예: 청주 흥덕구 봉산리 → '오송'이 생활권 별칭).\n" +
            (tight ? "- 학원·아동 등 가까운 곳만 다니므로 좁은 생활권·동네 위주로.\n" : "- 멀리서도 오므로 구·시까지 포함.\n") +
            "- 너무 넓은 시/도(충청북도 등)는 넣지 마.\n" +
            'JSON 배열로만 답해: ["오송","봉산","흥덕"]',
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const m = text.match(/\[[\s\S]*\]/);
    const arr = m ? (JSON.parse(m[0]) as unknown[]) : [];
    const out = arr
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim())
      .slice(0, 4);
    areaCache.set(cacheKey, out);
    return out;
  } catch {
    return [];
  }
}

// 업소별 '지역 범위' AI 판정 — 업종/세부/위치로 손님이 어디까지 찾아오는지 계산(하드코딩 X, 어떤 세부업종도 커버).
//   scope: dong(동네 밀착) | si(도시권) | nation(전국·비대면) · areas: 통용 지역명(가까운 순) · traits: 산단 등 특성. 캐싱.
export type LocalScope = "dong" | "si" | "nation";
export interface LocalPlan { scope: LocalScope; areas: string[]; traits: string[] }
const planCache = new Map<string, LocalPlan>();
export async function resolveLocalPlan(address: string, field: string, audience?: string): Promise<LocalPlan | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const addr = (address || "").trim();
  if (!apiKey || addr.length < 4) return null;
  const cacheKey = `${addr}|${field}|${audience ?? ""}`;
  const hit = planCache.get(cacheKey);
  if (hit) return hit;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 220,
      messages: [
        {
          role: "user",
          content:
            `주소: "${addr}"\n업종: ${field}${audience ? ` / 대상: ${audience}` : ""}\n\n` +
            `이 업종·위치의 손님(또는 의뢰인)이 보통 '어디까지' 찾아오거나 검색하는지 판단해줘.\n` +
            `- "dong"(동네): 도보·차로 10분 동네만. 예) 치과, 한의원, 동네 1차 의원(내과·이비인후과), 미용실, 유아·초등 학원, 동네 카페·식당.\n` +
            `- "si"(도시): 도시 전체에서 옴. 예) 소아청소년과, 산부인과, 정형외과, 성인 입시·공시 단과, 인테리어, 부동산, 산후조리원.\n` +
            `- "nation"(전국): 멀리서도 오거나 비대면 상담 가능. 예) 성형외과, 피부(미용)과, 모발이식, 변호사·세무사·노무사 상담, 한방난임, 공무원 종합학원.\n` +
            `- 'OO ${field}'로 검색할 때 쓰는 지역명 2~4개. scope=dong이면 '가장 좁은 동네부터'(예: 오송, 흥덕), si·nation이면 '도시명을 먼저'(예: 청주, 흥덕). 생활권 별칭 우선(봉산리→오송). 너무 넓은 시/도(충청북도)는 빼.\n` +
            `- 산업단지·신도시 등 지역 특성이 뚜렷하면 traits에(예: 오송=바이오산단).\n` +
            `JSON만: {"scope":"dong|si|nation","areas":["오송","흥덕","청주"],"traits":["바이오산단"]}`,
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const raw = JSON.parse(m[0]) as { scope?: string; areas?: unknown[]; traits?: unknown[] };
    const scope: LocalScope = raw.scope === "dong" || raw.scope === "si" || raw.scope === "nation" ? raw.scope : "si";
    const clean = (a?: unknown[]) => (a ?? []).filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
    const plan: LocalPlan = { scope, areas: clean(raw.areas).slice(0, 4), traits: clean(raw.traits).slice(0, 3) };
    planCache.set(cacheKey, plan);
    return plan;
  } catch {
    return null;
  }
}

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
