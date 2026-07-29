// ★WP 대표 이미지 자동 생성(2026-07-12 유저: 테마 카드·구글 썸네일에 대표 이미지 필요) — AI 비용 0.
//  v2(유저 피드백): ①문구=키워드가 아니라 '제목의 훅 부분'(쉼표 뒤 질문/훅 — 제목과 연관) ②배경=본문 AI 배너 재활용(추가 비용 0, 색면 폴백).
import { renderThumbnail } from "./thumbnailRenderer";
import { visualIdentityFor } from "./visualIdentity";
import { breakThumbCopy, repeatsTitle } from "./thumbCopyBreak";
import { bannedHits } from "./hookPatterns";
import { THUMB_ROLES, pickDiverseCopy, type ThumbCandidate } from "./thumbCopyDiversity";
import Anthropic from "@anthropic-ai/sdk";
import { generateThumbBackground } from "./geminiImage";

// ★WP 대표이미지 브랜드 팔레트(2026-07-19 유저 확정): 프라이머리 #0169F0 단색 + 흰 텍스트(대비 4.9:1).
//  유저별 랜덤 팔레트 대신 채널 고정색 — 목록에서 브랜드로 읽힌다. (추후 blog_profiles 색 필드로 확장 여지)
const WP_BRAND_PALETTE = { name: "wp-brand-primary", bg: "#0169F0", title: "#FFFFFF", point: "#FFE066", panel: "#0148A8CC" };

// ★WP 전용 금지 표현(2026-07-19 유저 CTR 카피 지침 — 워드프레스만): '모르면 손해' 포함 과장·정리류 금지.
//  대신 사실 기반 표현('놓치기 쉽습니다', '여기서 갈립니다'). 네이버 경로는 이 규칙을 쓰지 않는다.
const WP_COPY_BAN_RE = /(완벽\s?정리|총\s?정리|핵심\s?정리|필수(?![가-힣])|끝판왕|공짜|대박|모르면\s?손해)/;

// ★역할 예시 원문 — 베끼기 검출용(실측 2026-07-20: '여기서 많이 틀합니다' — 하이쿠가 예시를 오타로 복붙해 발행).
//  예시는 '형식' 참고용이지 문구가 아니다. 정규화 후 예시와 같거나 한 글자 변형이면 실격.
const COPY_EXAMPLES = ["여기서많이틀립니다", "먼저확인하세요", "이것부터하세요", "오늘확인하세요", "생각보다큽니다", "세금이달라집니다", "환급이달라집니다", "왜그럴까요", "의외였습니다", "여기서갈립니다", "3분이면됩니다", "오늘끝내세요", "마감전에", "놓치기쉽습니다", "먼저이것부터", "신청전5분", "내몫부터확인"];
export function isExampleCopy(c: string): boolean {
  const n = c.replace(/[\s.!?]/g, "");
  return COPY_EXAMPLES.some((e) => {
    if (n === e) return true;
    if (Math.abs(n.length - e.length) > 1) return false; // 한 글자 변형('틀립니다'→'틀합니다')까지 잡는다
    let diff = 0;
    for (let i = 0; i < Math.min(n.length, e.length); i++) if (n[i] !== e[i]) diff++;
    return diff + Math.abs(n.length - e.length) <= 1;
  });
}

// ★문구 LLM v4(2026-07-29 유저 실측 — 발행 4편 연속 '가장 많이 ~'): 역할 로테이션 채택 + 범용 프레임 게이트.
//  v3는 후보 6개 중 '통과한 첫 개'를 집었는데, 모델이 항상 ①실수 역할을 먼저 내놓아 전 글이 같은 틀로 굳었다.
//  이제 글별 시드로 시작 역할을 돌리고(thumbCopyDiversity), 후보에 역할 태그를 받아 배정 역할부터 훑는다.
//  "제목은 검색을 만족시키고, 썸네일은 클릭 이유를 만든다."
async function llmWpThumbCopy(title: string, keyword: string, seed: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !title.trim()) return null;
  try {
    const client = new Anthropic({ apiKey: key });
    const roleSpec = THUMB_ROLES.map((r, i) => `${i + 1}.${r.label}(${r.guide} 예: ${r.example})`).join(" ");
    const res = await client.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 500,
      messages: [{ role: "user", content: [
        `블로그 목록에서 제목 옆에 놓일 썸네일 문구 후보 ${THUMB_ROLES.length}개를 만들어줘. 너는 디자이너가 아니라 CTR 카피라이터다 — 예쁜 문구가 아니라 스크롤을 멈추게 하는 문구.`,
        `제목: "${title}" — 제목은 검색을 만족시키고, 썸네일은 '클릭 이유'를 만든다. 독자가 왜 이 제목을 검색했는지 생각하고, 가장 궁금한 한 가지만 문구에 담아라. 썸네일과 제목을 이어 읽으면 하나의 문장이 되어야 한다(좋은 예 — 제목 '정책자금, 어떻게 신청하나요?' + 문구 '먼저 이것부터' → 독자: '먼저 뭘?').`,
        `역할 ${THUMB_ROLES.length}종을 하나씩 정확히 한 개(후보마다 1역할, 역할 번호를 반드시 붙인다): ${roleSpec}. 단 경고는 사실 기반만('모르면 손해' 금지).`,
        `규격: 한 줄 8~10자, 최대 2줄, 전체 20자 이내(공백 포함). 제목 키워드·주제 명사 반복 절대 금지(정책자금·IRP·총정리류 — 주제는 제목이 말한다). 금지 표현: 완벽정리·총정리·핵심정리·무조건·반드시·100%·필수·역대급·충격·대박·공짜·모르면 손해.`,
        `★범용 프레임 실격(2026-07-29 실측 — 발행 글 4편이 전부 '가장 많이 헷갈리는/착각하는/빠지는'으로 나가 목록이 한 글처럼 보였다): '가장 많이·제일 많이·많이들·흔히 하는·다들 놓치는'처럼 주제를 지워도 말이 되는 틀은 전부 실격. 판정법 — 문구에서 이 글 얘기를 빼고 읽어도 자연스럽다면 그건 어느 글에나 붙는 문구다. 이 제목 고유의 각도(이 글에서만 나올 수 있는 지점·숫자·시점)로 다시 써라.`,
        `★예시 베끼기 실격(절대) — 위 역할 예시 문구를 그대로/한 글자만 바꿔 쓰면 실격이다. 예시는 형식 참고일 뿐. 맞춤법 오류도 실격. 후보 ${THUMB_ROLES.length}개는 첫 어절이 서로 달라야 한다.`,
        `제출 전 자기검사(과정 출력 금지): ①제목과 같은 말인가 → 다시 ②썸네일만 봐도 궁금한가 → 아니면 다시 ③본문(제목이 약속한 내용)이 증명 가능한가 ④0.5초 안에 읽히는가 ⑤예시를 베꼈거나 범용 프레임인가 → 다시. 통과분만 JSON 한 줄로 출력: [{"role":1,"copy":"..."},{"role":2,"copy":"..."}]`,
      ].join("\n") }],
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    const raw = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]") as unknown[];
    const cands: ThumbCandidate[] = raw.map((x) => {
      if (x && typeof x === "object") { const o = x as { role?: unknown; copy?: unknown; text?: unknown }; return { role: (o.role ?? null) as string | number | null, copy: String(o.copy ?? o.text ?? "").trim() }; }
      return { role: null, copy: String(x).trim() }; // 구형 문자열 배열 폴백 — 제시 순서를 역할 순서로 본다
    }).filter((c) => c.copy);
    return pickDiverseCopy(cands, seed, (c) =>
      [...c].length <= 20 && !repeatsTitle(c, title, keyword) && bannedHits(c).length === 0 && !WP_COPY_BAN_RE.test(c) && !isExampleCopy(c));
  } catch { /* 폴백 — 규칙 추출 */ }
  return null;
}

/** 문구만 미리보기(발행 글 재썸네일 스크립트용) — 이미지 생성·업로드 없이 LLM 문구만 뽑는다. */
export async function wpThumbCopyFor(title: string, keyword: string, seed: string): Promise<string | null> {
  return llmWpThumbCopy(title, keyword, seed);
}

/** 제목에서 훅 문구 추출 — "개인연금 세액공제, 연봉별로 얼마나 돌려받을 수 있을까" → "연봉별로 얼마나 돌려받을까" */
export function hookCopyFromTitle(title: string | null | undefined, keyword: string): string {
  const t = String(title ?? "").trim();
  const parts = t.split(/[,，:：|｜]/); // 쉼표·콜론·파이프 — 뒤쪽이 훅
  let hook = (parts.length >= 2 ? parts.slice(1).join(" ") : t).trim();
  // ★의문사 조각 방지(실측 2026-07-19: '어떻게 신청하나요' — 주제 없는 반쪽) — 의문사로 시작하는 뒷조각이면 제목 앞부분으로
  if (/^(어떻게|왜|언제|어디서|무엇|뭐가?|얼마나|누가)/.test(hook)) {
    const head = (parts[0] ?? "").trim();
    if ([...head].length >= 4) hook = head;
  }
  // 어미 압축: "돌려받을 수 있을까"→"돌려받을까", "받을 수 있나요"→"받나요" (형태소 경계 유지)
  hook = hook.replace(/을?\s*수\s*있(을까요?|나요)\s*\??$/, (m) => (/나요/.test(m) ? "나요" : "을까")).replace(/\?$/, "").trim();
  if ([...hook].length < 6) hook = t.replace(/\?$/, "").trim(); // 훅이 너무 짧으면 제목 전체
  if ([...hook].length < 4) hook = keyword;
  // 22자 상한 — 단어 중간에서 자르지 않는다(마지막 공백에서 끊기)
  if ([...hook].length > 22) {
    const cut = hook.slice(0, 22);
    const sp = cut.lastIndexOf(" ");
    hook = (sp > 8 ? cut.slice(0, sp) : cut).trim();
  }
  // 꼬리 불완전 토큰 제거(실측: "…환급액까지 한") — 마지막 단어가 1글자 연결어면 떨군다
  hook = hook.replace(/\s+(한|그|이|저|더|또|및|등)$/, "").trim();
  // ★외꼬리 조각 방지(실측 2026-07-14: "비트코인부터" 한 어절) — 어절 1개가 연결 조사로 끝나면 제목 앞부분으로
  if (/^\S+$/.test(hook) && /(부터|까지|처럼|보다|대신|하며)$/.test(hook)) {
    const head = (String(title ?? "").split(/[,，:：|｜]/)[0] ?? "").replace(/\?$/, "").trim();
    if ([...head].length >= 6) hook = [...head].length > 22 ? head.slice(0, 22).trim() : head;
    else hook = keyword;
  }
  return hook;
}

export async function autoFeaturedImage(
  userId: string,
  keyword: string,
  siteName: string,
  articleId?: string | null,
  opts?: { title?: string | null; bgUrl?: string | null },
): Promise<string | null> {
  try {
    // ★줄당 9자 보장(고정 폰트 112px 규격) — 초과하면 마지막 어절을 덜어내고 재분할
    let hook = (await llmWpThumbCopy(String(opts?.title ?? ""), String(keyword || "").trim(), `${userId}:${articleId ?? keyword}`)) // ★1순위: 역할 분리 개념 훅(LLM, 게이트 통과분 중 글별 배정 역할)
      ?? hookCopyFromTitle(opts?.title, String(keyword || "").trim()); // 폴백: 규칙 추출(의문사 조각 방지 포함)
    if (bannedHits(hook).length > 0 || WP_COPY_BAN_RE.test(hook)) hook = String(keyword || "").trim() || hook; // ★문구 게이트(PTRP+WP 카피 지침) — 감정 과잉·과장 훅은 키워드 폴백
    let copy = breakThumbCopy(hook);
    for (let i = 0; i < 4 && copy.split("\n").some((l) => [...l].length > 9) && hook.includes(" "); i++) {
      hook = hook.split(" ").slice(0, -1).join(" ");
      copy = breakThumbCopy(hook);
    }
    if (!copy.trim()) return null;
    // ★2D 일러스트 배경 확정(2026-07-19 유저 재결정: 단색 대신 네이버식 플랫 일러스트 — 단, 글마다 완전히 다른 그림).
    //  대본 = 제목 전체(각도 포함) + 훅 문구(감정 포인트) → 같은 ETF라도 추천글·설명글이 다른 장면(ANGLE-UNIQUE 규칙).
    //  글별 시드 + 은유 극화 신규 생성(배너 재활용 아님 — 재활용이 비슷한 그림 반복의 원인이었다). 실패 시 브랜드 단색(#0169F0) 폴백.
    let bgDataUrl: string | null = null;
    try {
      const bg = await generateThumbBackground("", "", `${userId}:${articleId ?? keyword}`, String(opts?.title ?? keyword), { copyText: hook });
      bgDataUrl = `data:${bg.mime};base64,${bg.base64}`;
    } catch (e) { console.error("[wp-thumb] AI 배경 실패 — 브랜드 단색 폴백:", e instanceof Error ? e.message.slice(0, 120) : e); }
    const png = await renderThumbnail({
      mainCopy: copy,
      // 일러스트 배경이면 원 정체성 팔레트(텍스트 색), 폴백 색면일 때만 브랜드 단색
      identity: bgDataUrl ? visualIdentityFor(userId) : { ...visualIdentityFor(userId), palette: WP_BRAND_PALETTE },
      press: { brandName: (siteName || "").trim() || "BLOG" },
      articleId: articleId ?? keyword,
      bgDataUrl,
      fontTitle: "GmarketSansBold", // 유저 확정(2026-07-12) — WP 대표 이미지 폰트 고정
      pressFixedSize: 112, // WP 통일 크기(네이버는 동적 대형 유지)
    });
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (e) {
    console.error("[wp] 대표 이미지 자동 생성 실패(발행은 계속):", e instanceof Error ? e.message : e);
    return null;
  }
}
