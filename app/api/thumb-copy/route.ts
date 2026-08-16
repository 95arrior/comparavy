import { NextResponse } from "next/server";
import { breakThumbCopy } from "@/lib/thumbCopyBreak";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { bannedHits } from "@/lib/hookPatterns";
import { isStickyFrame } from "@/lib/thumbCopyDiversity";

// ★FACT RISK 게이트(2026-08-17 유저: "이런 문장은 자동 탈락시키세요") — 공포형 어법은 본문이 그 구조를
//  실제로 명시했을 때만 허용. 클릭률만 보고 생성한 '6개월 모르면 그냥 날아간다'류가 실측 계기.
const FACT_RISK: { risk: RegExp; evidence: RegExp }[] = [
  { risk: /날아간다|날아갑니다|날린다/, evidence: /(소멸|환수|만료|마감|기한\s*내|자동\s*(소멸|취소))/ },
  { risk: /사라진다|사라집니다/, evidence: /(소멸|환수|폐지|종료)/ },
  { risk: /모르면\s*못\s*받|놓치면\s*못\s*받/, evidence: /(직접\s*신청|신청해야|신청자만|자동\s*지급되지\s*않)/ },
  { risk: /꼭\s*받아야|무조건\s*받/, evidence: /(신청\s*기한|마감|기간\s*내)/ },
  { risk: /전부\s*바뀐다|다\s*바뀐다|모두\s*바뀐다/, evidence: /(전면\s*개편|전부\s*변경|모두\s*변경|일괄)/ },
  { risk: /무조건\s*손해|반드시\s*손해/, evidence: /(?!)/ }, // 근거 불문 탈락
];
const factRiskFail = (copy: string, bodySrc: string): boolean =>
  FACT_RISK.some((r) => r.risk.test(copy) && !r.evidence.test(bodySrc));

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
    // ★훅 패밀리 개편(2026-08-17 유저 실측 판정 — "전부 '아니다' 계열, 하나의 감정을 4번 변형했다"):
    //  후보 6개는 반드시 서로 다른 훅 패밀리에서 하나씩. 같은 감정의 변형 6개는 후보 0개와 같다.
    //  ★제목 관계 재재정의(3차): 07-17 역할분리 → 08-06 '제목 핵심 그대로' → 08-17 유저 재반전:
    //   "썸네일은 제목을 요약하지 않는다. 제목을 읽게 만드는 한 조각만 준다."
    //   정답 관계: 썸네일 "8월 숫자, 아직 바뀝니다" → 독자 "왜 바뀌지?" → 제목 "8월 말 예산안 공시부터 국회 통과까지…"가 답.
    `네이버 블로그 썸네일에 큰 글씨로 박을 문구 6개를 만들어줘. 글 제목: "${art.title}" / 키워드: "${art.keyword}"${art.meta_description ? ` / 요지: ${String(art.meta_description).slice(0, 150)}` : ""}`,
    `본문 도입(문구는 이 내용이 증명할 수 있는 것만): ${String((art as { body_html?: string }).body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500)}`,
    "",
    "★대전제 — 썸네일과 제목의 역할: 홈피드에서 둘은 함께 노출된다. 제목이 이미 무엇에 관한 글인지 설명하므로, 썸네일이 제목을 요약하면 같은 말을 두 번 하는 것이다. 썸네일은 '왜?'라는 궁금증 한 조각만 던지고, 제목이 그 답이 된다. (예: 썸네일 '8월 숫자, 아직 바뀝니다' → '왜 바뀌지?' → 제목 '예산안 공시부터 국회 통과까지'가 답)",
    "",
    "★훅 패밀리 6종 — 후보 6개는 반드시 아래에서 하나씩, 의미 자체가 달라야 한다(어미만 바꾼 변형은 실격):",
    "A. 반전형 — 알던 것이 끝이 아님 (예: '8월 발표가 끝이 아닙니다')",
    "B. 숫자·시점형 — 본문 실값·날짜 하나를 크게 (예: '진짜 중요한 건 12월', '월 7만원 차이')",
    "C. 경고형 — 성급한 판단 제동, 단 본문 근거 안에서만 (예: '8월 숫자만 믿지 마세요')",
    "D. 변화형 — 아직 움직이는 중 (예: '8월 숫자, 아직 바뀝니다')",
    "E. 질문형 — 물음표 1개 (예: '8월에 확정되는 걸까요?')",
    "F. 대상·체감형 — 독자를 지목 (예: '직장인은 이때 다시 봐야 합니다')",
    "",
    "★MONEY 훅 vs TIME 훅 분기(2026-08-17 유저: '내 돈'을 기계적으로 넣지 마라): '내 돈·월급·손해' 어법은 본문 핵심이 실제 금액 변화일 때만 쓴다(예: '월 7만원 더 냅니다'가 본문에 있는 글). 본문 핵심이 과정·시점·절차면 TIME 훅('아직 바뀝니다'·'끝이 아닙니다'·'진짜 확정은 나중')을 쓴다. 금액 계산 글이 아닌데 '내 돈 아니다'라고 하면 글보다 강한 약속이 되어 실격.",
    "",
    "★내부 채점(과정 출력 금지) — 각 후보를 이 배점으로 심사하고 총점 순으로만 살려라: 모바일 멈춤력 25 / 본문 팩트 일치 25 / 제목과 비중복 20 / 한눈 이해 15 / 감정·호기심 10 / 인물 이미지와 궁합 5. ★팩트 일치가 25점 만점에 20점 미만이면 총점과 무관하게 즉시 탈락 — 클릭이 세도 본문이 증명 못 하면 버린다.",
    "",
    "규칙:",
    "- 길이: 공백 포함 7~14자 전후가 최적(시각 기준 — 인물 중심 썸네일이라 문구가 길면 인물과 경쟁한다). 절대 상한 18자(고정 폰트 한 줄 9자 x 2줄).",
    "- ★사실 정합(절대 조항): 본문·제목에 실제로 있는 사실·숫자·조건만. 없는 숫자·인과·위협을 지어내면 실격(실측 실격: '6개월 모르면 그냥 날아간다' — 무엇이 왜 날아가는지 본문에 없음). '날아간다·사라진다·무조건 손해·모르면 못 받는다·전부 바뀐다'류는 본문에 그 구조(소멸·환수·마감)가 명시된 경우에만 허용.",
    "- ★완결된 구어 — 사람이 소리 내 말할 수 있는 말만. '~다는 것' 같은 문어 조각 실격.",
    "- 금지: 무조건·100%·보장·충격·경악·미쳤·소름·역대급·레전드·실화 등 감정 과잉 어휘, 느낌표, 이모지, '완벽 정리·총정리'류 목차 표현.",
    "- 출력 계약(어기면 실패): 설명 없이 첫 글자가 [ 이고 마지막 글자가 ] 인 JSON 배열 한 줄, A→F 순서로 6개. 예: [\"8월 발표가 끝이 아닙니다\",\"진짜 중요한 건 12월\",...]",
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
          return !(tn.includes(cn) && cn.length >= tn.length * 0.6); // ★0.75→0.6(2026-08-17 유저: 썸네일이 제목을 요약하고 있었다) — 제목 요약 억제 강화
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
        // ★FACT RISK(2026-08-17) — 공포형 어법은 본문이 소멸·환수·마감 구조를 명시했을 때만 생존
        .filter((c) => !factRiskFail(c, `${art.title ?? ""} ${String((art as { body_html?: string }).body_html ?? "").replace(/<[^>]+>/g, " ").slice(0, 3000)}`))
        // ★게이트 동수화(2026-07-29 유저 실측 — 발행 썸네일에서 확인): WP 경로에만 있던 두 규칙이 네이버 경로엔 없었다.
        //  ①'전입신고 기간 총정리' — 정리류 금지어가 안 걸려 통과 ②'아직 기회 있어요' — 어느 글에나 붙는 범용 프레임
        //  ③'148만원 돌아옵니다!' — 느낌표(감정 과잉 텍스트는 썸네일 CTR을 낮춘다는 PTRP 실측)
        .filter((c) => !NAVER_COPY_BAN_RE.test(c))
        .filter((c) => !isStickyFrame(c));
      copies = [...new Set(cleaned)].slice(0, 6); // ★6개(2026-08-17 훅 패밀리 A~F — 하나씩)
      if (copies.length === 0 && Array.isArray(raw) && raw.length > 0) {
        // ★관대한 회수(2026-07-13 실측: 임산부 지원금 — 주제어 게이트까지 전멸→판박이 폴백): 사실 정합(숫자·금지어)만 지키고 회수
        const src = `${art.title ?? ""} ${art.keyword ?? ""} ${art.meta_description ?? ""}`.replace(/[,\s]/g, "");
        copies = [...new Set((raw as unknown[]).map((c) => fit9(String(c).trim().replace(/^[\[\]"\u201c\u201d'\s]+|[\[\]"\u201c\u201d'\s]+$/g, "")) ?? "")
          .filter((c) => c && [...c].length >= 4 && bannedHits(c).length === 0)
          .filter((c) => (c.match(/[0-9][0-9,.]*/g) ?? []).every((num) => src.includes(num.replace(/,/g, "")))))].slice(0, 6);
      }
      if (copies.length === 0) console.error(`[thumb-copy] 시도${attempt + 1} 전멸 — raw:${Array.isArray(raw) ? raw.length : 0} (18자·분할·주제어·숫자 게이트 통과 0) kw:${String(art.keyword ?? "").slice(0, 20)}`);
    }
    if (copies.length === 0) {
      // 최후 폴백 — 규칙 기반(원가 0, 항상 성공). ★역할 분리(2026-07-17): 제목 반복 템플릿(총정리류) 대신 개념 훅 템플릿.
      const kw = String(art.keyword ?? art.title ?? "").split(/\s+/).slice(0, 2).join(" ").slice(0, 10) || "이번 정보";
      const yr = (String(art.title ?? "").match(/20\d{2}년/) ?? [])[0] ?? "";
      // ★폴백도 훅 패밀리 분산(2026-08-17) — 반전/변화/질문/대상 하나씩
      copies = [...new Set([`발표가 끝이 아닙니다`, `${yr || "지금"} 아직 바뀝니다`, `내 경우는 얼마?`, `${kw} 다시 봐야 합니다`]
        .map(fit9).filter((c): c is string => !!c && [...c].length >= 4))].slice(0, 6);
      if (copies.length === 0) copies = [kw.slice(0, 9)];
    }
    return NextResponse.json({ copies });
  } catch {
    return NextResponse.json({ error: "문구를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
