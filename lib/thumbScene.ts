// ★장면 설계자(2026-08-17 유저 3차 판정: "직장인 세금 폭탄 띠별인데 관련된 게 하나도 없는데 —
//  홈판에 먹힐까를 3번 고민하고 제작한 거야?"). v3 정규식 엔진의 한계: 키워드를 카테고리에 넣고
//  미리 깎아둔 장면을 꺼내니 글의 진짜 각(띠별!)이 그림에 없다. v4: 글 제목·키워드를 주고 모델이
//  장면을 설계한다 — 주제 앵커(글자 없이 그릴 수 있는, 키워드를 1초 안에 연상시키는 시각 요소) 필수
//  + 3문 자가검증. 정규식 엔진은 이 호출이 실패할 때의 폴백으로 강등.
import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";

export interface DesignedScene {
  personaKo: string; personaEn: string;
  actionKo: string; actionEn: string;
  emotionKo: string; emotionEn: string;
  propsKo: [string, string]; propsEn: [string, string];
  placeKo: string; placeEn: string;
  /** 주제 앵커 — 이 장면이 이 키워드의 글임을 1초 안에 알게 하는 시각 요소(글자·숫자 없이 그릴 수 있어야) */
  anchorKo: string; anchorEn: string;
}

export async function designThumbScene(
  title: string, keyword: string, lane: "home" | "search", userId?: string | null,
): Promise<DesignedScene | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 45_000 });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6", // ★장면 품질이 곧 클릭 — haiku는 앵커가 밋밋했다
      max_tokens: 700,
      messages: [{
        role: "user",
        content: [
          `네이버 ${lane === "home" ? "홈피드" : "검색결과"} 썸네일에 쓸 일러스트 장면 1개를 설계하라. 글 제목: "${title}" / 키워드: "${keyword}"`,
          "",
          "★대원칙: '경제 주제'가 아니라 '이 키워드 때문에 벌어진 생활 장면'. 단, 아무 생활 장면이 아니라 — 이 글에만 맞는 장면이어야 한다.",
          "★주제 앵커(필수): 이 그림을 본 사람이 1초 안에 이 키워드의 글임을 알아채게 하는 시각 요소 1개. 글자·숫자 없이 그릴 수 있는 것만. (예: 띠별 세금 환급 → 십이지 동물 그림이 늘어선 달력, 청약 → 창밖 아파트 단지와 서류 봉투, 전기요금 → 벽의 계량기와 고지서, 국민연금 → 급여명세서를 쥔 손) 앵커가 소품 2개 중 하나여도 된다.",
          "★인물 1명(한국인, 감정이 표정·몸짓에 드러나게) · 감정 1개만 · 소품 2개까지 · 장소 1곳.",
          "",
          "★출력 전 자가검증 3문(하나라도 아니면 장면을 버리고 다시 설계하라 — 이 과정은 출력하지 않는다):",
          "①홈피드에서 스크롤하다가 이 그림에 정말 멈추는가(감정이 0.5초 안에 읽히는가)?",
          `②이 그림이 "${keyword}"의 글임이 1초 안에 연결되는가 — 다른 경제 글에 갖다 붙여도 되는 그림이면 실격.`,
          "③글자·숫자·로고 없이 그릴 수 있는가 — 앵커가 글자를 요구하면(예: 순위표·금액표) 다른 앵커로 바꿔라.",
          "",
          '출력 JSON만(설명 금지): {"personaKo":"30대 직장인","personaEn":"an office worker in their 30s","actionKo":"~하는","actionEn":"~ing 구","emotionKo":"…","emotionEn":"…","propsKo":["…","…"],"propsEn":["…","…"],"placeKo":"…","placeEn":"…","anchorKo":"…","anchorEn":"…"}',
        ].join("\n"),
      }],
    });
    void logUsage({ userId, model: "claude-sonnet-4-6", kind: "thumb_scene", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const t = res.content.find((b) => b.type === "text");
    const m = /\{[\s\S]*\}/.exec(t && t.type === "text" ? t.text : "");
    if (!m) return null;
    const j = JSON.parse(m[0]) as Partial<DesignedScene> & { propsKo?: string[]; propsEn?: string[] };
    if (!j.personaKo || !j.actionKo || !j.anchorKo || !j.personaEn || !j.actionEn) return null;
    if (/[가-힣]/.test(`${j.personaEn}${j.actionEn}${j.emotionEn}${(j.propsEn ?? []).join("")}${j.placeEn}${j.anchorEn}`)) return null; // 영어 필드에 한글=글자 그리기 사고 위험
    return {
      personaKo: String(j.personaKo), personaEn: String(j.personaEn),
      actionKo: String(j.actionKo), actionEn: String(j.actionEn),
      emotionKo: String(j.emotionKo ?? "놀람"), emotionEn: String(j.emotionEn ?? "surprise"),
      propsKo: [String(j.propsKo?.[0] ?? "휴대폰"), String(j.propsKo?.[1] ?? "문서")],
      propsEn: [String(j.propsEn?.[0] ?? "a phone"), String(j.propsEn?.[1] ?? "a document")],
      placeKo: String(j.placeKo ?? "집 식탁"), placeEn: String(j.placeEn ?? "a home kitchen table"),
      anchorKo: String(j.anchorKo), anchorEn: String(j.anchorEn ?? ""),
    };
  } catch { return null; }
}
