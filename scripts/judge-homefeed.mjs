// ★홈판 배팅 판정 실행(2026-08-02) — 2주 판정 기한 도래. 이미 있는 판정기를 현재 데이터로 돌린다.
//  입력: checkins(일별 방문자) + post_performance(species='homefeed' 또는 seed_source='homebet') 발행일.
//  실행: node --env-file=.env.local --import tsx scripts/judge-homefeed.mjs
import { createClient } from "@supabase/supabase-js";
import { judgeHomefeed } from "../lib/homefeedVerdict.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.log("Supabase env 없음 — 중단"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const kst = (iso) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);

const { data: perf, error: pe } = await db
  .from("post_performance")
  .select("user_id, keyword, title, published_at, species, seed_source")
  .order("published_at", { ascending: true });
if (pe) { console.log("post_performance 조회 실패:", pe.message); process.exit(1); }

const { data: chk, error: ce } = await db
  .from("checkins")
  .select("user_id, day, visitors")
  .order("day", { ascending: true });
if (ce) { console.log("checkins 조회 실패:", ce.message); process.exit(1); }

console.log(`\n원장 전체: post_performance ${perf?.length ?? 0}행 · checkins ${chk?.length ?? 0}행`);

// 유저별로 판정(계정이 여럿일 수 있다)
const users = [...new Set([...(perf ?? []).map((p) => p.user_id), ...(chk ?? []).map((c) => c.user_id)])];
console.log(`유저 ${users.length}명\n`);

for (const uid of users) {
  const mine = (perf ?? []).filter((p) => p.user_id === uid && p.published_at);
  const days = (chk ?? [])
    .filter((c) => c.user_id === uid && Number.isFinite(c.visitors))
    .map((c) => ({ day: String(c.day).slice(0, 10), visitors: Number(c.visitors) }));

  const isHome = (p) => p.species === "homefeed" || p.seed_source === "homebet";
  const homefeedPublishDays = mine.filter(isHome).map((p) => kst(p.published_at));
  const otherPublishDays = mine.filter((p) => !isHome(p)).map((p) => kst(p.published_at));

  console.log("─".repeat(72));
  console.log(`유저 ${uid.slice(0, 8)}…`);
  console.log(`  발행 원장 ${mine.length}편 (홈판 ${homefeedPublishDays.length} · 그 외 ${otherPublishDays.length})`);
  console.log(`  체크인 ${days.length}일` + (days.length ? ` (${days[0].day} ~ ${days[days.length - 1].day})` : ""));

  // 종족 분포 — species가 비어 있으면 판정 자체가 무의미하므로 먼저 보여준다
  const bySpecies = {};
  for (const p of mine) { const k = `${p.species ?? "(없음)"} / ${p.seed_source ?? "(없음)"}`; bySpecies[k] = (bySpecies[k] ?? 0) + 1; }
  console.log("  종족·출처 분포:");
  for (const [k, v] of Object.entries(bySpecies).sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(3)}편  ${k}`);

  const v = judgeHomefeed({ days, homefeedPublishDays, otherPublishDays });
  console.log(`\n  ▶ 판정: ${v.verdict.toUpperCase()} — ${v.headline}`);
  console.log(`     관측 ${v.observedDays}일 · 홈판 ${v.homefeedPosts}편 · 급등 ${v.spikes.length}회` +
    (v.spikeAttribution === null ? "" : ` · 홈판 귀속 ${Math.round(v.spikeAttribution * 100)}%`));
  if (v.medianVisitors !== null) console.log(`     방문자 중앙값 ${v.medianVisitors} · 최고 ${v.bestDay?.visitors ?? "?"}(${v.bestDay?.day ?? "?"})`);
  for (const s of v.spikes) console.log(`     급등 ${s.day}: ${s.visitors}명 (기준선 ${s.baseline}) · 직전 3일 홈판 ${s.homefeedPostsNearby}편`);
  for (const n of v.notes) console.log(`     · ${n}`);
  console.log();
}
