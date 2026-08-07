// ★'함께 보면 좋은 글' 후보 뽑기 — 한 곳(2026-08-04).
//  종전엔 /api/generate 안에만 있어서, 카드에서 바로 열리는 글(/api/pregen)에는 링크가 아예 없었다.
//  ★후보 조건은 하나뿐이다: 내가 쓴 글이면서 '확정된 네이버 주소'가 있는 글.
//   주소가 없으면 링크가 될 수 없다 — 그래서 발행 확인을 안 한 글은 후보가 아니다(결품이 아니라 정상).
import type { SupabaseClient } from "@supabase/supabase-js";

/** 행동 창이 닫히면 수명이 끝나는 글(접수·마감형) — 링크로 걸면 곧 죽은 링크가 된다. */
const TIMED = /(무순위|청약|공고|마감|접수|모집|선착순|추첨)/;
/** ★링크 수명 원칙(2026-07-14 유저: 주담대 글은 1년 읽히는데 '7월 세제개편' 링크는 다음 달이면 낡는다) */
const MONTHLY_RE = /(^|[^0-9가-힣])(1[0-2]|[1-9])월|올해|이번\s?(주|달)|하반기|상반기/;

export interface RelatedPost { title: string; url: string }

// ★시리즈 우선(2026-08-07 유저 확정 ② — 지수 레버 '세션당 2페이지').
//  종전엔 최신순 3개(연관 무관 — 2026-08-04 유저 확정)였는데, 같은 사건의 전편이 있으면
//  그게 최신 글보다 훨씬 잘 눌린다: 공급대책 2탄을 읽는 사람에게 1탄이 곧 다음 페이지다.
//  ★연관 판정을 되살리는 게 아니다 — 후보를 자르지 않고 '순서만' 바꾼다(자르면 링크 결품이 재발한다).
const SERIES_GENERIC = new Set(["신청방법", "신청자격", "확인방법", "총정리", "정리", "방법", "조건", "기준", "지원금", "청약"]);
export function seriesFirst<T extends { keyword?: string | null; title?: string | null }>(cands: T[], keyword: string): T[] {
  const toks = (t: string) => new Set(String(t || "").split(/\s+/)
    .map((w) => w.replace(/[^가-힣a-zA-Z0-9]/g, ""))
    .filter((w) => [...w].length >= 4 && !SERIES_GENERIC.has(w)));
  const mine = toks(keyword);
  if (!mine.size) return cands;
  const shared = (c: T) => {
    const theirs = toks(`${c.keyword ?? ""} ${c.title ?? ""}`);
    let n = 0; for (const w of theirs) if (mine.has(w)) n += 1;
    return n;
  };
  // 안정 정렬 — 겹침 많은 순, 같으면 원래 순서(최신순) 유지
  return cands.map((c, i) => ({ c, i, sc: shared(c) }))
    .sort((a, b) => b.sc - a.sc || a.i - b.i)
    .map((x) => x.c);
}

/**
 * 같은 블로그의 확정 URL 글에서 관련글 후보 최대 3개.
 * ★연관 판정은 하지 않는다(2026-08-04 유저 확정: "꼭 연관 없어도 될 것 같은데").
 *  종전엔 LLM이 '검색자 심리 연속성'으로 골랐는데 규칙이 "확신 없으면 0개"라 링크가 통째로 빠지는 날이 잦았다.
 *  재테크 블로그의 최근 글은 어차피 대부분 재테크고, 링크 카드는 네이버 편집기에서 분량을 안 먹는다.
 * ★지키는 것은 둘: 같은 글 두 번 금지, 수명 짧은 글 제외.
 */
export async function relatedPostsFor(
  db: SupabaseClient,
  userId: string,
  blogId: string | null,
  keyword: string,
): Promise<RelatedPost[]> {
  try {
    let rq = db.from("articles")
      .select("keyword, title, naver_url, created_at")
      .eq("user_id", userId)
      .in("status", ["verified", "published"])
      .not("naver_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);
    if (blogId) rq = rq.or(`blog_id.eq.${blogId},blog_id.is.null`);
    const { data: cands } = await rq;
    const withUrl = (cands ?? []).filter((c) => !!c.naver_url);
    const pool = withUrl.filter((c) =>
      !TIMED.test(`${c.keyword ?? ""} ${c.title ?? ""}`)
      && !MONTHLY_RE.test(String(c.title ?? "")));
    // ★두 필터가 겹치면 후보가 통째로 사라진다(2026-08-05 유저 실측: 관련글이 하나도 안 붙었다).
    //  경제·재테크 블로그는 제목에 '청약·공고·접수'와 'N월·올해'가 거의 항상 들어간다 —
    //  수명 게이트가 옳더라도, 그 결과가 '내부 링크 0'이면 회유 장치를 통째로 잃는다.
    //  ★그래서 전멸했을 때만 한 단계 물러선다: 날짜가 박힌 글(MONTHLY)은 여전히 빼되,
    //   공고성 글(TIMED)은 받아들인다. 지난 공고라도 내 글이고, 링크가 없는 것보다는 낫다.
    const relaxed = pool.length >= 2 ? pool
      : [...pool, ...withUrl.filter((c) => !pool.includes(c) && !MONTHLY_RE.test(String(c.title ?? "")))];
    if (pool.length < 2 && relaxed.length > pool.length) {
      console.log(`[related] 수명 게이트로 전멸 — 공고성 글까지 받아 ${pool.length} → ${relaxed.length}개(날짜 박힌 글은 계속 제외)`);
    }
    const seen = new Set<string>();
    const out = seriesFirst(relaxed, keyword)
      .map((c) => ({ title: String(c.title ?? c.keyword ?? "관련 글"), url: String((c as { naver_url?: string }).naver_url ?? "") }))
      .filter((r) => {
        const u = r.url.split("?")[0];
        if (!u || seen.has(u)) return false;
        seen.add(u);
        return true;
      })
      .slice(0, 3);
    console.log(`[related] 후보 ${out.length}개 · 확정 URL 글 ${withUrl.length}/${cands?.length ?? 0} · 수명 게이트 통과 ${pool.length}${withUrl.length === 0 ? " ★확정 URL(naver_url)이 있는 글이 하나도 없다 — 발행 확인이 안 된 상태다" : ""}`);
    return out;
  } catch {
    return []; // 무해 — 링크 없이 진행
  }
}
