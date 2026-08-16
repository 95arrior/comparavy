import { NextResponse } from "next/server";
import { breakThumbCopy } from "@/lib/thumbCopyBreak";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { bannedHits } from "@/lib/hookPatterns";
import { isStickyFrame } from "@/lib/thumbCopyDiversity";

// ★네이버 썸네일 문구 금지(2026-07-29) — 정리류(제목 반복 유발)·느낌표·과장. WP(WP_COPY_BAN_RE)와 같은 결.
// ★'모르면 손해'를 금지어에서 뺀다(2026-08-06) — 유저가 준 레퍼런스 썸네일이 그 문구를 쓰고 있었다
//  ('청년 창업 / 모르면 나만 손해'). 실물이 쓰는 말을 우리가 막고 있었다.
const NAVER_COPY_BAN_RE = /(완벽\s?정리|총\s?정리|핵심\s?정리|한눈에\s?정리|!)/;
import { logUsage } from "@/lib/usageLog";

export const maxDuration = 30;

// ★썸네일 3초 훅 문구 추천(유저 요청 2026-07-05) — 유저가 직접 만드는 썸네일용 짧은 어그로 카피 4개.
//  원칙: 어그로되 '글이 실제로 답하는 약속'만(열린 고리) + 금지어(무조건·보장·충격류)는 코드로 걸러 재요청 없이 폐기.
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const rl = await checkRateLimit(supabase, user.id, "thumb_copy", 30, 3600); // 30회/시간 — 남용 방지(무료 기능)
  if (!rl.ok) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const articleId = typeof body.articleId === "string" ? body.articleId.slice(0, 60) : "";
  if (!articleId) return NextResponse.json({ error: "글을 알 수 없어요." }, { status: 400 });
  const { data: art } = await supabase.from("articles").select("title, keyword, meta_description, body_html").eq("id", articleId).eq("user_id", user.id).maybeSingle();
  if (!art) return NextResponse.json({ error: "글을 찾을 수 없어요." }, { status: 404 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // ★역할 분리 재설계(2026-07-17 유저 확정): 홈피드에서 썸네일과 제목은 '함께' 노출된다.
  //  썸네일 = 개념 하나를 던지는 질문, 제목 = 그 답. 둘이 이어 읽으면 하나의 문장이 되는 세트가 목표.
  //  제목을 요약·반복하는 문구는 실격(제목과 경쟁 금지) — 코드 게이트(titleOverlapCount)로도 강제.
  const prompt = [
    // ★규격 반전(2026-08-06 유저 확정: "썸네일 문구 추천은 글의 제목을 임팩트 있게, 팩트만 짧게").
    //  종전 규칙은 '제목과 다른 말을 하라'(2026-07-17 역할 분리)였다. 그런데 유저가 준 레퍼런스
    //  썸네일들은 전부 제목의 핵심을 그대로 쓰고 있었다 —
    //   제목 '1톤 전기트럭 중고 사도 지원금 받을 수 있나요?' → 썸네일 '중고 전기트럭도 / 보조금 받나요?'
    //   제목 '중소기업현황시스템 정책대출 자격·금리·신청 순서' → 썸네일 '중소기업현황시스템 / 정책대출'
    //  ★실물이 규칙을 이긴다. 제목의 핵심을 압축하되 '축약본'이 아니라 '더 세게'가 되어야 한다.
    `네이버 블로그 썸네일에 큰 글씨로 박을 문구 6개를 만들어줘. ★대전제: 문구는 글이 말하는 것 중 '가장 센 사실 하나'를 한 방으로 던지는 것이다. 제목을 요약하는 게 아니다 — 제목이 나열한 것 중 독자가 가장 놀랄 사실을 골라 숫자와 함께 박는다. 팩트만 담는다(수식·감상 금지). 절대 조건: 각 문구는 공백 포함 18자 이내(고정 폰트 — 한 줄 9자 x 2줄), 짧을수록 강하다(4~12자 지향 — 2026-08-17 유저 규격). ★제목이 이미 설명하고 있다 — 문구는 설명 요약이 아니라 사건의 가장 뾰족한 조각 하나다: '딱 1세대'·'8월 18일 접수'·'월 7만원 차이'처럼 2~8자 초단문이 1순위. 글 제목: "${art.title}" / 키워드: "${art.keyword}"${art.meta_description ? ` / 요지: ${String(art.meta_description).slice(0, 150)}` : ""}`,
    // ★유저가 준 정답 한 줄(2026-08-06) — 이 예시 하나가 규격 전체를 정한다.
    //  제목  "신혼부부 매매대출 조건·한도·신청 절차 완전 정리"
    //  썸네일 "아는 부부만 3.2억까지 받는다"
    //  ★제목 어절을 하나도 안 가져왔다. 대신 구체 숫자(3.2억) + 결핍 훅(아는 부부만)이다.
    //   제목은 나열('조건·한도·절차')인데 썸네일은 한 방이다 — 그게 '임팩트 있게'의 뜻이다.
    '- ★정답 예시(이 결로 만들어라): 제목 "신혼부부 매매대출 조건·한도·신청 절차 완전 정리" → 썸네일 "아는 부부만 3.2억까지 받는다". 제목의 나열을 옮기지 않고, 본문에 있는 구체 숫자 하나를 앞세워 \'모르면 못 받는다\'는 결핍을 찔렀다.',
    "- ★공식: [구체 숫자·조건 한 개] + [결핍·반전 한 마디]. 숫자가 있으면 반드시 넣는다 — 숫자 없는 문구는 힘이 빠진다. 결핍 어법 예: '아는 사람만', '모르면 못 받는', '안 하면 그냥 날아가는', '여기서 갈린다'.",
    "- ★제목의 나열을 옮기지 마라: '조건·한도·절차', '완전 정리', '총정리' 같은 목차형 표현은 썸네일에서 실격이다. 제목이 목차라면 썸네일은 그중 '가장 센 사실 하나'다.",
    "- ★팩트만: 본문·제목에 실제로 있는 사실·숫자·조건만 쓴다. 없는 숫자를 만들면 실격. 수식어(대박·필수·완벽)와 감상은 넣지 않는다.",
    `본문 도입(이 글의 진짜 셀링포인트 — 문구는 이 내용에서만 나와야 한다): ${String((art as { body_html?: string }).body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400)}`,
    "",
    "규칙:",
    "- ★토너먼트(내부 심사 — 과정 출력 금지, 2026-07-17 유저 확정): 문구를 최소 20개 만들어 각각에 스스로 물어라 — ①'스크롤하다가 내가 정말 멈출까?' ②'왜 멈추는가'를 한 문장으로 설명할 수 있는가 ③제목과 같은 말을 하고 있지 않은가 ④본문이 증명할 수 있는가. 하나라도 막히면 그 자리에서 폐기하고 다시 만든다. 살아남은 최강 6개만 JSON으로 출력한다. 이건 경쟁이다 — 무난한 문구를 채워 넣느니 비워라.",
    // ★2026-07-17의 '역할 분리(제목 반복 실격)' 조항은 2026-08-06 유저 지시로 폐기했다.
    //  유저 레퍼런스가 전부 제목의 핵심을 쓰고 있었다 — 규칙이 실물과 어긋나 있었다.
    "- ★개념 1개만 — 한 문구 = 한 개념. vs·나열·요약형 금지. '검색 끝.'처럼 명사+마침표로 끊는 punch 허용.",
    "- ★6각도 분산(전부 같은 프레임이면 실격): ①시대 선언형(검색 끝. / 이제 시작입니다) ②소유 전환형(내 비서가 생깁니다) ③행동 전환형(이젠 시켜만 하세요) ④숫자 앵커형(본문 실값 하나만 크게) ⑤손실 회피형(모르고 두면 새는 돈) ⑥질문형(내 몫은 얼마?).",
    "- ★사실 정합(절대 조항) — 훅을 만들려고 본문에 없는 인과·위협을 지어내면 실격(실측 실격 예: 본문은 '6개월 내 퇴사 시 환수'인데 문구가 '지급일 놓치면 환수당한다' — 조건 바꿔치기). 본문이 명시한 사실만 극적으로 만들 수 있다.",
    "- ★완결된 구어 — 사람이 소리 내 말할 수 있는 말만. '~다는 것', '~라는 게 핵심이다' 같은 문어 조각 실격.",
    "- ★숫자·날짜는 제목·요지·본문 도입에 실제로 있는 값만.",
    "- 금지: 무조건·100%·보장·충격·경악·미쳤·소름·역대급·레전드·실화 등 감정 과잉 어휘(텍스트 썸네일에서 감정 과잉은 클릭을 낮춘다는 실측 — 절제된 개념 훅이 이긴다), 느낌표 2개 이상, 이모지.",
    "- 출력 계약(어기면 실패): 설명·비교·머리말 없이, 첫 글자가 [ 이고 마지막 글자가 ] 인 JSON 배열 한 줄만 출력한다. 예: [\"검색 끝.\",\"내 비서가 생깁니다\"]",
  ].join("\n");
  // ★9자/줄 다듬기(2026-07-13) — 초과 문구를 버리지 않고 어절을 덜어 규격에 맞춘다(전멸 방지+크기 통일 유지)
  const fit9 = (c: string): string | null => {
    let t = c.trim();
    for (let i = 0; i < 4; i++) {
      if ([...t].length <= 18 && breakThumbCopy(t).split("\n").every((l) => [...l].length <= 9)) return t;
      if (!t.includes(" ")) return null;
      t = t.split(" ").slice(0, -1).join(" ").replace(/[,，]$/, "");
    }
    return null;
  };
  try {
    // ★빈손 금지 3단(실측: 간헐 '문구를 만들지 못했어요' — 필터 전멸이 원인): AI→관대한 회수→규칙 폴백
    let copies: string[] = [];
    for (let attempt = 0; attempt < 2 && copies.length === 0; attempt++) {
      const res = await client.messages.create({ model: "claude-sonnet-4-6", max_tokens: 800, messages: [{ role: "user", content: prompt }] }); // ★sonnet 승격(2026-07-17 토너먼트 자기검증 — 심사 품질이 곧 문구 품질) · 800(실측 2026-07-13: 300이 JSON을 잘라 폴백 서빙)
      void logUsage({ userId: user.id, model: "claude-sonnet-4-6", kind: "thumb_copy", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
      const text = res.content.find((b) => b.type === "text")?.text ?? "[]";
      const m = text.match(/\[[\s\S]*\]/);
      let raw: unknown = [];
      try { raw = m ? JSON.parse(m[0]) : []; } catch { raw = []; }
      if (!Array.isArray(raw) || raw.length === 0) {
        // 파싱 폴백 — 따옴표 줄 추출
        raw = [...text.matchAll(/["\u201c']([^"\u201d'\n]{4,20})["\u201d']/g)].map((x) => x[1]);
      }
      const cleaned = (Array.isArray(raw) ? raw : [])
        .map((c) => String(c).trim().replace(/^[\[\]"\u201c\u201d'\s]+|[\[\]"\u201c\u201d'\s]+$/g, "")) // ★대괄호·스마트따옴표 찌꺼기 소거(실측: 앞뒤 [])
        .filter((c) => c.length >= 4)
        .map((c) => fit9(c) ?? "") // ★폐기 대신 다듬기(실측 2026-07-13: 4중 게이트 전멸→판박이 폴백) — 18자·9자/줄 초과는 어절을 덜어 살린다
        .filter(Boolean)
        // ★제목 반복 게이트 폐기, '통째 복사'만 막는다(2026-08-06 유저 확정).
        //  이제 문구는 제목의 핵심을 쓰는 게 정답이다 — 종전 게이트를 두면 정답이 전멸한다.
        //  다만 제목을 줄만 바꿔 옮긴 건 여전히 실격이다: 썸네일은 제목보다 짧고 세야 한다.
        .filter((c) => {
          const norm = (x: string) => x.replace(/[^가-힣a-zA-Z0-9]/g, "");
          const cn = norm(c), tn = norm(String(art.title ?? ""));
          if (!cn || !tn) return true;
          return !(tn.includes(cn) && cn.length >= tn.length * 0.75); // 제목의 4분의 3 이상을 그대로 옮겼으면 실격
        })
        .filter((c) => { // ★숫자 근거 게이트(실측: 접수 13일인데 '7월 14일까지' 유령 날짜) — 소스에 없는 숫자 문구 제외
          const src = `${art.title ?? ""} ${art.keyword ?? ""} ${art.meta_description ?? ""} ${String((art as { body_html?: string }).body_html ?? "").replace(/<[^>]+>/g, " ").slice(0, 1200)}`.replace(/[,\s]/g, "");
          for (const num of c.match(/[0-9][0-9,.]*/g) ?? []) {
            const n = num.replace(/,/g, "");
            if (n.length >= 1 && !src.includes(n)) return false;
          }
          return true;
        })
        .filter(Boolean)
        .filter((c) => bannedHits(c).length === 0)
        // ★게이트 동수화(2026-07-29 유저 실측 — 발행 썸네일에서 확인): WP 경로에만 있던 두 규칙이 네이버 경로엔 없었다.
        //  ①'전입신고 기간 총정리' — 정리류 금지어가 안 걸려 통과 ②'아직 기회 있어요' — 어느 글에나 붙는 범용 프레임
        //  ③'148만원 돌아옵니다!' — 느낌표(감정 과잉 텍스트는 썸네일 CTR을 낮춘다는 PTRP 실측)
        .filter((c) => !NAVER_COPY_BAN_RE.test(c))
        .filter((c) => !isStickyFrame(c));
      copies = [...new Set(cleaned)].slice(0, 4);
      if (copies.length === 0 && Array.isArray(raw) && raw.length > 0) {
        // ★관대한 회수(2026-07-13 실측: 임산부 지원금 — 주제어 게이트까지 전멸→판박이 폴백): 사실 정합(숫자·금지어)만 지키고 회수
        const src = `${art.title ?? ""} ${art.keyword ?? ""} ${art.meta_description ?? ""}`.replace(/[,\s]/g, "");
        copies = [...new Set((raw as unknown[]).map((c) => fit9(String(c).trim().replace(/^[\[\]"\u201c\u201d'\s]+|[\[\]"\u201c\u201d'\s]+$/g, "")) ?? "")
          .filter((c) => c && [...c].length >= 4 && bannedHits(c).length === 0)
          .filter((c) => (c.match(/[0-9][0-9,.]*/g) ?? []).every((num) => src.includes(num.replace(/,/g, "")))))].slice(0, 4);
      }
      if (copies.length === 0) console.error(`[thumb-copy] 시도${attempt + 1} 전멸 — raw:${Array.isArray(raw) ? raw.length : 0} (18자·분할·주제어·숫자 게이트 통과 0) kw:${String(art.keyword ?? "").slice(0, 20)}`);
    }
    if (copies.length === 0) {
      // 최후 폴백 — 규칙 기반(원가 0, 항상 성공). ★역할 분리(2026-07-17): 제목 반복 템플릿(총정리류) 대신 개념 훅 템플릿.
      const kw = String(art.keyword ?? art.title ?? "").split(/\s+/).slice(0, 2).join(" ").slice(0, 10) || "이번 정보";
      const yr = (String(art.title ?? "").match(/20\d{2}년/) ?? [])[0] ?? "";
      copies = [...new Set([`모르고 두면 새는 돈`, `${yr || "올해"} 달라집니다`, `내 경우는 얼마?`, `${kw} 하나만 기억`]
        .map(fit9).filter((c): c is string => !!c && [...c].length >= 4))].slice(0, 4);
      if (copies.length === 0) copies = [kw.slice(0, 9)];
    }
    return NextResponse.json({ copies });
  } catch {
    return NextResponse.json({ error: "문구를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
