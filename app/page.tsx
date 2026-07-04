import type { Metadata } from "next";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { isAdminEmail, getAdminStats } from "@/lib/adminStats";
import ConstructionScreen from "@/components/ConstructionScreen";
import NaverLanding from "@/components/landing/NaverLanding";
import DashboardClient from "@/components/dashboard/DashboardClient";
import type { Article } from "@/components/dashboard/types";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — 블로그 글쓰기, 키워드 하나면 끝` },
  description: SITE_DESCRIPTION,
  // ?src= 광고 추적 파라미터 변형들이 전부 깨끗한 홈 URL로 모이게(중복 색인 방지)
  alternates: { canonical: SITE_URL },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  let user = null;
  let supabase = null;
  if (hasSupabaseEnv()) {
    supabase = await createSupabaseServerClient();
    user = (await supabase.auth.getUser()).data.user;
  }

  // 로그인하면 홈이 곧 작업공간 — '대시보드로 이동'하는 뎁스를 없앤다
  const prelaunch = process.env.PRELAUNCH === "true";

  if (user && supabase) {
    const isAdmin = isAdminEmail(user.email);
    // 출시 전 잠금: 관리자가 아니면 앱 대신 '공사중' 화면 (결제·생성 도달 차단)
    if (prelaunch && !isAdmin) {
      return <ConstructionScreen email={user.email ?? ""} />;
    }
    const row = await ensureUserRow(supabase, user.id, user.email);
    const { data: activeProf } = await supabase.from("blog_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    // ★멀티 블로그 — 홈·코스·게이지는 '활성 블로그'의 글만(블로그당 안전선·진행). blog_id 없는 레거시는 포함(백필 후 소멸).
    let artQ = supabase
      .from("articles")
      .select("*")
      .eq("user_id", user.id)
      .not("status", "in", "(pre_generating,pre_generated)");
    if (activeProf?.id) artQ = artQ.or(`blog_id.eq.${activeProf.id},blog_id.is.null`);
    const { data: articles } = await artQ.order("created_at", { ascending: false });
    const adminStats = isAdmin ? await getAdminStats() : null;
    return (
      <DashboardClient
        email={user.email ?? ""}
        credits={row.credits ?? 0}
        initialArticles={(articles ?? []) as Article[]}
        isAdmin={isAdmin}
        adminStats={adminStats}
      />
    );
  }

  // 비로그인 방문자 → 새 랜딩(단일). 사전신청 폼으로 이메일 수집.
  return <NaverLanding />;
}
