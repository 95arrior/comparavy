// ★'함께 보면 좋은 글'이 왜 안 붙는지 숫자로 답한다(2026-08-06 유저: "맨 하단에 추천 글감 링크 안 나오던데").
//  파이프는 정상이다(마감 → 마커 → 발행 렌더까지 실측 확인). 링크가 안 붙는 경우는 하나뿐이다: 후보가 0개.
//  ★후보 조건은 '내가 쓴 글 + 확정된 네이버 주소'다. 주소가 없으면 링크가 될 수 없다.
//   그런데 그 주소는 발행 확인(verify-post)이 네이버 검색에서 내 글을 찾아냈을 때만 채워진다 —
//   즉 붙여넣기만 하고 발행 확인을 안 했거나, 네이버가 아직 색인하지 않았으면 후보가 0이다.
//  ★이건 결품이 아니라 정상 동작이라, 로그에만 남으면 유저는 '기능이 고장 났다'로 읽는다.
//   그래서 어느 단계에서 끊겼는지를 보여준다. 읽기 전용이다.
import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { relatedPostsFor } from "@/lib/relatedPosts";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("blog_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const { data: rows } = await supabase.from("articles")
    .select("id, title, status, naver_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  const all = rows ?? [];
  const 발행확인됨 = all.filter((a) => ["verified", "published"].includes(String(a.status)) && a.naver_url);
  const 확인대기 = all.filter((a) => !a.naver_url);
  const cands = await relatedPostsFor(supabase, user.id, (prof as { id?: string } | null)?.id ?? null, "");

  // ★단계별로 몇 개가 남는지 — 어디서 끊겼는지가 한눈에 보여야 한다
  const 단계 = {
    "① 내가 쓴 글": all.length,
    "② 발행 확인돼 주소가 잡힌 글": 발행확인됨.length,
    "③ 수명 게이트 통과(후보)": cands.length,
  };
  const 진단 = 발행확인됨.length === 0
    ? "★발행 확인된 글이 하나도 없다 — 네이버에 붙여넣은 뒤 '발행 확인'을 눌러야 주소가 잡힌다. 주소가 없으면 링크를 만들 수 없다(고장이 아니다)."
    : cands.length === 0
      ? "★주소는 있는데 전부 수명 게이트에 걸렸다(제목에 'N월·올해' 같은 날짜가 박힌 글). 날짜 없는 글이 하나만 생겨도 붙기 시작한다."
      : cands.length < 2
        ? `후보가 ${cands.length}개뿐이라 링크도 ${cands.length}개만 붙는다. 발행 확인된 글이 늘면 최대 3개까지 붙는다.`
        : `정상 — 다음 글부터 링크 ${Math.min(3, cands.length)}개가 붙는다.`;

  return NextResponse.json({
    단계,
    진단,
    확인대기: 확인대기.slice(0, 8).map((a) => ({ 제목: String(a.title ?? "").slice(0, 40), 상태: a.status })),
    후보: cands.map((c) => c.title.slice(0, 40)),
  });
}
