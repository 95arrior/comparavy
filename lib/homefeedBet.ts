// ★홈판 배팅 카드(2026-07-15 유저 확정 "해보자") — 검색이 아니라 네이버 홈피드(홈판) 폭발을 노리는 1일 1장.
//  배경(유저 관찰): 일 7만~20만 블로그들은 홈판에서 터진 유형을 반복한다. 검색=수요를 받아먹는 게임(상한=검색량),
//  홈판=반응을 터뜨리는 게임(상한 없음). 검색 바닥은 기존 트랙이 담당하고, 이 카드는 스파이크 배팅.
//  원칙: ①거짓 사연 금지 — 통계·계산·제도 '실데이터 기반' 유형만 ②경제 축 안에서만(C-Rank 보호) ③1일 1장 상한.
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logUsage } from "./usageLog";
import { containsBanned } from "./hookPatterns";

export interface HomefeedBet {
  keyword: string;   // 주제 앵커(검색 키워드가 아니라 소재 — 예: "30대 평균 저축액")
  title: string;     // 홈판 훅 제목(호기심·반전·숫자)
  thumbCopy: string; // 썸네일 훅 문구(12자 이내)
  briefText: string; // 생성 엔진에 넘길 홈판 지시
  betType: string;   // 오늘의 유형 라벨
}

// 6유형 로테이션(전략 합의 2026-07-15) — 전부 사실 기반으로 쓸 수 있는 유형만.
const BET_TYPES = [
  { key: "평균 위치확인", hint: "통계청·한국은행 등 공식 통계로 '평균/중위값'을 까서 독자가 자기 위치를 확인하게 하는 주제(예: 30대 평균 저축액·40대 평균 연금 납입액). 댓글 유발형." },
  { key: "몰라서 못 받는 돈", hint: "조회만 하면 찾아가는 돈(미환급금·숨은 보험금·카드 포인트·통신비 환급 등) — '5분 조회, 즉시 보상' 구조. 저장·공유형." },
  { key: "계산 충격", hint: "누구나 궁금하지만 직접 계산 안 해본 것을 대신 계산해 보여주는 주제(국민연금 예상 수령액·퇴직금·전월세 전환 손익). ★'계산기'라는 단어는 키워드·제목에 절대 금지(계산해봤다·계산 결과로 표현)." },
  { key: "통념 파괴", hint: "다들 믿는 돈 상식이 사실과 다른 지점(적금 이자에서 빠지는 세금·연금 수령 시점의 함정·무이자 할부의 비용). 반전 훅." },
  { key: "손해 공포 마감", hint: "지금 안 하면 실제로 손해가 확정되는 것(이번 달 세금 가산·마감 임박 혜택·자동 해지되는 권리). 시점은 실제 제도 일정만." },
  { key: "인생 이벤트 돈 타임라인", hint: "이직·퇴사·결혼·출산·이사 앞뒤로 챙길 돈 체크리스트 — '그때 가서 알면 늦는' 순서 정리. 저장형." },
] as const;

/** 오늘의 홈판 배팅 1장 — 유저·날짜별 캐시(api_cache 24h). 실패 = null(파이프 무영향). */
export async function pickHomefeedBet(db: SupabaseClient, userId: string, sub: string, usedKeywords: Set<string>): Promise<HomefeedBet | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const kstDay = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const cacheKey = `homebet:${userId}:${kstDay}`;
  try {
    const { data: c } = await db.from("api_cache").select("value, expires_at").eq("key", cacheKey).maybeSingle();
    if (c?.value && new Date(String(c.expires_at)).getTime() > Date.now()) return c.value as HomefeedBet;
  } catch { /* 캐시 조회 실패 — 생성으로 */ }

  const dayIdx = Math.floor(Date.now() / 86400_000) % BET_TYPES.length;
  const bet = BET_TYPES[dayIdx]!;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: [
          `네이버 홈피드(홈판)에서 폭발적 반응을 노리는 경제 블로그 글감 1개를 만든다. 검색 SEO용이 아니다 — 홈피드는 '노출 실험 → 클릭률·체류로 판정' 구조라 스크롤을 멈추게 하는 제목이 전부다.`,
          `블로그 세부 분야: ${sub || "경제·재테크"}`,
          `오늘의 유형: [${bet.key}] — ${bet.hint}`,
          `★시의성 결합(2026-07-16 개정 — 홈판은 '지금의 파도'를 탄다): 이 유형을 지금 이 계절·이 달의 상황(폭염 전기요금, 휴가비, 월급날, 세금 고지서 등 요즘 사람들이 실제로 겪는 일)과 반드시 결합하라. 계절과 무관한 무시간 주제 금지.`,
          `절대 원칙: ①거짓 사연·지어낸 경험 금지 — 공식 통계·실제 제도·계산으로만 성립하는 주제 ②전 국민 이해관계(대상이 넓을수록 좋다) ③이미 쓴 주제 제외: ${[...usedKeywords].slice(0, 40).join(", ") || "(없음)"}`,
          `제목 규격: 검색 키워드 나열이 아니라 사람이 말하듯 흐르는 '문장형' — 다음 결 중 하나: ⓐ공감 프레임("요즘 30대가 진짜 많이 하는 돈 실수") ⓑ구어체 감탄+되물음("아니 전기요금이 이렇게나 나왔다고? 이번 달 뭐가 달라진 거야") ⓒ반전 선언("적금 이자, 사실 4분의 1은 세금으로 사라집니다"). 숫자·반전 중 1개 이상 결합. ★금지선(계정 지속 — 절대): 본문이 100% 이행 못 할 약속(낚시), "안 사면 평생 후회·무조건·100%" 류 단정·공포 마케팅, 충격·경악 남발.`,
          `★토너먼트 자기검증(내부 심사 — 과정 출력 금지): 제목·썸네일 문구 후보를 각각 10개 이상 만들어 스스로 물어라 — '스크롤하다 내가 정말 멈출까?', '왜 멈추는지 한 문장으로 설명되는가?', '제목과 썸네일이 같은 말을 하고 있진 않은가?'. 통과 못 하면 폐기하고 다시. 최강 1세트만 출력한다 — 이건 경쟁이다.`,
          `JSON만 출력: {"keyword":"주제 앵커(15자 이내)","title":"훅 제목(32자 이내)","thumbCopy":"썸네일 문구(6자 이내 초단문 — 글자가 적을수록 유리. ★제목을 반복하지 말고 개념 하나만 던진다: 썸네일이 질문, 제목이 답 — '검색 끝.' 결)","angle":"본문이 다룰 핵심 각도 2문장"}`,
        ].join("\n"),
      }],
    });
    void logUsage({ userId, model: "claude-sonnet-4-6", kind: "homefeed_bet", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const text = res.content.map((x) => (x.type === "text" ? x.text : "")).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const raw = JSON.parse(m[0]) as { keyword?: string; title?: string; thumbCopy?: string; angle?: string };
    if (!raw.keyword || !raw.title) return null;
    // ★문구 게이트(2026-07-17 PTRP) — 감정 과잉·과장 어휘는 텍스트 카드에서 역효과 실증. 제목 위반=오늘 배팅 스킵, 문구 위반=키워드 폴백.
    if (containsBanned(raw.title)) { console.error("[homebet] 금지어 제목 — 스킵:", raw.title.slice(0, 30)); return null; }
    const thumbCopy0 = (raw.thumbCopy ?? raw.keyword).slice(0, 14);
    const out: HomefeedBet = {
      keyword: raw.keyword.slice(0, 30),
      title: raw.title.slice(0, 60),
      thumbCopy: containsBanned(thumbCopy0) ? raw.keyword.slice(0, 14) : thumbCopy0,
      betType: bet.key,
      briefText: [
        `[홈판 배팅 지시] 이 글은 검색 노출이 아니라 네이버 홈피드(홈판) 확산을 노린다 — 제목은 검색 질문형이 아니라 위 훅 제목을 그대로(또는 더 강하게) 쓴다.`,
        `유형: ${bet.key}. 핵심 각도: ${(raw.angle ?? "").slice(0, 300)}`,
        `규칙: ①모든 수치는 공식 통계·실제 제도 기반 — 출처와 기준 시점 명시, 지어낸 사연 금지 ②도입 3문장 안에 '멈춤 포인트'(반전 수치·의외 사실)를 박는다 — 홈판은 3초 안에 스크롤이 지나간다 ③독자가 자기 상황을 대입할 분기(나이대·상황별)를 반드시 넣는다 ④마무리에 저장 유도(체크리스트·계산 순서) — 홈판 글의 승부는 공감·저장 반응이다.`,
        `⑤★댓글 유도(2026-07-16 개정 — 댓글·체류가 홈피드 노출 점수): 마무리 직전에 독자 의견을 묻는 진짜 질문 1개를 자연스럽게 넣는다(예: "여러분은 무이자 할부, 한 달에 몇 번이나 쓰세요?") — '댓글 달아주세요' 류 부탁 금지, 대답하고 싶어지는 질문이어야 한다 ⑥크리에이터 시각 1곳 — 뻔한 정리가 아니라 이 데이터를 보는 나만의 해석 한 단락('제가 이 통계에서 진짜 놀란 건 평균이 아니라 격차예요' 결).`,
      ].join("\n"),
    };
    try { await db.from("api_cache").upsert({ key: cacheKey, value: out, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
    return out;
  } catch (e) {
    console.error("[homebet] 생성 실패(파이프 무영향):", e instanceof Error ? e.message : e);
    return null;
  }
}
