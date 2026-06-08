import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import Brand from "@/components/Brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "관리자" };

// ADMIN_EMAILS(쉼표 구분)에 등록된 이메일만 접근 가능. 그 외엔 홈으로.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function count(admin: any, table: string, build?: (q: any) => any): Promise<number | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin.from(table).select("id", { count: "exact", head: true });
  if (build) q = build(q);
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value === null ? "—" : value.toLocaleString()}</p>
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

  const admins = adminEmails();
  const isAdmin = admins.includes((user.email ?? "").toLowerCase());
  if (!isAdmin) redirect("/");

  const admin = createSupabaseAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    usersTotal,
    usersToday,
    proUsers,
    articlesTotal,
    articlesToday,
    publishedArticles,
    lockedArticles,
    wpConnections,
  ] = await Promise.all([
    count(admin, "users"),
    count(admin, "users", (q) => q.gte("created_at", todayIso)),
    count(admin, "users", (q) => q.eq("plan", "pro")),
    count(admin, "articles"),
    count(admin, "articles", (q) => q.gte("created_at", todayIso)),
    count(admin, "articles", (q) => q.eq("status", "published")),
    count(admin, "articles", (q) => q.eq("locked", true)),
    count(admin, "wordpress_connections", () => undefined),
  ]);

  const freeUsers = usersTotal !== null && proUsers !== null ? usersTotal - proUsers : null;

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
        <p className="mt-1 text-sm text-neutral-500">새로고침하면 최신 수치예요.</p>

        <h2 className="mt-8 text-sm font-medium text-neutral-400">회원</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="전체 회원" value={usersTotal} />
          <Stat label="오늘 가입" value={usersToday} />
          <Stat label="무료" value={freeUsers} />
          <Stat label="프로" value={proUsers} />
        </div>

        <h2 className="mt-8 text-sm font-medium text-neutral-400">글</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="전체 글" value={articlesTotal} />
          <Stat label="오늘 생성" value={articlesToday} />
          <Stat label="발행됨" value={publishedArticles} />
          <Stat label="미리보기(잠금)" value={lockedArticles} />
        </div>

        <h2 className="mt-8 text-sm font-medium text-neutral-400">연동</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="워드프레스 연결" value={wpConnections} />
        </div>
      </main>
    </div>
  );
}
