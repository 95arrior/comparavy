// ★WP 대표 이미지 자동 생성(2026-07-12 유저: 테마 카드·구글 썸네일에 대표 이미지 필요) — AI 비용 0.
//  v2(유저 피드백): ①문구=키워드가 아니라 '제목의 훅 부분'(쉼표 뒤 질문/훅 — 제목과 연관) ②배경=본문 AI 배너 재활용(추가 비용 0, 색면 폴백).
import { renderThumbnail } from "./thumbnailRenderer";
import { visualIdentityFor } from "./visualIdentity";
import { breakThumbCopy } from "./thumbCopyBreak";

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
    let copy = breakThumbCopy(hook);
    for (let i = 0; i < 4 && copy.split("\n").some((l) => [...l].length > 9) && hook.includes(" "); i++) {
      hook = hook.split(" ").slice(0, -1).join(" ");
      copy = breakThumbCopy(hook);
    }
    if (!copy.trim()) return null;
    // 배경: 본문 배너 1장을 재활용(이미 생성된 AI 일러스트 — 추가 비용 0). 실패하면 색면 포스터 폴백.
    let bgDataUrl: string | null = null;
    if (opts?.bgUrl) {
      try {
        const r = await fetch(opts.bgUrl, { signal: AbortSignal.timeout(8000) });
        if (r.ok) {
          const mime = (r.headers.get("content-type") || "image/png").split(";")[0];
          bgDataUrl = `data:${mime};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
        }
      } catch { /* 색면 폴백 */ }
    }
    const png = await renderThumbnail({
      mainCopy: copy,
      identity: visualIdentityFor(userId),
      press: { brandName: (siteName || "").trim() || "BLOG" },
      articleId: articleId ?? keyword,
      bgDataUrl,
      fontTitle: "GmarketSansBold", // 유저 확정(2026-07-12) — WP 대표 이미지 폰트 고정
    });
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (e) {
    console.error("[wp] 대표 이미지 자동 생성 실패(발행은 계속):", e instanceof Error ? e.message : e);
    return null;
  }
}
