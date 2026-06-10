import type { AdminStats } from "@/lib/adminStats";

const BRAND = "#3f91ff";
const STATUS_KO: Record<string, string> = { draft: "초안", published: "발행됨", future: "예약됨" };
const KIND_KO: Record<string, string> = {
  generate: "글 생성",
  tag_suggest: "태그 추천",
  keyword_ideas: "글감 추천",
  keyword_guard: "키워드 검사",
};

function won(n: number): string {
  if (n >= 1e8) return `₩${(n / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
  if (n >= 1e7) return `₩${Math.round(n / 1e4).toLocaleString("ko-KR")}만`;
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-6">
      <h3 className="text-sm font-semibold tracking-tight text-neutral-900">{title}</h3>
      {desc && <p className="mt-0.5 text-xs text-neutral-400">{desc}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, accent = false, hint }: { label: string; value: string; accent?: boolean; hint?: string }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${accent ? "border-[#3f91ff]/30 bg-[#3f91ff]/5" : "border-neutral-200 bg-white"}`}>
      <p className="truncate text-xs font-medium text-neutral-400">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-[28px]" style={accent ? { color: BRAND } : undefined}>{value}</p>
      {hint && <p className="mt-1 truncate text-[11px] text-neutral-400">{hint}</p>}
    </div>
  );
}

function MiniBars({ title, data, color, suffix = "" }: { title: string; data: { date: string; count: number }[]; color: string; suffix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-400">7일 합 {total.toLocaleString()}{suffix}</p>
      </div>
      <div className="mt-4 flex items-end gap-1 sm:gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-neutral-400">{d.count || ""}</span>
            <div className="flex h-20 w-full items-end sm:h-24">
              <div className="w-full rounded-t-md transition-all" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0, background: color }} />
            </div>
            <span className="text-[9px] text-neutral-400 sm:text-[10px]">{d.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function pct(part: number | null, whole: number | null): number {
  if (!whole || whole <= 0 || part === null) return 0;
  return Math.round((part / whole) * 100);
}

function Funnel({ stats }: { stats: AdminStats }) {
  const steps = [
    { key: "join", label: "가입", value: stats.usersTotal ?? 0, color: BRAND },
    { key: "write", label: "글 생성", value: stats.usersWithArticles ?? 0, color: "#5aa0ff" },
    { key: "wp", label: "워드프레스 연결", value: stats.wpConnections ?? 0, color: "#2fd07a" },
    { key: "pub", label: "발행", value: stats.usersWithPublished ?? 0, color: "#21b866" },
    { key: "pro", label: "프로 전환", value: stats.proUsers ?? 0, color: "#b06bff" },
  ];
  const base = steps[0].value || 1;
  // 가장 큰 이탈 구간 찾기 (개선 포인트)
  let worst = -1;
  let worstDrop = -1;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1].value;
    const drop = prev > 0 ? (prev - steps[i].value) / prev : 0;
    if (prev > 0 && drop > worstDrop) {
      worstDrop = drop;
      worst = i;
    }
  }
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="space-y-3">
        {steps.map((s, i) => {
          const widthPct = Math.max(2, Math.round((s.value / base) * 100));
          const fromPrev = i > 0 && steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : null;
          const isWorst = i === worst && worstDrop > 0;
          return (
            <div key={s.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-neutral-700">{s.label}</span>
                <span className="shrink-0 text-neutral-500">
                  {s.value.toLocaleString()}명
                  {fromPrev !== null && <span className={`ml-2 text-xs ${isWorst ? "font-semibold text-red-500" : "text-neutral-400"}`}>이전 대비 {fromPrev}%</span>}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, background: s.color }} />
              </div>
            </div>
          );
        })}
      </div>
      {worst > 0 && worstDrop > 0.05 && (
        <div className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-700">
          ⚠ 가장 큰 이탈: <b>{steps[worst - 1].label} → {steps[worst].label}</b> ({Math.round(worstDrop * 100)}% 이탈).
          이 구간을 개선하면 효과가 가장 커요.
        </div>
      )}
    </div>
  );
}

function CostBreakdown({ stats }: { stats: AdminStats }) {
  if (stats.costTotalKrw === null) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-sm text-neutral-500">
        아직 토큰 집계 전이에요. (usage_log 테이블 생성 후 글을 생성하면 실제 비용이 쌓여요)
      </div>
    );
  }
  const max = Math.max(1, ...stats.costByKind.map((k) => k.krw));
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1">
        <Stat label="누적 API 비용" value={won(stats.costTotalKrw)} accent />
        <Stat label="오늘 비용" value={won(stats.costTodayKrw ?? 0)} />
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 lg:col-span-2">
        <p className="text-sm font-medium text-neutral-900">종류별 비용</p>
        <div className="mt-3 space-y-2.5">
          {stats.costByKind.length === 0 ? (
            <p className="text-sm text-neutral-400">아직 없어요</p>
          ) : (
            stats.costByKind.map((k) => (
              <div key={k.kind}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600">{KIND_KO[k.kind] ?? k.kind}</span>
                  <span className="text-neutral-500">{won(k.krw)}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-xl bg-neutral-900" style={{ width: `${Math.max(3, (k.krw / max) * 100)}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ stats }: { stats?: AdminStats | null }) {
  if (!stats) return <p className="text-sm text-neutral-500">통계를 불러오지 못했어요.</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">관리자 대시보드</h2>
      <p className="mt-1 text-sm text-neutral-500">서비스 현황 한눈에 보기 · 오늘=한국시간 · 새로고침하면 최신</p>

      {/* 요약 */}
      <Section title="요약">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="예상 월매출(MRR)" value={stats.mrr === null ? "—" : won(stats.mrr)} accent hint={stats.proUsers !== null ? `프로 ${stats.proUsers}명` : undefined} />
          <Stat label="전체 회원" value={stats.usersTotal?.toLocaleString() ?? "—"} hint={stats.usersToday !== null ? `오늘 +${stats.usersToday}` : undefined} />
          <Stat label="전환율(무료→프로)" value={stats.conversion === null ? "—" : `${stats.conversion}%`} hint={stats.freeUsers !== null ? `무료 ${stats.freeUsers} · 프로 ${stats.proUsers}` : undefined} />
          <Stat label={stats.costTotalKrw !== null ? "API 누적 비용" : "추정 비용"} value={stats.costTotalKrw !== null ? won(stats.costTotalKrw) : stats.estCostKrw !== null ? won(stats.estCostKrw) : "—"} hint={stats.costTotalKrw !== null ? `오늘 ${won(stats.costTodayKrw ?? 0)}` : "토큰 집계 전 추정"} />
        </div>
      </Section>

      {/* 성장 추이 */}
      <Section title="성장 추이" desc="최근 7일 (한국시간 기준)">
        <div className="grid gap-3 lg:grid-cols-2">
          <MiniBars title="가입" data={stats.dailyUsers} color={BRAND} suffix="명" />
          <MiniBars title="글 생성" data={stats.dailyArticles} color="#2fd07a" suffix="편" />
        </div>
      </Section>

      {/* 퍼널 */}
      <Section title="사용자 퍼널 · 개선 포인트" desc="가입 → 글 생성 → 워드프레스 연결 → 발행 → 프로. 어디서 이탈하는지 보고 개선 우선순위를 정해요.">
        <Funnel stats={stats} />
      </Section>

      {/* 운영 지표 */}
      <Section title="운영 지표">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="오늘 생성" value={`${(stats.articlesToday ?? 0).toLocaleString()}편`} />
          <Stat label="사용자당 평균 글" value={stats.articlesPerUser === null ? "—" : `${stats.articlesPerUser}편`} />
          <Stat label="워드프레스 연결률" value={stats.wpConnectRate === null ? "—" : `${stats.wpConnectRate}%`} hint={stats.wpConnections !== null ? `${stats.wpConnections}곳` : undefined} />
          <Stat label="발행률" value={stats.publishRate === null ? "—" : `${stats.publishRate}%`} hint={stats.publishedArticles !== null ? `발행 ${stats.publishedArticles}/${stats.articlesTotal}` : undefined} />
        </div>
      </Section>

      {/* API 비용 */}
      <Section title="API 비용" desc="실제 토큰 기반 (Anthropic). 비용 구조를 파악해 가격·한도 정책에 반영해요.">
        <CostBreakdown stats={stats} />
      </Section>

      {/* 최근 활동 */}
      <Section title="최근 활동">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
            <p className="text-sm font-medium text-neutral-900">최근 가입</p>
            <ul className="mt-3 divide-y divide-neutral-100">
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
            </ul>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
            <p className="text-sm font-medium text-neutral-900">최근 글</p>
            <ul className="mt-3 divide-y divide-neutral-100">
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
            </ul>
          </div>
        </div>
      </Section>
    </div>
  );
}
