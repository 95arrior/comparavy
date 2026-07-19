// ★WP 대표 이미지 자동 생성(2026-07-12 유저: 테마 카드·구글 썸네일에 대표 이미지 필요) — AI 비용 0.
//  v2(유저 피드백): ①문구=키워드가 아니라 '제목의 훅 부분'(쉼표 뒤 질문/훅 — 제목과 연관) ②배경=본문 AI 배너 재활용(추가 비용 0, 색면 폴백).
import { renderThumbnail } from "./thumbnailRenderer";
import { visualIdentityFor } from "./visualIdentity";
import { breakThumbCopy } from "./thumbCopyBreak";
import { bannedHits } from "./hookPatterns";

/** 제목에서 훅 문구 추출 — "개인연금 세액공제, 연봉별로 얼마나 돌려받을 수 있을까" → "연봉별로 얼마나 돌려받을까" */
export function hookCopyFromTitle(title: string | null | undefined, keyword: string): string {
  const t = String(title ?? "").trim();
  const parts = t.split(/[,，:：|｜]/); // 쉼표·콜론·파이프 — 뒤쪽이 훅
  let hook = (parts.length >= 2 ? parts.slice(1).join(" ") : t).trim();
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
    let hook = hookCopyFromTitle(opts?.title, String(keyword || "").trim());
    if (bannedHits(hook).length > 0) hook = String(keyword || "").trim() || hook; // ★문구 게이트(2026-07-17 PTRP) — 감정 과잉 훅은 키워드 폴백
    let copy = breakThumbCopy(hook);
    for (let i = 0; i < 4 && copy.split("\n").some((l) => [...l].length > 9) && hook.includes(" "); i++) {
      hook = hook.split(" ").slice(0, -1).join(" ");
      copy = breakThumbCopy(hook);
    }
    if (!copy.trim()) return null;
    // ★단색(프라이머리) 배경 확정(2026-07-19 유저: 배너 재활용 오브젝트가 글마다 비슷한 그림 반복 — 텍스트는 그대로, 배경은 컬러로).
    //  유저 시각 정체성 팔레트(유저별 고정 1색)가 곧 브랜드 프라이머리 — 목록에서 채널 일관성, AI 느낌 원천 제거, 비용 0.
    const bgDataUrl: string | null = null; // 색면 포스터 경로 강제(배너 재활용 폐기 — opts.bgUrl 무시)
    const png = await renderThumbnail({
      mainCopy: copy,
      identity: visualIdentityFor(userId),
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
