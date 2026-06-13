import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail, getAdminStats } from "@/lib/adminStats";
import Brand from "@/components/Brand";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "관리자" };

export default async function AdminPage() {
  if (!hasSupabaseEnv()) redirect("/");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/");

  const stats = await getAdminStats();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/"><Brand /></Link>
          <span className="text-sm text-neutral-400">관리자 · {user.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <AdminDashboard stats={stats} />
      </main>
    </div>
  );
}
