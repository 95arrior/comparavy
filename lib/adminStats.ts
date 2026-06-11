import { createSupabaseAdminClient } from "./supabase-server";
import { PLANS } from "./plans";
import { costKrw, USD_TO_KRW } from "./usageLog";

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
  /** 사용자당 평균 글 수 */
  articlesPerUser: number | null;
  /** 워드프레스 연결률 % (연결/전체회원) */
  wpConnectRate: number | null;
  /** 발행률 % (발행/전체 글) */
  publishRate: number | null;
  /** 추정 누적 생성 비용(원) — 토큰 미집계분 대비 fallback */
  estCostKrw: number | null;
  /** 실제 토큰 기반 누적 비용(원) — usage_log 집계. null이면 집계 전 */
  costTotalKrw: number | null;
  /** 이번 달(KST) 실제 API 비용(원) */
  monthlyCostKrw: number | null;
  /** 월 예산(원) — Anthropic 월 지출 한도 기준(AI_MONTHLY_BUDGET_USD, 기본 $500) */
  budgetKrw: number;
  /** 글 1편 평균 실제 비용(원) — usage_log의 generate 평균, 없으면 추정치 */
  avgArticleCostKrw: number;
  /** 실제 토큰 기반 오늘 비용(원) */
  costTodayKrw: number | null;
  /** 종류별 비용 분해 (generate/tag_suggest/keyword_ideas …) */
  costByKind: { kind: string; krw: number }[];
  /** 퍼널: 글을 1편 이상 만든 사용자 수 */
  usersWithArticles: number | null;
  /** 퍼널: 1편 이상 발행한 사용자 수 */
  usersWithPublished: number | null;
  /** 최근 7일 일별 가입/글 (KST) */
  dailyUsers: { date: string; count: number }[];
  dailyArticles: { date: string; count: number }[];
  recentUsers: { email: string; created_at: string }[];
  recentArticles: { title: string; status: string; locked: boolean; created_at: string }[];
  /** 사전 등록(웨이트리스트) 총원 + 목록(최신순) */
  waitlistCount: number | null;
  waitlist: { email: string; created_at: string; source: string | null }[];
  /** SNS 자동 발행 — 설정 + 대기열 */
  social: {
    autoEnabled: boolean;
    intervalHours: number;
    postsPerDay: number;
    postingHour: number;
    lastPublishedAt: string | null;
    tokenExpiresAt: string | null;
    queueCount: number;
    publishedCount: number;
    failedCount: number;
    posts: { id: string; type: string; caption: string; status: string; mediaUrls: string[]; created_at: string; error: string | null }[];
  } | null;
  /** 클로드(생성) 헬스 — 크레딧 소진 등으로 글·카드 생성이 멈췄는지 */
  ai: { ok: boolean; lastError: string | null; updatedAt: string | null } | null;
};

// 글 1편당 추정 생성비(원). 토큰 미집계라 대략치 — 실제 집계 붙기 전 모니터링용.
const EST_COST_PER_ARTICLE_KRW = 120;

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
  const articlesPerUser =
    usersTotal && usersTotal > 0 && articlesTotal !== null ? Math.round((articlesTotal / usersTotal) * 10) / 10 : null;
  const wpConnectRate =
    usersTotal && usersTotal > 0 && wpConnections !== null ? Math.round((wpConnections / usersTotal) * 100) : null;
  const publishRate =
    articlesTotal && articlesTotal > 0 && publishedArticles !== null ? Math.round((publishedArticles / articlesTotal) * 100) : null;
  const estCostKrw = articlesTotal !== null ? articlesTotal * EST_COST_PER_ARTICLE_KRW : null;

  // 최근 7일 일별 가입/글 (KST 자정 경계)
  const dayMs = 86400000;
  const startMs = kstMidnightUtcMs - 6 * dayMs;
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const k = new Date(startMs + i * dayMs + KST);
    days.push(`${String(k.getUTCMonth() + 1).padStart(2, "0")}/${String(k.getUTCDate()).padStart(2, "0")}`);
  }
  const bucket = (rows: { created_at: string }[] | null) => {
    const counts = new Array(7).fill(0);
    for (const r of rows ?? []) {
      const idx = Math.floor((new Date(r.created_at).getTime() - startMs) / dayMs);
      if (idx >= 0 && idx < 7) counts[idx]++;
    }
    return days.map((date, i) => ({ date, count: counts[i] }));
  };
  const startIso = new Date(startMs).toISOString();
  const [uRows, aRows] = await Promise.all([
    admin.from("users").select("created_at").gte("created_at", startIso),
    admin.from("articles").select("created_at").gte("created_at", startIso),
  ]);
  const dailyUsers = bucket(uRows.data as { created_at: string }[] | null);
  const dailyArticles = bucket(aRows.data as { created_at: string }[] | null);

  // 이번 달(KST) 시작 시각 — 월 비용 집계용
  const kstNow = new Date(Date.now() + KST);
  const monthIso = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1) - KST).toISOString();
  const budgetKrw = Math.round((Number(process.env.AI_MONTHLY_BUDGET_USD) || 500) * USD_TO_KRW);

  // 실제 토큰 기반 비용 (usage_log). 테이블/로그 없으면 null → 추정치로 표시
  let costTotalKrw: number | null = null;
  let costTodayKrw: number | null = null;
  let monthlyCostKrw: number | null = null;
  let avgArticleCostKrw = EST_COST_PER_ARTICLE_KRW;
  let costByKind: { kind: string; krw: number }[] = [];
  try {
    const { data: usage, error } = await admin
      .from("usage_log")
      .select("model,kind,input_tokens,output_tokens,created_at")
      .limit(50000);
    if (!error && usage) {
      let total = 0;
      let today = 0;
      let month = 0;
      let genCost = 0;
      let genCount = 0;
      const kindMap: Record<string, number> = {};
      for (const u of usage as { model: string; kind: string; input_tokens: number; output_tokens: number; created_at: string }[]) {
        const c = costKrw(u.model, u.input_tokens || 0, u.output_tokens || 0);
        total += c;
        if (u.created_at >= todayIso) today += c;
        if (u.created_at >= monthIso) month += c;
        if (u.kind === "generate") { genCost += c; genCount++; }
        kindMap[u.kind] = (kindMap[u.kind] || 0) + c;
      }
      costTotalKrw = Math.round(total);
      costTodayKrw = Math.round(today);
      monthlyCostKrw = Math.round(month);
      if (genCount > 0) avgArticleCostKrw = Math.max(1, Math.round(genCost / genCount));
      costByKind = Object.entries(kindMap).map(([kind, krw]) => ({ kind, krw: Math.round(krw) })).sort((a, b) => b.krw - a.krw);
    }
  } catch {
    // usage_log 없음 → null 유지
  }

  // 퍼널: 글을 만든/발행한 '사용자 수'(distinct)
  let usersWithArticles: number | null = null;
  let usersWithPublished: number | null = null;
  try {
    const { data: au } = await admin.from("articles").select("user_id,status").limit(50000);
    if (au) {
      const all = new Set<string>();
      const pub = new Set<string>();
      for (const r of au as { user_id: string | null; status: string }[]) {
        if (!r.user_id) continue;
        all.add(r.user_id);
        if (r.status === "published") pub.add(r.user_id);
      }
      usersWithArticles = all.size;
      usersWithPublished = pub.size;
    }
  } catch {
    // 무시
  }

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

  // 사전 등록(웨이트리스트) — 총원 + 목록(최신순). 테이블 없으면 무시.
  let waitlistCount: number | null = null;
  let waitlist: { email: string; created_at: string; source: string | null }[] = [];
  try {
    waitlistCount = await count(admin, "waitlist");
    const { data: wl } = await admin
      .from("waitlist")
      .select("email,created_at,source")
      .order("created_at", { ascending: false })
      .limit(500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    waitlist = (wl ?? []).map((w: any) => ({ email: w.email ?? "", created_at: w.created_at ?? "", source: w.source ?? null }));
  } catch {
    waitlistCount = null;
    waitlist = [];
  }

  // SNS 자동 발행 — 설정 + 대기열 (테이블 없으면 null)
  let social: AdminStats["social"] = null;
  try {
    const { data: s } = await admin.from("social_settings").select("*").eq("id", 1).maybeSingle();
    const { data: posts } = await admin
      .from("social_posts")
      .select("id,type,caption,status,media_urls,created_at,error")
      .order("created_at", { ascending: false })
      .limit(60);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = (posts ?? []).map((p: any) => ({
      id: p.id, type: p.type, caption: p.caption ?? "", status: p.status,
      mediaUrls: Array.isArray(p.media_urls) ? p.media_urls : [], created_at: p.created_at ?? "", error: p.error ?? null,
    }));
    social = {
      autoEnabled: !!s?.auto_enabled,
      intervalHours: s?.interval_hours ?? 24,
      postsPerDay: s?.posts_per_day ?? 2,
      postingHour: s?.posting_hour ?? 9,
      lastPublishedAt: s?.last_published_at ?? null,
      tokenExpiresAt: s?.ig_token_expires_at ?? null,
      queueCount: list.filter((p) => p.status === "queued").length,
      publishedCount: list.filter((p) => p.status === "published").length,
      failedCount: list.filter((p) => p.status === "failed").length,
      posts: list,
    };
  } catch {
    social = null;
  }

  let ai: AdminStats["ai"] = null;
  try {
    const { data: h } = await admin.from("ai_health").select("ok,last_error,updated_at").eq("id", 1).maybeSingle();
    if (h) ai = { ok: !!h.ok, lastError: h.last_error ?? null, updatedAt: h.updated_at ?? null };
  } catch {
    ai = null;
  }

  return { usersTotal, usersToday, proUsers, freeUsers, articlesTotal, articlesToday, publishedArticles, lockedArticles, wpConnections, mrr, conversion, articlesPerUser, wpConnectRate, publishRate, estCostKrw, costTotalKrw, monthlyCostKrw, budgetKrw, avgArticleCostKrw, costTodayKrw, costByKind, usersWithArticles, usersWithPublished, dailyUsers, dailyArticles, recentUsers, recentArticles, waitlistCount, waitlist, social, ai };
}
