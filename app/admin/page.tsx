import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail, getAdminStats } from "@/lib/adminStats";
import Brand from "@/components/Brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "관리자" };

function Stat({ label, value, prefix = "", suffix = "" }: { label: string; value: number | null; prefix?: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value === null ? "—" : `${prefix}${value.toLocaleString()}${suffix}`}</p>
    </div>
  );
}

export default async function AdminPage() {
  if (!hasSupabaseEnv()) redirect("/");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/");

  const s = await getAdminStats();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/"><Brand /></Link>
          <span className="text-sm text-neutral-400">관리자 · {user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">관리자 통계</h1>
        <p className="mt-1 text-sm text-neutral-500">새로고침하면 최신 수치예요. (오늘 = 한국시간 기준)</p>

        <h2 className="mt-8 text-sm font-medium text-neutral-400">매출 · 전환</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="예상 월매출(MRR)" value={s.mrr} prefix="₩" />
          <Stat label="전환율(무료→프로)" value={s.conversion} suffix="%" />
        </div>

        <h2 className="mt-8 text-sm font-medium text-neutral-400">회원</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="전체 회원" value={s.usersTotal} />
          <Stat label="오늘 가입" value={s.usersToday} />
          <Stat label="무료" value={s.freeUsers} />
          <Stat label="프로" value={s.proUsers} />
        </div>

        <h2 className="mt-8 text-sm font-medium text-neutral-400">글</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="전체 글" value={s.articlesTotal} />
          <Stat label="오늘 생성" value={s.articlesToday} />
          <Stat label="발행됨" value={s.publishedArticles} />
          <Stat label="미리보기(잠금)" value={s.lockedArticles} />
        </div>

        <h2 className="mt-8 text-sm font-medium text-neutral-400">연동</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="워드프레스 연결" value={s.wpConnections} />
        </div>
      </main>
    </div>
  );
}
