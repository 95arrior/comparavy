import type { AdminStats } from "@/lib/adminStats";

const BRAND = "#3f91ff";
const STATUS_KO: Record<string, string> = { draft: "초안", published: "발행됨", future: "예약됨" };

// 큰 금액은 만/억 단위로 압축해 카드 칸을 안 넘게
function formatKRWShort(won: number): string {
  if (won >= 1e8) return `₩${(won / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
  if (won >= 1e7) return `₩${Math.round(won / 1e4).toLocaleString("ko-KR")}만`;
  return `₩${won.toLocaleString("ko-KR")}`;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function Card({
  label,
  value,
  prefix = "",
  suffix = "",
  accent = false,
  display,
}: {
  label: string;
  value: number | null;
  prefix?: string;
  suffix?: string;
  accent?: boolean;
  display?: string;
}) {
  const text = display ?? (value === null ? "—" : `${prefix}${value.toLocaleString()}${suffix}`);
  return (
    <div className={`min-w-0 rounded-2xl border p-5 ${accent ? "border-[#3f91ff]/30 bg-[#3f91ff]/5" : "border-neutral-200 bg-white"}`}>
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <p className={`mt-1 truncate text-3xl font-semibold tracking-tight ${accent ? "" : "text-neutral-900"}`} style={accent ? { color: BRAND } : undefined}>
        {text}
      </p>
    </div>
  );
}

function ActivityList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      <ul className="mt-3 divide-y divide-neutral-100">{children}</ul>
    </div>
  );
}

export default function AdminDashboard({ stats }: { stats?: AdminStats | null }) {
  if (!stats) return <p className="text-sm text-neutral-500">통계를 불러오지 못했어요.</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">관리자 대시보드</h2>
      <p className="mt-1 text-sm text-neutral-500">오늘 = 한국시간 기준 · 새로고침하면 최신이에요.</p>

      {/* 핵심 지표 */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="전체 회원" value={stats.usersTotal} />
        <Card label="예상 월매출(MRR)" value={stats.mrr} display={stats.mrr === null ? "—" : formatKRWShort(stats.mrr)} accent />
        <Card label="오늘 가입" value={stats.usersToday} />
        <Card label="오늘 생성" value={stats.articlesToday} />
      </div>

      {/* 보조 지표 */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="무료" value={stats.freeUsers} />
        <Card label="프로" value={stats.proUsers} />
        <Card label="전환율(무료→프로)" value={stats.conversion} suffix="%" />
        <Card label="워드프레스 연결" value={stats.wpConnections} />
        <Card label="전체 글" value={stats.articlesTotal} />
        <Card label="발행됨" value={stats.publishedArticles} />
        <Card label="미리보기(잠금)" value={stats.lockedArticles} />
      </div>

      {/* 최근 활동 */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ActivityList title="최근 가입">
          {stats.recentUsers.length === 0 ? (
            <li className="py-2 text-sm text-neutral-400">아직 없어요</li>
          ) : (
            stats.recentUsers.map((u, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-neutral-700">{u.email}</span>
                <span className="shrink-0 text-xs text-neutral-400">{fmtDate(u.created_at)}</span>
              </li>
            ))
          )}
        </ActivityList>
        <ActivityList title="최근 글">
          {stats.recentArticles.length === 0 ? (
            <li className="py-2 text-sm text-neutral-400">아직 없어요</li>
          ) : (
            stats.recentArticles.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-neutral-700">{a.locked ? "🔒 " : ""}{a.title}</span>
                <span className="shrink-0 text-xs text-neutral-400">{a.locked ? "미리보기" : STATUS_KO[a.status] ?? a.status} · {fmtDate(a.created_at)}</span>
              </li>
            ))
          )}
        </ActivityList>
      </div>
    </div>
  );
}
