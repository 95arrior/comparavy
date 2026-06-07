import { redirect } from "next/navigation";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import DashboardClient from "@/components/dashboard/DashboardClient";
import type { Article } from "@/components/dashboard/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!hasSupabaseEnv()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-10 text-center text-neutral-500">
        서버 설정이 완료되지 않았습니다. 환경변수(Supabase·Anthropic)를 확인해 주세요.
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const row = await ensureUserRow(supabase, user.id);

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("site_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <DashboardClient
      email={user.email ?? ""}
      plan={row.plan}
      articlesUsed={row.articles_used}
      articlesLimit={row.articles_limit}
      initialArticles={(articles ?? []) as Article[]}
      wpSiteUrl={conn?.site_url ?? null}
    />
  );
}
