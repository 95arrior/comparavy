import { createSupabaseAdminClient } from "./supabase-server";
import { PLANS } from "./plans";

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
  /** 예상 월매출(MRR) = 프로 수 × 프로 가격 */
  mrr: number | null;
  /** 전환율(무료→프로) % */
  conversion: number | null;
  recentUsers: { email: string; created_at: string }[];
  recentArticles: { title: string; status: string; locked: boolean; created_at: string }[];
};

// 코드 기본 관리자 (env 없이도 항상 관리자). 서버 전용 파일이라 노출되지 않음.
const BASE_ADMINS = ["w.95arrior@gmail.com", "tjdghdlgh@gmail.com"];

// ADMIN_EMAILS(쉼표 구분) + 기본 목록에 등록된 이메일인지
export function isAdminEmail(email?: string | null): boolean {
  const list = [
    ...BASE_ADMINS,
    ...(process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()),
  ]
    .map((s) => s.toLowerCase())
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
  // '오늘'은 한국시간(KST, UTC+9) 자정 기준 — 서버가 UTC여도 정확하게
  const KST = 9 * 60 * 60 * 1000;
  const kstMidnightUtcMs = Math.floor((Date.now() + KST) / 86400000) * 86400000 - KST;
  const todayIso = new Date(kstMidnightUtcMs).toISOString();

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
  const mrr = proUsers !== null ? proUsers * PLANS.pro.price : null;
  const conversion = usersTotal && usersTotal > 0 && proUsers !== null ? Math.round((proUsers / usersTotal) * 100) : null;

  // 최근 가입 (이메일은 auth에 있어 admin API로)
  let recentUsers: { email: string; created_at: string }[] = [];
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
    recentUsers = (data?.users ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((u: any) => ({ email: u.email ?? "(이메일 없음)", created_at: u.created_at ?? "" }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8);
  } catch {
    recentUsers = [];
  }

  // 최근 글
  const { data: ra } = await admin
    .from("articles")
    .select("title,status,created_at,locked")
    .order("created_at", { ascending: false })
    .limit(8);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentArticles = (ra ?? []).map((a: any) => ({
    title: a.title ?? "(제목 없음)",
    status: a.status ?? "draft",
    locked: !!a.locked,
    created_at: a.created_at ?? "",
  }));

  return { usersTotal, usersToday, proUsers, freeUsers, articlesTotal, articlesToday, publishedArticles, lockedArticles, wpConnections, mrr, conversion, recentUsers, recentArticles };
}
