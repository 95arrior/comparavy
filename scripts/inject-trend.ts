// 일회성 — 특정 화제어를 trend_topics에 즉시 주입(밴드 우회 트렌드 레인). 유저 지시(2026-07-24).
// 대상 카테고리 = w.95arrior 활성 블로그의 sub_category. 실행: node --env-file=.env.local --import tsx scripts/inject-trend.ts
import { createSupabaseAdminClient } from "../lib/supabase-server";
import { finalGate } from "../lib/cardFinalGate";

const TARGET_EMAIL = "w.95arrior@gmail.com";

async function main() {
  const admin = createSupabaseAdminClient();

  // 1) 대상 유저 id
  const { data: list, error: uErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (uErr) { console.error("listUsers 실패:", uErr.message); process.exit(1); }
  const uid = list.users.find((u) => (u.email ?? "").toLowerCase() === TARGET_EMAIL)?.id;
  if (!uid) { console.error("유저 없음:", TARGET_EMAIL); process.exit(1); }

  // 2) 활성 블로그 프로필(카테고리)
  const { data: profiles } = await admin.from("blog_profiles")
    .select("id, vertical, sub_category, is_active").eq("user_id", uid);
  console.log("프로필:", JSON.stringify(profiles, null, 0));
  const active = (profiles ?? []).find((p) => p.is_active) ?? (profiles ?? [])[0];
  if (!active) { console.error("활성 프로필 없음"); process.exit(1); }
  const category = active.sub_category || active.vertical;
  console.log(`→ 대상 카테고리(trend_topics.category) = "${category}"`);

  // 3) 주입 후보 — 민생지원금만(삼성재단대출은 사칭 대출 하드컷: 유저 재확인 전 보류)
  const now = new Date();
  const expires = new Date(now.getTime() + 18 * 3600_000).toISOString(); // 18h 여유(다음 크론 갱신 전까지 생존)
  const candidates = [
    {
      keyword: "민생지원금 신청",
      title: "민생지원금 신청, 내가 대상인지부터 확인하세요",
      longtails: ["민생지원금 신청방법", "민생지원금 대상", "민생지원금 지급일", "민생지원금 신청기간"].map((kw) => ({ kw, blogTotal: null })),
    },
  ];

  // 4) finalGate 검문(스팸·사칭 등 방어) — 통과분만 주입
  const gated = finalGate(candidates.map((c) => ({ keyword: c.keyword, title: c.title })));
  if (gated.drops.length) console.log("게이트 탈락:", JSON.stringify(gated.drops));
  const passKw = new Set(gated.pass.map((p) => p.keyword));

  const rows = candidates.filter((c) => passKw.has(c.keyword)).map((c) => ({
    category, keyword: c.keyword, title: c.title,
    news_context: "[실시간 급상승] 지금 SNS에서 화제인 정부 민생지원금 — 검색자가 대상·금액·신청 시기를 바로 얻어가게 완결로 답한다.",
    longtails: c.longtails, source: "news",
    created_at: now.toISOString(), expires_at: expires,
  }));

  if (rows.length === 0) { console.log("주입할 행 없음(전부 게이트 탈락)"); return; }

  const { error } = await admin.from("trend_topics").upsert(rows, { onConflict: "category,keyword" });
  if (error) { console.error("upsert 실패:", error.message); process.exit(1); }
  console.log(`✅ trend_topics 주입 완료: ${rows.map((r) => r.keyword).join(", ")} (category=${category}, expires=${expires})`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
