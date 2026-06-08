import { createSupabaseAdminClient } from "./supabase-server";

export type AdminStats = {
  usersTotal: number | null;
  usersToday: number | null;
  proUsers: number | null;
  freeUsers: number | null;
  articlesTotal: number | null;
  articlesToday: number | null;
  publishedArticles: number | null;
  lockedArticles: number | null;
  wpConnections: number | null;
};

// ADMIN_EMAILS(쉼표 구분)에 등록된 이메일인지
export function isAdminEmail(email?: string | null): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function count(admin: any, table: string, build?: (q: any) => any): Promise<number | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin.from(table).select("id", { count: "exact", head: true });
  if (build) q = build(q);
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createSupabaseAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [usersTotal, usersToday, proUsers, articlesTotal, articlesToday, publishedArticles, lockedArticles, wpConnections] =
    await Promise.all([
      count(admin, "users"),
      count(admin, "users", (q) => q.gte("created_at", todayIso)),
      count(admin, "users", (q) => q.eq("plan", "pro")),
      count(admin, "articles"),
      count(admin, "articles", (q) => q.gte("created_at", todayIso)),
      count(admin, "articles", (q) => q.eq("status", "published")),
      count(admin, "articles", (q) => q.eq("locked", true)),
      count(admin, "wordpress_connections"),
    ]);

  const freeUsers = usersTotal !== null && proUsers !== null ? usersTotal - proUsers : null;
  return { usersTotal, usersToday, proUsers, freeUsers, articlesTotal, articlesToday, publishedArticles, lockedArticles, wpConnections };
}
