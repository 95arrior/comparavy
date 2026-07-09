import { titleSimilarity } from "@/lib/naverRss";
import { NextResponse, after } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { keywordsToTitles } from "@/lib/topicTitles";
import { normalizeKeyword } from "@/lib/diversity";
import { audienceOf, AUDIENCE_ALL } from "@/lib/audience";
import { isUnsafeKeyword, mentionsForeignRegion } from "@/lib/keywordSafety";
import { regionLevel, buildLocalSeeds, addressRegionTiers } from "@/lib/region";
import { bloggerType, type BloggerType } from "@/lib/bloggerTypes";
import { compFromLabel, compFromBlogTotal, filledStarsFromData, type Comp } from "@/lib/topicScore";
import { fetchBlogTotal } from "@/lib/naverBlogSearch";
import { resolveLocalPlan, generateLocalKeywords, generateAudienceTopics, type LocalScope } from "@/lib/aiSeeds";
import { buildPoolForSub } from "@/lib/keywordPool";
import { getTrendTopics, refreshCategoryTrends, hasFreshTrends } from "@/lib/trendTopics";
import { amplifyForUser } from "@/lib/amplifyTopics";
import { fetchKeywordStats, normalizeKey } from "@/lib/naverKeyword";
import { poolScore, isBigPool } from "@/lib/trafficPool";
import { collectPoolKeywords } from "@/lib/poolCollect";
import { fetchNaverAutocomplete } from "@/lib/naverAutocomplete";
import { checkRateLimit } from "@/lib/rateLimit";
import { BID_WEIGHT, BID_DEPTH_CAP, BID_COMP_BONUS, BID_BADGE_RATIO, BID_HIGH_MIN_DEPTH, ATTACK } from "@/lib/scoreWeights";
import { revenuePath } from "@/lib/revenue";
import { logUsage } from "@/lib/usageLog";
import { isAdminEmail } from "@/lib/adminStats";

// 사장의 blog_profile(vertical + sub_category)로 keyword_pool에서 글감 3개를 뽑는다.
// Stage 2-B 분산: ① least-used 우선(times_assigned asc) ② 본인이 이미 쓴 키워드 제외 ③ 그 안 랜덤.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 신규 카테고리 첫 요청은 lazy-fill(네이버 수집)이 요청 안에서 돌아 시간 필요

const PICK = 5; // 홈 5~6개 동적 노출(오늘 1 + 다른 글감 4~5)
const WINDOW = 150; // least-used 윈도우 크기 — 이 안에서 랜덤(반복 많으면 키우고, 마이너 자주 뜨면 줄임)

interface PoolRow { keyword: string; monthly_searches: number | null; competition: string | null; audience: string | null; blog_total: number | null; ad_depth?: number | null }

// 검색량 → 쉬운 말(숫자 노출 X). 유형별 톤: local=손님 / online=검색 / hobby=찾는 주제.
function demandLabel(searches: number | null, type: BloggerType): string {
  const n = searches ?? 0;
  if (type === "online") {
    if (n >= 3000) return "많이 검색되는 주제예요";
    if (n >= 800) return "꾸준히 검색돼요";
    return "지금 쓰기 좋아요";
  }
  if (type === "hobby") {
    if (n >= 3000) return "많이 찾는 주제예요";
    if (n >= 800) return "꾸준히 찾는 주제예요";
    return "지금 쓰기 좋아요";
  }
  if (n >= 3000) return "손님이 많이 찾아요";
  if (n >= 800) return "꾸준히 찾는 주제예요";
  return "지금 쓰기 좋아요";
}

// 하루 단위 고정 추천 — (userId+날짜) 시드로 그날은 새로고침해도 같은 3개.
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 고른 대상(specific)별로 골고루 번갈아 n개 뽑는다. 대상 마커 없는 '중립' 키워드는 모자랄 때 채움.
// 대상이 0~1개면(또는 비활성) 그냥 랜덤.
function pickBalanced(rows: PoolRow[], auds: string[], n: number, rnd: () => number = Math.random): PoolRow[] {
  const specific = auds.filter((a) => a !== AUDIENCE_ALL);
  if (specific.length <= 1) return shuffle(rows, rnd).slice(0, n);
  const buckets = new Map<string, PoolRow[]>(specific.map((a) => [a, []]));
  const neutral: PoolRow[] = [];
  for (const r of shuffle(rows, rnd)) {
    const a = r.audience ?? audienceOf(r.keyword);
    if (a && buckets.has(a)) buckets.get(a)!.push(r);
    else neutral.push(r);
  }
  const out: PoolRow[] = [];
  let progress = true;
  while (out.length < n && progress) {
    progress = false;
    for (const a of specific) {
      if (out.length >= n) break;
      const b = buckets.get(a)!;
      if (b.length) { out.push(b.shift()!); progress = true; }
    }
  }
  for (const r of neutral) { if (out.length >= n) break; out.push(r); } // 모자라면 중립으로 채움
  return out.slice(0, n);
}

// 소주제 군집 키 — 비슷한 글감(같은 소주제: 영문법변환기 류) 몰림 방지용.
// 띄어쓰기 무관하게 '앞 4글자(핵심 명사 prefix)'로 묶는다. 수식어 목록(공부법·추천 등) 의존하지 않아 견고.
function clusterKey(kw: string): string {
  const s = kw.replace(/\s+/g, "").replace(/[^가-힣a-z0-9]/gi, "");
  return s.slice(0, 4) || s;
}

// 소주제 골고루 — 클러스터별 라운드로빈으로 n개. 한 소주제에 몰리지 않게(후보 단계부터 분산).
function pickDiverse(rows: PoolRow[], n: number, rnd: () => number = Math.random): PoolRow[] {
  const byC = new Map<string, PoolRow[]>();
  for (const r of shuffle(rows, rnd)) {
    const k = clusterKey(r.keyword);
    const a = byC.get(k);
    if (a) a.push(r); else byC.set(k, [r]);
  }
  const cl = [...byC.values()];
  const out: PoolRow[] = [];
  while (out.length < n && cl.some((c) => c.length)) {
    for (const c of cl) { if (out.length >= n) break; const t = c.shift(); if (t) out.push(t); }
  }
  return out;
}

export async function GET(req: Request) {
  // 인증·프로필은 유저 클라이언트(RLS) — 본인 확인 + 본인 프로필만 읽음.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("id, vertical, sub_category, audience, biz_address, target, mix_weights")
    .eq("user_id", user.id).eq("is_active", true)
    .maybeSingle();

  // ★최상급 전용 계정 — 분산 무시, 절대 최상급(경쟁 낮음·검색량 상위)만.
  //  w.95arrior만 적용 → tjdghdlgh는 일반 유저와 동일 로직(비교 테스트용 대조군).
  const adminBest = (user.email ?? "").toLowerCase() === "w.95arrior@gmail.com";

  const vertical = profile?.vertical;
  const sub = profile?.sub_category;
  if (!vertical) return NextResponse.json({ topics: [] }); // 온보딩 전

  // 대상(audience) 필터 — 사장이 고른 대상만. 빈 배열이거나 '전체' 포함이면 필터 없음(현행 동작).
  const audSel: string[] = Array.isArray(profile?.audience) ? (profile!.audience as string[]) : [];
  const audActive = audSel.length > 0 && !audSel.includes(AUDIENCE_ALL);
  // 풀에 분류값(audience)이 있으면 그걸 쓰고, 없으면(stage 1) 키워드 텍스트 휴리스틱으로 판정.
  // 중립(어느 대상 마커도 없음)은 통과시킨다(과도 차단 방지). 선택한 대상에 속하지 않는 것만 제외.
  const audMatch = (kw: string, poolAud: string | null): boolean => {
    if (!audActive) return true;
    const a = poolAud ?? audienceOf(kw);
    return a === null || audSel.includes(a);
  };

  // 본인이 이미 쓴 키워드(정규화 집합) — 제외용. articles는 owner RLS라 유저 클라로 본인 것만.
  const { data: mine } = await supabase.from("articles").select("keyword, title").eq("user_id", user.id);
  const usedSet = new Set((mine ?? []).map((a) => normalizeKeyword(String(a.keyword ?? ""))).filter(Boolean));
  // ★유사 글감 게이트(실측: 쓴 '중소기업 지원금 총정리'와 거의 같은 증식 변형이 재등장) —
  //  정확 일치를 넘어, 쓴 글 제목·키워드와 bigram 유사하거나 핵심 토큰이 대부분 겹치면 제외.
  const usedTexts = (mine ?? []).flatMap((a) => [String(a.title ?? ""), String(a.keyword ?? "")]).filter((t) => t.length >= 4);
  const usedForbidden = (cand: string): boolean => {
    for (const u of usedTexts) {
      if (titleSimilarity(cand, u) >= 0.45) return true;
      const ct = new Set(cand.replace(/[^가-힣a-z0-9 ]/gi, " ").split(/\s+/).filter((w) => w.length >= 2));
      const ut = u.replace(/[^가-힣a-z0-9 ]/gi, " ").split(/\s+/).filter((w) => w.length >= 2);
      if (ut.length >= 2) { const hit = ut.filter((w) => ct.has(w)).length; if (hit >= 2 && hit / ut.length >= 0.6) return true; }
    }
    return false;
  };
  // 카드별 교체('이 글감 별로예요') — 지금 보이는 글감들을 제외하고 새로 뽑는다.
  const exclude = (new URL(req.url).searchParams.get("exclude") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const attack = new URL(req.url).searchParams.get("attack") === "1";
  // 한계 테스트 트랙(관리자 플래그 계정) — 공격 서빙을 로그로 기록해 안전선 재조정 근거 데이터로.
  if (attack) void logUsage({ userId: user.id, model: "mix", kind: isAdminEmail(user.email) ? "attack_serve_admin" : "attack_serve", inputTokens: 0, outputTokens: 0 }); // ★공격 모드(Part 3) — 배합 오버라이드. Stage 5: blog_profiles.attack_mode로 서버 판정 전환
  const tailMode = new URL(req.url).searchParams.get("mode"); // ★숏/롱테일 전용 요청(유저 제안: 탭=그 순간 그 종족만 왕창)
  const excludeSet = new Set(exclude.map((e) => normalizeKeyword(e))); // 교체로 제외한 것들 — 풀 전멸 시 되살릴 수 있게 분리 보관
  // ★X-ray(관리자 진단) — ?debug=1이면 각 단계 생존 수를 응답에 동봉(실측: 공급 0 원인 추적)
  const debugMode = new URL(req.url).searchParams.get("debug") === "1" && isAdminEmail(user.email);
  const diag: Record<string, unknown> = debugMode ? { vertical, sub, usedSet: usedSet.size, usedTexts: usedTexts.length, exclude: excludeSet.size } : {};
  for (const e of exclude) usedSet.add(normalizeKeyword(e));
  // 토픽 클러스터(주제 이어가기): 이 토큰이 든 키워드만 → 한 주제 깊이 파기. %_ 이스케이프.
  const cluster = (new URL(req.url).searchParams.get("cluster") ?? "").trim().replace(/[%_]/g, "").slice(0, 24);

  // ★낡은 연도 글감 차단 — '2024 ○○' 같은 키워드·제목은 그 자체로 구식 신호(신뢰 하락)
  const STALE_YEAR = /20(1[0-9]|2[0-5])/;
  const staleYear = (t: string) => STALE_YEAR.test(t);

  // keyword_pool은 공용 풀(RLS 정책 없음 = 서버 전용). 서비스롤로 읽는다(category_insights와 동일 패턴).
  // 유저별 비밀이 아닌 공용 데이터이고, 조회 조건은 위에서 본인 확인된 프로필 값(vertical/sub)뿐이라 안전.
  const pool = createSupabaseAdminClient();

  // ★트렌드 씨앗 × 개인화 증식 카드 — 키워드 풀과 독립. 조기 return에서도 트렌드가 나가게 함수로 분리.
  //  existing: 이미 담긴 글감 키워드(정규화) 집합(중복 방지). 온라인 vertical만 대상.
  interface TrendCard { keyword: string; title: string; demandLabel: string; expiresAt?: string | null; ssak: boolean; region: boolean; tone: BloggerType; vol: number; comp: Comp; blogTotal: number | null; tag: string; newsContext?: string; sourceTitle?: string; demandBadge?: string; publishedOn?: string; actionStart?: string | null; actionEnd?: string | null; titleSearch?: string; briefText?: string; hookKey?: string; thumb?: { mainCopy: string; subCopy: string; badge: string }; brief?: unknown; series?: unknown; seriesId?: string; seriesBadge?: string }
  async function buildTrendCards(existing: Set<string>): Promise<TrendCard[]> {
    const cards: TrendCard[] = [];
    if (!user) return cards;
    const bt = bloggerType(vertical);
    if (!(bt === "online" && sub && !cluster)) return cards;
    try {
      const kstDay = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
      let trends = await getTrendTopics(sub); // 캐시 키(씨앗 세대) 계산용 — 가벼운 조회라 캐시 앞으로 이동
      // ★유입력 우선(유저 핵심 진단: 뉴스에 나온 것 ≠ 검색하는 것) — 자동완성 실검색 흔적(longtails)이 많은 씨앗부터 증식.
      // ★최근 7일 발행 키워드(유저 확정: 같은 키워드 연속 발행=노출 잠식) — 감점+표시(제외 아님: 후속·시리즈 판단은 유저)
      const recentPub = new Set<string>();
      const pubDateByKw = new Map<string, string>(); // 정규화 키워드 → 발행 근사일(direct=확정 시각·rss=생성일)
      try {
        const { data: rp } = await pool.from("articles").select("keyword, verified_at, verified_via, created_at").eq("user_id", user.id)
          .in("status", ["verified", "published", "copied"]).gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()).limit(60); // copied 포함 — 복사(발행 진행) 후 주소 확정 전 몇 시간 동안 카드가 활성 잔존하던 실측
        for (const r of rp ?? []) {
          const k = String(r.keyword ?? "").replace(/\s+/g, "");
          if (!k) continue;
          recentPub.add(k);
          const basis = (r as { verified_via?: string | null }).verified_via === "direct" ? r.verified_at : ((r as { created_at?: string }).created_at ?? r.verified_at);
          if (basis && !pubDateByKw.has(k)) pubDateByKw.set(k, String(basis));
        }
      } catch { /* ignore */ }
      const isRecentDup = (kw: string) => { const n = kw.replace(/\s+/g, ""); return n.length > 0 && (recentPub.has(n) || [...recentPub].some((r) => r.length >= 4 && (n.includes(r) || r.includes(n)))); };

      // ★청약홈 공고 씨앗 — 증식(LLM) 우회 직접 카드화: 제목·날짜가 전부 API 실값이라 변형 금지(유저 신뢰 원칙)
      const announceSeeds = trends.filter((t) => (t as { actionEnd?: string | null }).actionEnd);
      trends = trends.filter((t) => !(t as { actionEnd?: string | null }).actionEnd);
      for (const a of announceSeeds.slice(0, 3)) {
        if (existing.has(a.keyword)) continue;
        const srcName = ({ applyhome: "청약홈 공고", gov24: "보조금24 실데이터", bizinfo: "기업마당 공고" } as Record<string, string>)[(a as { source?: string }).source ?? ""] ?? "공공 실데이터";
        cards.push({
          keyword: a.keyword, title: a.title, expiresAt: a.expiresAt ?? null,
          demandLabel: `${srcName} · 실공고 데이터`, ssak: true, region: false, tone: bt,
          vol: 0, comp: "low" as Comp, blogTotal: null, tag: "trend",
          newsContext: a.newsContext ?? undefined, sourceTitle: `${srcName}: ${a.title}`,
          actionStart: (a as { actionStart?: string | null }).actionStart ?? null,
          actionEnd: (a as { actionEnd?: string | null }).actionEnd ?? null,
        });
      }

      // ★돈+행동 스코어(유저 승인 — 무순위 청약 28.7만 실증 구조: 돈 걸림+반복 검색+행동 창): 신청·접수형 가점, 뉴스성(기소·실적) 감점
      const actionScore = (t: { title?: string; keyword?: string }) => {
        const txt = `${t.title ?? ""} ${t.keyword ?? ""}`;
        let sc = 0;
        if (/(신청|접수|마감|선착순|추첨|무순위|모집|공고|환급)/.test(txt)) sc += 2;
        if (/([0-9,.]+\s?(만\s?원|억|%)|지원금|보조금|장려금|바우처)/.test(txt)) sc += 1;
        if (/(기소|구속|재판|실적|영업이익|전망|주가|급락|급등|논란|의혹|사과)/.test(txt)) sc -= 2;
        if (/(최종 선정|선정 완료|수상|시상|성료|협약|아카데미|특강|강좌)/.test(txt)) sc -= 5; // 죽은 공고·초지역 행사 — 사실상 바닥
        if (isRecentDup(t.keyword ?? "")) sc -= 3; // 최근 발행 키워드 — 노출 잠식 방지
        sc += Math.round(poolScore(txt) / 2); // 잠재 풀 가점(0~4) — 전 국민 주제·인기지가 위로
        return sc;
      };
      trends = [...trends].sort((a, b) => ((b.longtails?.length ?? 0) * 2 + (b.newsContext ? 1 : 0) + actionScore(b)) - ((a.longtails?.length ?? 0) * 2 + (a.newsContext ? 1 : 0) + actionScore(a)));
      if (tailMode === "short") trends = trends.filter((t) => t.source !== "discover"); // 숏테일 탭 순도 — 꾸준 수요 혼입 제거(실측)
      if (debugMode) diag.trendSeeds = trends.length;
      const ampKey = `amp:v5:${user.id}:${(profile as { id?: string } | null)?.id ??"solo"}:${kstDay}:${excludeSet.size}:${trends.length}:${tailMode === "short" ? "s" : "n"}`; // short=전용 캐시(증식량 다름) // ★v5=씨앗 세대 포함 — 재수확 직후(0→15) 캐시 자동 무효화(실측: 수확해도 옛 세트 서빙) // ★v4=블로그별 격리 — 전환 시 이전 블로그 글감 서빙 사고(실측: 자동차 블로그에 캘리포니아비치) 차단
      let amped: { keyword: string; title: string; titleSearch?: string; newsContext: string | null; sourceTitle?: string | null; briefText?: string; hookKey?: string; thumb?: { mainCopy: string; subCopy: string; badge: string }; brief?: unknown; source?: string }[] = [];
      try {
        const { data: c } = await pool.from("api_cache").select("value, expires_at").eq("key", ampKey).single();
        if (c?.value && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now())) amped = c.value as typeof amped;
      } catch { /* 캐시 미스 */ }
      if (amped.length === 0) {
        if (trends.length < 4) {
          const rl = await checkRateLimit(supabase, user.id, `trend_seed_${sub}`, 3, 900);
          if (rl.ok) { const cat = sub; after(async () => { try { if (!(await hasFreshTrends(cat))) await refreshCategoryTrends(cat); } catch { /* ignore */ } }); }
        }
        if (trends.length > 0) {
          amped = await amplifyForUser(trends, profile ?? null, ((profile as { id?: string } | null)?.id ?? user.id), tailMode === "short" ? 15 : 5); // ★short 탭=증식 15(10명 타겟 — 절약보다 볼륨)(실측: 씨앗 19인데 카드 2 — 증식 상한 5가 병목)
          // ★유입력 2차(글감 레벨) — 증식 키워드를 자동완성 실조회로 확인. 캐시에 박제되므로 비용은 증식 1회당.
          //  정책: 확인=가점+배지, 미확인=중립(신어·급상승 초기가 걸러지면 안 됨). 씨앗 longtails 존재도 '주제 확인'으로 상속.
          if (amped.length > 0) {
            const seedVerified = new Set(trends.filter((t) => (t.longtails?.length ?? 0) > 0).map((t) => normalizeKeyword(t.keyword)));
            await Promise.race([ // ★속도 캡(실측: 새벽 첫 로드 지연) — 2.5초 안에 끝난 만큼만 반영, 나머지는 중립
              Promise.all(amped.map(async (a, i) => {
                await new Promise((r) => setTimeout(r, Math.min(i, 5) * 60));
                try {
                  const hits = await fetchNaverAutocomplete(a.keyword.split(" ").slice(0, 3).join(" "));
                  (a as { inflow?: string }).inflow = hits.length > 0 ? "hit" : seedVerified.size > 0 ? "seed" : "";
                } catch { (a as { inflow?: string }).inflow = ""; }
              })),
              new Promise((r) => setTimeout(r, 2500)),
            ]);
            amped = [...amped].sort((x, y) => ((y as { inflow?: string }).inflow === "hit" ? 1 : 0) - ((x as { inflow?: string }).inflow === "hit" ? 1 : 0)); // 확인분 앞으로(안정 정렬 — 유입력 씨앗순 유지)
          }
          if (amped.length > 0) {
            try { await pool.from("api_cache").upsert({ key: ampKey, value: amped, expires_at: new Date(Date.now() + 6 * 3600_000).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
          } else {
            // ★증식 실패 폴백 — 원본 씨앗이라도 유저 시드로 회전해 보여준다(홈 빈 화면 방지).
            amped = [...trends]
              .sort((a, b) => (seedFrom(a.keyword + user!.id) % 997) - (seedFrom(b.keyword + user!.id) % 997))
              .slice(0, 3)
              .map((t) => {
                // 실검증 롱테일(gap 낮은 것) 우선 — 뉴스 티 제거. 없으면 씨앗 keyword.
                const lt = (t.longtails ?? [])[0];
                return { keyword: lt?.kw ?? t.keyword, title: t.title, newsContext: t.newsContext, source: t.source };
              });
          }
        }
      }
      const seedExpiry = trends.map((t) => t.expiresAt).filter(Boolean).sort()[0] ?? null; // 가장 이른 만료 — 보수적 수명
      for (const t of amped) {
        if (cards.length >= (tailMode === "short" ? 15 : 5)) break; // short 탭=트렌드만 10개까지
        const nk = normalizeKeyword(t.keyword);
        if (usedSet.has(nk) || existing.has(nk)) continue;
        if (usedForbidden(`${t.title} ${t.keyword}`)) continue; // 쓴 글과 유사 — 재등장 차단
        const src = (t as { source?: string }).source;
        // ★momentum 배지 분리 — 뉴스/시즌='지금 뜨는 중', 자동완성 발굴='꾸준히 찾는 주제'(뜨는 척 금지)
        const demandLabel = src === "discover" ? "꾸준히 찾는 주제" : "지금 뜨는 중";
        cards.push({ keyword: t.keyword, title: t.title, expiresAt: seedExpiry, demandLabel: (t as { inflow?: string }).inflow === "hit" ? "실검색 확인 · 지금 뜨는 중" : demandLabel, ssak: true, region: false, tone: bt, vol: 0, comp: "low" as Comp, blogTotal: null, tag: src === "discover" ? "steady" : "trend", newsContext: t.newsContext ?? undefined, sourceTitle: (t as { sourceTitle?: string | null }).sourceTitle ?? undefined, titleSearch: (t as { titleSearch?: string }).titleSearch, briefText: (t as { briefText?: string }).briefText, hookKey: (t as { hookKey?: string }).hookKey, thumb: (t as { thumb?: { mainCopy: string; subCopy: string; badge: string } }).thumb, brief: (t as { brief?: unknown }).brief, series: (t as { series?: unknown }).series ?? null });
      }
        for (const c of cards) {
        const norm = c.keyword.replace(/\s+/g, "");
        let pubAt = pubDateByKw.get(norm);
        if (!pubAt) { // ★포함 관계 매칭(실측: 루원시티 — 생성 파이프가 키워드를 다듬어 완전일치 실패) — 6자+ 상호 포함이면 같은 글감
          for (const [k, v] of pubDateByKw) { if (k.length >= 6 && (norm.includes(k) || k.includes(norm))) { pubAt = v; break; } }
        }
        if (pubAt) { // ★발행함 상태(유저 확정: 청약 카드는 접수 마감까지 살아있어 발행 후에도 잔존 — 삭제 대신 상태 전환, 접수일 후속 글 재활용 여지)
          const d = new Date(pubAt);
          (c as { publishedOn?: string }).publishedOn = Number.isNaN(d.getTime()) ? "발행함" : `${d.getMonth() + 1}/${d.getDate()} 발행함`;
        } else if (isRecentDup(c.keyword)) c.demandBadge = "최근 7일 내 발행한 키워드 — 연속 발행은 서로 노출을 잠식해요";
      }
    } catch { /* 트렌드 없이 진행 */ }
    return cards;
  }

  // least-used 우선 윈도우(times_assigned asc → 균등 분산). 본인이 쓴 건 제외 후 남은 것만.
  // 적정범위 = 월 500~5,000 (경쟁 과열·초저검색 회피). sub 없거나 부족하면 단계적으로 넓힌다.
  async function fetchPool(useSub: boolean, ranged: boolean): Promise<PoolRow[]> {
    const COLS = "keyword, monthly_searches, competition, audience, blog_total";
    let q = pool.from("keyword_pool").select(`${COLS}, ad_depth`).eq("vertical", vertical);
    if (useSub && sub) q = q.eq("sub", sub);
    if (cluster) q = q.ilike("keyword", `%${cluster}%`); // 클러스터: 이 토큰 든 키워드만
    if (adminBest) {
      // 최상급 = '이길 수 있는 최상' — 메가 키워드(검색량 무제한)는 문서수도 메가라 제외. 적정 상한을 둔다.
      q = ranged ? q.gte("monthly_searches", 2000).lte("monthly_searches", 30000) : q.gte("monthly_searches", 1000);
    } else if (ranged) {
      q = q.gte("monthly_searches", 500).lte("monthly_searches", 5000);
    }
    let { data, error } = await q
      .order(adminBest ? "monthly_searches" : "times_assigned", { ascending: adminBest ? false : true })
      .order("monthly_searches", { ascending: false })
      .limit(WINDOW);
    if (error) { // ad_depth(0052) 미적용 방어 — 컬럼 빼고 재조회
      let q2 = pool.from("keyword_pool").select(COLS).eq("vertical", vertical);
      if (useSub && sub) q2 = q2.eq("sub", sub);
      if (cluster) q2 = q2.ilike("keyword", `%${cluster}%`);
      if (adminBest) q2 = ranged ? q2.gte("monthly_searches", 2000).lte("monthly_searches", 30000) : q2.gte("monthly_searches", 1000);
      else if (ranged) q2 = q2.gte("monthly_searches", 500).lte("monthly_searches", 5000);
      const fb = await q2.order(adminBest ? "monthly_searches" : "times_assigned", { ascending: adminBest ? false : true }).order("monthly_searches", { ascending: false }).limit(WINDOW);
      data = (fb.data ?? []) as unknown as typeof data;
    }
    const rows = (data ?? []) as PoolRow[];
    // 본인 작성분 제외 + 고른 대상(audience)만 통과
    const out = rows.filter((r) => !usedSet.has(normalizeKeyword(r.keyword)) && !usedForbidden(r.keyword) && !isUnsafeKeyword(r.keyword) && !staleYear(r.keyword) && audMatch(r.keyword, r.audience));
    if (debugMode) {
      const c = { raw: rows.length, used: 0, forbidden: 0, unsafe: 0, stale: 0, aud: 0 };
      for (const r of rows) {
        if (usedSet.has(normalizeKeyword(r.keyword))) { c.used++; continue; }
        if (usedForbidden(r.keyword)) { c.forbidden++; continue; }
        if (isUnsafeKeyword(r.keyword)) { c.unsafe++; continue; }
        if (staleYear(r.keyword)) { c.stale++; continue; }
        if (!audMatch(r.keyword, r.audience)) { c.aud++; continue; }
      }
      (diag.poolSteps as unknown[] ?? (diag.poolSteps = [])) && (diag.poolSteps as unknown[]).push({ useSub, ranged, ...c, survived: out.length });
    }
    return out;
  }

  // ★mode=short 조기 반환(실측: 504) — 트렌드만 원하는데 풀·게으른 수집·검색량 조회까지 돌면 60s 초과.
  if (tailMode === "short") {
    // ★신선도 보증(실측: 지식iN 고수는 1시간 전 급상승에 진입 — 우리는 카드가 차 있으면 묵은 수확을 계속 서빙) —
    //  마지막 수확이 2시간 넘었으면 응답과 무관하게 백그라운드 재수확(구글 트렌드 급상승·뉴스 최신분 흡수). 다음 탭에서 신선분.
    try {
      const { data: newest } = await pool.from("trend_topics").select("created_at").eq("category", sub).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const ageMs = newest?.created_at ? Date.now() - new Date(newest.created_at as string).getTime() : Infinity;
      if (ageMs > 2 * 3600_000) {
        const rl = await checkRateLimit(supabase, user.id, `trend_seed_${sub}`, 3, 900);
        if (rl.ok) after(async () => { try { await refreshCategoryTrends(sub); } catch { /* ignore */ } });
        if (debugMode) diag.freshKick = Math.round(ageMs / 60000);
      }
    } catch { /* ignore */ }
    if (debugMode) {
      try { const { data: fsRow } = await pool.from("api_cache").select("value").eq("key", `fresh_stats:${sub}`).maybeSingle(); if (fsRow?.value) diag.freshStats = fsRow.value; } catch { /* ignore */ }
    }
    let tc = await buildTrendCards(new Set());
    // ★수요 신호(유저 확정: 신선하지만 아무도 안 찾는 씨앗 문제) — 실측 검색량 부착. 폐기 아닌 표시(지자체 틈새=저수요·경쟁공백 가치는 유저 판단)
    if (tc.length > 0) {
      try {
        const volKey = `trendvol:${sub}:${tc.map((c) => c.keyword).join("|").slice(0, 180)}`;
        let volMap: Record<string, { vol: number; comp: string; base?: string }> | null = null;
        const { data: vc } = await pool.from("api_cache").select("value, expires_at").eq("key", volKey).maybeSingle();
        if (vc?.value && new Date(String(vc.expires_at)).getTime() > Date.now()) volMap = vc.value as Record<string, { vol: number; comp: string; base?: string }>;
        if (!volMap) {
          const stats = await fetchKeywordStats(tc.map((c) => c.keyword.split(" ").slice(0, 3).join(" ")), 3);
          volMap = {};
          for (const c of tc) {
            const exact = stats.get(normalizeKey(c.keyword));
            const head = c.keyword.split(" ").slice(0, 3).join(" ");
            const partial = exact ? null : stats.get(normalizeKey(head));
            const st = exact ?? partial;
            if (st) volMap[c.keyword] = { vol: st.mobile + st.pc, comp: st.compIdx, base: exact ? "" : head }; // base=부분 매치 시 조회 기준어(정확성: 전체 구 검색량이 아님을 명시)
          }
          try { await pool.from("api_cache").upsert({ key: volKey, value: volMap, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
        }
        // ★수요 기반 선별(유저 확정: 표시만 하던 검색량을 선별에 사용 — '수요 낮음'을 최상단에 올리는 자기모순 제거)
        tc = tc.filter((c) => {
          const v = volMap[c.keyword];
          const isAnnounce = Boolean((c as { actionEnd?: string | null }).actionEnd);
          if (isAnnounce && v && v.vol < 300) return false; // 청약·신청형: 실측 저수요(소단지 무순위 등) 컷 — 미조회는 유지
          return true;
        });
        // ★수요(실측) + 풀 스코어(잠재 독자 크기 — 유저 회의 확정: 동탄 줍줍 vs 지방 소단지) 결합 정렬
        tc = tc.map((c, i) => {
          const ctx = `${c.title} ${c.keyword} ${(c.newsContext ?? "").slice(0, 200)}`;
          const vol = volMap[c.keyword]?.vol ?? -1;
          const volBand = vol >= 5000 ? 4 : vol >= 1000 ? 3 : vol > 0 ? 1 : 0;
          const pool = poolScore(ctx);
          if (isBigPool(ctx)) (c as { demandBadge?: string }).demandBadge = `전국 관심 예상 · ${(c as { demandBadge?: string }).demandBadge ?? "잠재 수요 큰 글감"}`;
          return { c, i, score: volBand + pool };
        }).sort((a, b) => (b.score - a.score) || (a.i - b.i)).map((x) => x.c);
        // ★유형 믹스 쿼터(유저 회의: 공고형이 5칸 독식 방지) — 상위 5 중 공고형 최대 2, 초과분은 6위 밖으로(대형 풀 5점+는 예외)
        {
          const top: typeof tc = []; const rest: typeof tc = [];
          let ann = 0;
          for (const c of tc) {
            if ((c as { publishedOn?: string }).publishedOn) { rest.push(c); continue; } // 발행함은 쿼터 계산 제외(실측: 발행함이 5칸을 세어 공고 3장 노출)
            const isAnn = Boolean((c as { actionEnd?: string | null }).actionEnd);
            const big = isBigPool(`${c.title} ${c.keyword} ${(c.newsContext ?? "").slice(0, 200)}`);
            if (top.length < 5 && isAnn && !big && ann >= 2) { rest.push(c); continue; }
            if (top.length < 5) { top.push(c); if (isAnn) ann += 1; } else rest.push(c);
          }
          tc = [...top, ...rest];
        }
        for (const c of tc) {
          const v = volMap[c.keyword];
          if (v) {
            c.vol = v.vol;
            const scope = v.base ? `'${v.base}' 기준 ` : ""; // 부분 매치는 조회 기준어 명시 — 전체 키워드 검색량으로 오독 방지
            (c as { demandBadge?: string }).demandBadge = v.vol >= 1000 ? `${scope}월 ${v.vol.toLocaleString()}회 검색` : v.vol > 0 ? `${scope}월 ${v.vol.toLocaleString()}회 · 수요 낮음(경쟁 공백일 수 있음)` : `${scope}월 10회 미만 검색 · 수요 낮음`; // vol 0 = keywordstool '<10' 실측(미집계 아님)
          }
        }
      } catch { /* 수요 조회 실패는 카드를 막지 않는다 */ }
    }
    if (tc.length === 0) {
      // ★빈손 즉석 수확(실측: 20분 빈 보드 — 백그라운드 킥은 실패해도 아무도 모른다) — 응답 안에서 1회 동기 수확 후 재시도
      try {
        const rl2 = await checkRateLimit(supabase, user.id, `trend_sync_${sub}`, 2, 900);
        if (rl2.ok) {
          await refreshCategoryTrends(sub);
          tc = await buildTrendCards(new Set());
          if (debugMode) diag.syncHarvest = tc.length;
        }
      } catch { /* 폴백 실패 — 빈 응답 그대로 */ }
    }
    return NextResponse.json(debugMode ? { topics: tc, diag: { ...diag, mode: "short", trendCards: tc.length } } : { topics: tc });
  }

  // 단계적 폴백: (sub+적정범위) → (sub+전체). ★vertical 전체 폴백 제거(실측: 자동차 블로그에 '파쇄기' —
  //  타 주제 키워드가 오늘의 글로 서는 관련성 붕괴). sub 풀이 비면 아래 '게으른 채우기'가 그 주제로 즉석 수집,
  //  그동안은 트렌드(카테고리 즉석 수확)와 수집중 UI가 받친다 — 무관 글감보다 잠깐의 빈자리가 낫다.
  const steps: [boolean, boolean][] = sub
    ? [[true, true], [true, false]]
    : [[false, true], [false, false]];
  let rows: PoolRow[] = [];
  for (const [useSub, ranged] of steps) {
    rows = await fetchPool(useSub, ranged);
    if (rows.length >= PICK) break;
  }

  // ── 게으른 풀 채우기 ──
  // '표시 가능한 글감(고경쟁 제외)' 기준으로 건강도 판정 → 개수만 많고 브랜드·고경쟁뿐인 옛 풀도 재빌드.
  // HEALTHY = 표시3 + 교체 여유. 부족하면 AI 시드(완벽함)로 보강. 남용 방지 레이트리밋(20/10분).
  const HEALTHY = 15;
  const isRegionReq = new URL(req.url).searchParams.get("region") === "1";
  if (sub && !isRegionReq) { // 지역 강화 요청은 region 수집을 쓰므로 일반 풀 빌드 건너뜀(느린 빌드 방지)
    const subRows = await fetchPool(true, false); // 이 sub 전체(범위 무관)
    const goodCount = subRows.filter((r) => (r.competition ?? "").trim() !== "높음").length;
    if (goodCount < HEALTHY) {
      const seedRl = await checkRateLimit(supabase, user.id, "pool_seed", 20, 600);
      if (seedRl.ok) {
        try {
          await buildPoolForSub(vertical, sub, { sleepMs: 300 });
        } catch {
          /* 수집 실패해도 빈 결과로 진행 */
        }
        for (const [useSub, ranged] of steps) {
          rows = await fetchPool(useSub, ranged);
          if (rows.length >= PICK) break;
        }
      }
    }
  }

  // ★교체 반복으로 표시 가능 글감이 바닥나면 — 빈 화면 대신 제외 목록을 풀고 재조회(이미 본 글감 재등장 허용)
  if (rows.length < PICK && excludeSet.size > 0) {
    for (const nk of excludeSet) usedSet.delete(nk);
    for (const [useSub, ranged] of steps) {
      rows = await fetchPool(useSub, ranged);
      if (rows.length >= PICK) break;
    }
  }
  if (rows.length === 0) { const tc = await buildTrendCards(new Set()); return NextResponse.json(debugMode ? { topics: tc, diag: { ...diag, note: "pool 0 — trend only", trendCards: tc.length } } : { topics: tc }); }

  // ── 경쟁도 티어 ──
  // 낮음 = 싹 키워드(전설·희귀), 중간 = 일반(기본), 높음 = 빅키워드(최후)
  const comp = (r: PoolRow) => (r.competition ?? "").trim();
  // ★단가 축(Part B) — '단가 높음'은 카테고리 '상대 상위 30% 랭크'(절대값이면 금융 독식, percentile은 동률 포화 시 전원/0명 — 실측으로 랭크 확정).
  //  단가점수 = ad_depth(광고 밀도 프록시, 천장 10) + 광고경쟁 보정. 동률은 검색량 큰 순. 바닥 depth 5 미만은 제외.
  const bidScoreOf = (r: PoolRow) => (r.ad_depth ?? 0) + (BID_COMP_BONUS[(r.competition ?? "").trim()] ?? 0);
  const bidRanked = rows.filter((r) => (r.ad_depth ?? 0) >= BID_HIGH_MIN_DEPTH)
    .sort((a, b) => bidScoreOf(b) - bidScoreOf(a) || (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0));
  const badgeN = bidRanked.length >= 4 ? Math.max(1, Math.round(bidRanked.length * BID_BADGE_RATIO)) : 0;
  const bidHighSet = new Set(bidRanked.slice(0, badgeN).map((r) => r.keyword));
  const bidHigh = (r: PoolRow) => bidHighSet.has(r.keyword);
  // 서빙 랭크 소프트 부스트 — 랜덤(0~1) + BID_WEIGHT×정규화 단가. 다양성(셔플)은 유지하되 단가 높은 글감이 자주 앞에.
  //  가중치 상수는 lib/scoreWeights — '공격 모드'가 나중에 이 상수를 오버라이드한다.
  const bidW = attack ? ATTACK.BID_WEIGHT : BID_WEIGHT; // ★공격 모드 = 상수 오버라이드(scoreWeights.ATTACK)
  const mixW = ((profile as { mix_weights?: Record<string, number> } | null)?.mix_weights) ?? {}; // 증폭 가중 학습(상한·하한은 저장 시 강제)
  const bidBoostSort = (items: PoolRow[]): PoolRow[] =>
    items.map((r) => {
      const isRev = revenuePath({ keyword: r.keyword }) === "shopping";
      const revBoost = (attack ? ATTACK.REVIEW_BOOST : 0) + (isRev ? ((mixW.review ?? 1) - 1) * 0.3 : ((mixW.info ?? 1) - 1) * 0.3);
      return { r, s: rng() + bidW * (Math.min(r.ad_depth ?? 0, BID_DEPTH_CAP) / BID_DEPTH_CAP) + (isRev ? revBoost : 0) };
    }).sort((a, b) => b.s - a.s).map((x) => x.r);
  const low = rows.filter((r) => comp(r) === "낮음");
  const mid = rows.filter((r) => comp(r) === "중간");
  const high = rows.filter((r) => comp(r) === "높음");

  // ── 지역 글감(먼저 — 일반 후보 개수 계산에 필요) ──
  // 지역형 사업장이면 동네+업종 글감을 앞에. 본인이 쓴 건 제외.
  const level = regionLevel(vertical, sub ?? null); // 하드코딩 폴백(AI 실패 시)
  const type = bloggerType(vertical); // local/online/hobby → 카피 톤
  const addr = profile?.biz_address as string | null;
  // ── 업소별 지역 범위 AI 판정 — 업종/세부/위치로 손님 이동반경 계산(성형=전국, 소아=시, 치과=동네 …) ──
  // AI 실패 시 regionLevel 폴백(wide→nation, gu→si, dong→dong).
  let scope: LocalScope = level === "wide" ? "nation" : level === "gu" ? "si" : "dong";
  let aiAreas: string[] = [];
  let aiTraits: string[] = [];
  if (type === "local" && addr && !cluster) {
    const aud = audActive ? audSel.filter((a) => a !== AUDIENCE_ALL).join("·") : undefined;
    const plan = await resolveLocalPlan(addr, sub || vertical, aud);
    if (plan) { scope = plan.scope; aiAreas = plan.areas; aiTraits = plan.traits; }
  }
  // scope → 지역 계층 순서. dong=읍/동 우선, si·nation=시 우선. AI 별칭(오송)을 맨 앞 보강.
  let regions: string[];
  if (scope === "dong") {
    regions = [...new Set([...aiAreas, ...addressRegionTiers(addr, "dong")])];
  } else {
    const t = addressRegionTiers(addr, "gu"); // [구, 시]
    const si = t[t.length - 1]; const gu = t[0];
    // AI가 scope에 맞게(si·nation=도시 먼저) 순서를 내므로 aiAreas를 앞에. 파싱 폴백은 시→구.
    regions = [...new Set([...aiAreas, si, gu].filter((x): x is string => !!x))];
  }
  const local = type === "local" && regions.length > 0 && !cluster;
  // 지역 강화 모드 — 지역형(bloggerType=local)이면 ON(법률·세무 포함). scope가 범위를 결정.
  // 주소가 비면 region 분기에서 빈 결과 → 클라가 '업체 등록/못 찾음' 안내(일반 글감 폴백 X).
  const regionMode = new URL(req.url).searchParams.get("region") === "1" && type === "local" && !cluster;

  // 하루 고정 시드(userId+날짜): 그날은 새로고침해도 같은 추천.
  const rng = mulberry32(seedFrom(`${user.id}-${new Date().toISOString().slice(0, 10)}`));
  const want = PICK + 8; // ok·적합도 필터 후에도 PICK개 채우게 넉넉히
  let candidates: PoolRow[] = [];

  if (regionMode) {
    // ── 지역 강화: 지역 키워드 '실데이터'(네이버 검색량/경쟁) 수집 — '오송 영어학원' 등 ──
    const audSeed = audActive ? audSel.filter((a) => a !== AUDIENCE_ALL) : [];
    const baseSeeds = buildLocalSeeds(regions, vertical, sub ?? null, audSeed).slice(0, 6);
    // 지역 특성(산단·신도시 등) 시드 — '오송 산업단지', '오송 바이오' 식. 무관하면 뒤 ok 필터가 거름.
    const area0 = aiAreas[0] ?? regions[0];
    const traitSeeds = area0 ? aiTraits.slice(0, 2).map((tr) => `${area0} ${tr}`) : [];
    // 네이버 자동완성 — 우리 동네 사람들이 실제 치는 검색어를 시드로(진짜 동네 키워드). 시드 넉넉히 → 필터 후에도 3개 채움
    const acSeeds = baseSeeds.length
      ? [...new Set((await Promise.all(baseSeeds.slice(0, 2).map((s) => fetchNaverAutocomplete(s)))).flat())].slice(0, 4)
      : [];
    const seeds = [...new Set([...baseSeeds, ...traitSeeds, ...acSeeds])];
    const collected = new Map<string, PoolRow>();
    for (const seed of seeds) {
      try {
        const kws = await collectPoolKeywords(seed);
        for (const k of kws) {
          if (collected.has(k.keyword) || usedSet.has(normalizeKeyword(k.keyword)) || isUnsafeKeyword(k.keyword)) continue;
          if (mentionsForeignRegion(k.keyword, regions)) continue; // ★타지역(천안 등) 제거 — 우리 지역/일반 분야만
          collected.set(k.keyword, { keyword: k.keyword, monthly_searches: Number(k.monthlySearches) || 0, competition: k.compIdx ?? null, audience: null, blog_total: null });
        }
      } catch { /* 수집 실패 시드는 건너뜀 */ }
    }
    // ★검색량에 의존하지 않는 '생성' 지역 글감 — 작은 동네 키워드는 네이버 볼륨이 0이라 위 수집엔 안 잡히지만,
    //   동네 손님은 꾸준히 검색(고의도·무경쟁). 지역×업종×대상×특성으로 만들어 항상 채운다(네이버 데이터는 보강용).
    const aud = audActive ? audSel.filter((a) => a !== AUDIENCE_ALL).join("·") : undefined;
    const gen = await generateLocalKeywords(regions, sub || vertical, aud, aiTraits);
    const norms = new Set([...collected.keys()].map((k) => normalizeKeyword(k)));
    for (const kw of gen) {
      const nk = normalizeKeyword(kw);
      if (norms.has(nk) || usedSet.has(nk) || isUnsafeKeyword(kw) || mentionsForeignRegion(kw, regions)) continue;
      norms.add(nk);
      collected.set(kw, { keyword: kw, monthly_searches: 0, competition: null, audience: null, blog_total: null }); // 볼륨 미측정(생성)
    }
    // ★지역 전용: '지역명이 들어간 진짜 지역 키워드'만(일반 분야 padding 안 함). 진행적 확장(오송→흥덕→청주) 순.
    // 같은 tier 안에선 측정 검색량 있는 것 먼저(실수요 증명) → 생성(볼륨0)이 뒤를 채움.
    const regionIdx = (kw: string) => regions.findIndex((r) => kw.includes(r));
    candidates = [...collected.values()]
      .filter((c) => regionIdx(c.keyword) >= 0) // 지역명 포함만
      .sort((a, b) => regionIdx(a.keyword) - regionIdx(b.keyword) || (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0))
      .slice(0, want);
  } else {
    // ── 일반 후보(풀 기반) ── 노이즈·중복 제외로 빠질 것 대비해 여유분(want)까지.
    // 지역형(주소 있음)이면 '타지역' 키워드(대구 화상영어 등)는 일반 글감에서도 제거 — 우리 지역/일반 분야만.
    const noForeign = (arr: PoolRow[]) => (regions.length ? arr.filter((r) => !mentionsForeignRegion(r.keyword, regions)) : arr);
    // ★최상급 계정(w.95arrior): 랜덤 배제 — 경쟁 '낮음' 전부 먼저(검색량순), 모자라면 '중간'(검색량순)
    if (adminBest) {
      // ★'이길 수 있는' 우선 — 캐시된 진짜 경쟁(blog_total)이 있으면 그 별점을 최우선, 검색량은 그다음.
      //  검색량 탐욕 정렬은 포화 키워드만 모아 winnable 필터에서 전멸했음(경쟁높음 범람의 원인).
      const score = (r: PoolRow) =>
        (r.blog_total != null ? filledStarsFromData(r.monthly_searches ?? 0, r.blog_total) : 3) * 1_000_000 + (r.monthly_searches ?? 0);
      const ordered = [...noForeign(low), ...noForeign(mid)].sort((a, b) => score(b) - score(a));
      const adminWant = want * 3 + 6; // 후보 폭 확대 — 실측 후에도 winnable이 넉넉히 남게
      for (const r of ordered) {
        if (candidates.length >= adminWant) break;
        const nk = normalizeKeyword(r.keyword);
        if (!candidates.some((x) => normalizeKeyword(x.keyword) === nk)) candidates.push(r);
      }
    } else {
    // 오디언스 밸런스(넉넉히) → 소주제 분산. 둘 다 만족해 비슷한 글감 몰림 방지.
    const balanced = pickBalanced(bidBoostSort(noForeign(mid)), audActive ? audSel : [], (want + 1) * 2, rng); // ★단가 소프트 부스트(BID_WEIGHT)
    const general = pickDiverse(balanced, want + 1, rng);
    const lowF = noForeign(low), highF = noForeign(high);
    if (lowF.length > 0 && rng() < 0.28) candidates.push(lowF[Math.floor(rng() * lowF.length)]); // 싹 1개 가끔
    const add = (arr: PoolRow[]) => {
      for (const r of arr) {
        if (candidates.length >= want) break;
        const nk = normalizeKeyword(r.keyword);
        if (!candidates.some((x) => normalizeKeyword(x.keyword) === nk)) candidates.push(r); // 정규화 중복 제거
      }
    };
    add(general); add(lowF); if (attack && ATTACK.ALLOW_COMP_HIGH) add(bidBoostSort(highF)); else add(highF); // ★공격: 경쟁 높음도 정식 후보(이길 수 있는 싸움)
    }

    // ★자영업자: 검색량 풀이 오염(여행영어 등)·얕아 온타겟이 부족할 수 있다 → '손님(대상)이 검색하는' 글감을 생성해 합류.
    //   생성분은 검색자=손님 매칭이 보장돼, 뒤의 ok/fit 게이트를 통과하며 빈자리를 채운다(볼륨0=고의도·무경쟁).
    if (type === "local") {
      const audStr = audActive ? audSel.filter((a) => a !== AUDIENCE_ALL).join("·") : undefined;
      const genTopics = await generateAudienceTopics(sub || vertical, audStr);
      const norms = new Set(candidates.map((c) => normalizeKeyword(c.keyword)));
      for (const kw of genTopics) {
        const nk = normalizeKeyword(kw);
        if (norms.has(nk) || usedSet.has(nk) || isUnsafeKeyword(kw)) continue;
        if (regions.length && mentionsForeignRegion(kw, regions)) continue;
        norms.add(nk);
        candidates.push({ keyword: kw, monthly_searches: 0, competition: null, audience: null, blog_total: null });
      }
    }
  }

  // ── 제목·카테고리·노이즈판별(여유분 한 번에) ──
  const allKeywords = candidates.map((r) => r.keyword);
  if (allKeywords.length === 0) { const tc = await buildTrendCards(new Set()); return NextResponse.json(debugMode ? { topics: tc, diag: { ...diag, note: "allKeywords 0", trendCards: tc.length } } : { topics: tc }); }
  // 통합 맥락(분야·대상·사용자 지역) → AI가 브랜드·타지역·대상불일치·무관 키워드까지 한 번에 거름
  const ctxParts = [`분야: ${sub || vertical}`];
  if (audActive) ctxParts.push(`대상: ${audSel.filter((a) => a !== AUDIENCE_ALL).join("·")}`);
  if (local && regions.length) ctxParts.push(`사용자 지역: ${regions.join("·")}`);
  if (regionMode && aiTraits.length) ctxParts.push(`동네 특성: ${aiTraits.join("·")}`);
  const titled = await keywordsToTitles(allKeywords, ctxParts.join(" / "), { localBiz: type === "local" }); // {title, tag, ok, fit} — 자영업자는 '검색자=손님' 매칭 게이트 강하게

  // fit 상위 후보를 넉넉히(PICK+6) 추림 — 대표 샘플이면 포화 키워드가 많이 보여서, 같은 fit 안에서 '이길 수 있는' 걸 고른다.
  const fitTop = candidates
    .map((r, i) => ({ r, t: titled[i] }))
    .filter(({ t }) => t?.ok !== false && !staleYear(t?.title ?? ""))
    .sort((a, b) => (b.t?.fit ?? 1) - (a.t?.fit ?? 1))
    .slice(0, adminBest ? PICK + 14 : PICK + 6);

  // ── 진짜 콘텐츠 경쟁(blog_total) 채우기 (fitTop 전체) ──
  // 미수집(null)이면 네이버 블로그검색 1회 → 풀에 캐싱(전 유저 공용). 첫 1회만 호출, 이후 캐시.
  await Promise.all(
    fitTop.map(async ({ r }) => {
      if (r.blog_total != null) return;
      const total = await fetchBlogTotal(r.keyword);
      if (total == null) return;
      r.blog_total = total;
      try { await pool.from("keyword_pool").update({ blog_total: total }).eq("keyword", r.keyword); } catch { /* 캐싱 실패해도 진행 */ }
    }),
  );

  // ★핵심 축 유지 — 네이버 공식 '주제 전문성·일관성': 초반엔 한 우물이 전문 출처 인식에 유리.
  // 유저가 이미 쓴 글 키워드의 토큰(불용어 제외)을 축으로 삼아, 같은 축 후보에 가산점(별 반 개 수준 — 선점을 뒤집진 않음).
  const AXIS_STOP = new Set(["추천", "방법", "후기", "비교", "정리", "순위", "가격", "종류", "하는법", "이유", "총정리"]);
  const axisTokens = new Set<string>();
  if ((mine ?? []).length >= 2) {
    for (const a of mine ?? []) {
      for (const tok of String(a.keyword ?? "").split(/\s+/)) {
        if (tok.length >= 2 && !AXIS_STOP.has(tok)) axisTokens.add(tok);
      }
    }
  }
  const axisBoost = (kw: string): number => {
    if (axisTokens.size === 0) return 0;
    for (const tok of axisTokens) if (kw.includes(tok)) return 5;
    return 0;
  };

  // '이길 수 있는(선점 높은)' 순으로 PICK개 — 선점 우선, 축 가산, fit 미세 가산. blog_total 없으면 중간(3) 취급.
  // 후보 집합은 매일 시드로 달라지므로(변동성) 그날의 후보 중 가장 winnable한 걸 보여준다.
  const winScore = ({ r, t }: { r: PoolRow; t?: { fit?: number } }) =>
    (r.blog_total != null ? filledStarsFromData(r.monthly_searches ?? 0, r.blog_total) : 3) * 10 + axisBoost(r.keyword) + (t?.fit ?? 1);
  // ★진짜 경쟁(문서수) '높음'은 원칙적으로 안 보여준다 — 유저가 어차피 거른다. 낮음·중간 소진 시에만 폴백.
  const realCompOf = (r: PoolRow): Comp => (r.blog_total != null ? compFromBlogTotal(r.blog_total) : compFromLabel(r.competition));
  // 제목 중복 제거 + 소주제 클러스터 라운드로빈 — 비슷한 글감(영문법변환기 3개) 몰림 방지, 골고루 다양하게.
  type FitItem = (typeof fitTop)[number];
  const winnable = fitTop.filter((x) => realCompOf(x.r) !== "high");
  const saturated = fitTop.filter((x) => realCompOf(x.r) === "high");
  const sortedFit: FitItem[] = [
    ...winnable.sort((a, b) => winScore(b) - winScore(a)),
    ...saturated.sort((a, b) => winScore(b) - winScore(a)),
  ];
  const byCluster = new Map<string, FitItem[]>();
  const seenTitle = new Set<string>();
  for (const item of sortedFit) {
    const tkey = normalizeKeyword(item.t?.title ?? item.r.keyword);
    if (seenTitle.has(tkey)) continue; // 같은/비슷한 제목 제거
    seenTitle.add(tkey);
    const ck = clusterKey(item.r.keyword);
    const arr = byCluster.get(ck);
    if (arr) arr.push(item); else byCluster.set(ck, [item]);
  }
  const clusters = [...byCluster.values()]; // 각 클러스터는 winScore 내림차순
  const pickN = tailMode === "long" ? 10 : PICK; // long 탭=풀 10개(유저: 왕창)
  const generalRows: FitItem[] = [];
  while (generalRows.length < pickN && clusters.some((c) => c.length)) {
    for (const c of clusters) { // 클러스터별로 하나씩 → 소주제 골고루
      if (generalRows.length >= pickN) break;
      const top = c.shift();
      if (top) generalRows.push(top);
    }
  }
  // ★무조건 PICK개 채우기 — 필터(연도·경쟁·클러스터 중복)로 모자라면 남은 후보에서 보충.
  //  카드가 2개, 1개로 줄어드는 화면은 신뢰를 깎는다(빈자리 금지).
  if (generalRows.length < PICK) {
    const usedKw = new Set(generalRows.map((g) => normalizeKeyword(g.r.keyword)));
    for (const item of sortedFit) {
      if (generalRows.length >= PICK) break;
      const nk = normalizeKeyword(item.r.keyword);
      if (!usedKw.has(nk)) { usedKw.add(nk); generalRows.push(item); }
    }
  }

  // comp는 blog_total(진짜 콘텐츠 경쟁) 있으면 그걸로, 없으면 광고경쟁 폴백. region 모드면 '우리 동네' 칩.
  const topics = generalRows.map(({ r, t }) => {
    const realComp: Comp = r.blog_total != null ? compFromBlogTotal(r.blog_total) : compFromLabel(r.competition);
    return {
      keyword: r.keyword,
      title: t?.title ?? r.keyword,
      demandLabel: demandLabel(r.monthly_searches, type),
      ssak: realComp === "low",
      region: regionMode,
      tone: type,
      vol: r.monthly_searches ?? 0,
      comp: realComp,
      blogTotal: r.blog_total ?? null,
      bidHigh: bidHigh(r), // ★단가 높음(카테고리 상대) — 배지용
      tag: t?.tag || sub || "글감", // 칩 항상 표시 — AI 분류 없으면 세부업종으로 폴백
    };
  });
  // ★실시간 트렌드 글감 — 카테고리 공유 풀(크론이 뉴스+웹검색으로 채움)에서 유저별 시드 회전으로 뽑는다.
  //  '그날 그시간' 신선함이 홈판 노출의 핵심. 1만 명이 같은 풀을 봐도 시드 회전으로 다른 조각을 봄.
  const trendCards = await buildTrendCards(new Set(topics.map((x) => normalizeKeyword(x.keyword))));

  // 트렌드(신선) 먼저, 데이터 글감은 섞어서 뒤에. 지역 카드는 섞임.
  // ★수익 증폭 카드(최우선 후보) — ①활성 시리즈 다음 화 ②hot(반응 좋아요) 단발의 후속.
  //  '더 뜨거운 이슈 인터럽트'는 클라 랭크(pickNextTopic)가 판단할 수 있게 tag로 구분만 한다. 실패=조용히 생략.
  const boostCards: typeof trendCards = [];
  try {
    const activeBlogId = (profile as { id?: string } | null)?.id ?? null;
    let srQ = supabase.from("user_series").select("id, title, keyword, arc, total, next_ep, blog_id").eq("user_id", user.id).eq("status", "active");
    if (activeBlogId) srQ = srQ.or(`blog_id.eq.${activeBlogId},blog_id.is.null`);
    const { data: sr } = await srQ.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (sr && sr.next_ep <= sr.total) {
      const ep = (sr.arc as { role: string; angle: string }[])[sr.next_ep - 1];
      boostCards.push({ keyword: sr.keyword, title: ep?.angle ?? `${sr.title} ${sr.next_ep}화`, demandLabel: "시리즈 이어쓰기", ssak: true, region: false, tone: "online", vol: 0, comp: "low" as Comp, blogTotal: null, tag: "series", newsContext: undefined, titleSearch: undefined, briefText: undefined, hookKey: undefined, thumb: undefined, brief: undefined, seriesId: sr.id, seriesBadge: `시리즈 ${sr.next_ep}/${sr.total}` } as (typeof trendCards)[number] & { seriesId: string; seriesBadge: string });
    } else {
      const twoDays = new Date(Date.now() - 48 * 3600_000).toISOString();
      let hotQ = supabase.from("articles").select("keyword, title").eq("user_id", user.id).is("series_id", null).gte("hot_at", twoDays);
      if (activeBlogId) hotQ = hotQ.or(`blog_id.eq.${activeBlogId},blog_id.is.null`);
      const { data: hot } = await hotQ.order("hot_at", { ascending: false }).limit(1).maybeSingle();
      if (hot) {
        boostCards.push({ keyword: hot.keyword, title: `${hot.keyword}, 한 걸음 더 들어가기`, demandLabel: "어제 반응 좋았던 글의 후속", ssak: true, region: false, tone: "online", vol: 0, comp: "low" as Comp, blogTotal: null, tag: "followup", newsContext: undefined, titleSearch: undefined, briefText: (/마감|신청|모집|접수|\d+차/.test(`${hot.keyword} ${hot.title}`)
          ? `[후속 지시 — 회차 환생 패턴(실측: 1차 마감 후 '2차' 검색 폭발)] 전작 "${hot.title}"이 반응이 좋았고, 마감·신청형 주제다. 후속은 '다음 회차·추가 모집·지급일·발표일·못 받은 경우' 같은 마감 이후 검색 의도에 정확히 답한다(전작 요약 재탕 금지). 도입 직후 [전편 링크 자리] 마커 1회.`
          : `[후속 지시] 전작 "${hot.title}"이 반응이 좋았다. 같은 검색 의도의 심화·확장편을 쓴다(중복 서술 금지 — 전작이 못 다룬 다음 질문에 답한다). 도입 직후 [전편 링크 자리] 마커 1회.`), hookKey: undefined, thumb: undefined, brief: undefined } as (typeof trendCards)[number]);
      }
    }
  } catch { /* 0054 미적용 등 — 조용히 생략 */ }

  // ★파생 급상승 레이더(실측: 청년미래적금 본편 발행 다음날 '가구원 동의'가 진짜 폭발 지점 — 이벤트는 연작이다)
  //  최근 48h 발행 키워드의 자동완성을 지금 다시 긁어, 마찰·절차 파생어가 새로 떠 있으면 최우선 후속 카드로.
  try {
    if (boostCards.length < 2) {
      const twoDays2 = new Date(Date.now() - 48 * 3600_000).toISOString();
      const activeBlogId2 = (profile as { id?: string } | null)?.id ?? null;
      let pubQ = supabase.from("articles").select("keyword, title").eq("user_id", user.id).in("status", ["copied", "pending_verify", "verified", "published"]).gte("created_at", twoDays2);
      if (activeBlogId2) pubQ = pubQ.or(`blog_id.eq.${activeBlogId2},blog_id.is.null`);
      const { data: pubs } = await pubQ.order("created_at", { ascending: false }).limit(2);
      const FRICTION = /(동의|서류|심사|자격|거부|탈락|거절|방법|기간|발표|지급|해지|변경|취소|조건|한도|후기|수령)/;
      const acResults = await Promise.race([
        Promise.all((pubs ?? []).map(async (pb) => ({ pb, acs: await fetchNaverAutocomplete(String(pb.keyword ?? "").trim()).catch(() => [] as string[]) }))),
        new Promise<{ pb: { keyword: string | null; title: string | null }; acs: string[] }[]>((r) => setTimeout(() => r([]), 2000)),
      ]); // ★병렬+2초 캡(실측: 새벽 로딩 지연)
      for (const { pb, acs } of acResults) {
        const base = String(pb.keyword ?? "").trim();
        if (!base) continue;
        const root = base.split(" ")[0] ?? base;
        const derived = acs.filter((a) => a !== base && a.startsWith(root) && FRICTION.test(a.replace(base, "")) && !usedSet.has(normalizeKeyword(a)) && !excludeSet.has(normalizeKeyword(a)));
        const pick = derived[0];
        if (pick) {
          boostCards.unshift({ keyword: pick, title: `${pick}, 지금 다들 이게 궁금해요`, demandLabel: "내 글에서 파생된 실검색 급상승", ssak: true, region: false, tone: "online" as BloggerType, vol: 0, comp: "low" as Comp, blogTotal: null, tag: "followup", newsContext: undefined, titleSearch: undefined, briefText: `[파생 급상승 지시] 전작 "${pb.title}"(키워드: ${base})을 본 뒤 사람들이 지금 실제로 검색하는 파생 질문이 "${pick}"이다(네이버 자동완성 실측). 이 파생 질문 하나에만 완결로 답하라 — 특히 불안(개인정보·불이익·거절 사유)이 깔린 질문이면 첫 두 문장에서 그 불안부터 해소한다. 전작 요약 재탕 금지, 도입 직후 [전편 링크 자리] 마커 1회.`, hookKey: undefined, thumb: undefined, brief: undefined } as (typeof trendCards)[number]);
          break; // 하루 1개 — 과속 금지
        }
      }
    }
  } catch { /* 조용히 생략 */ }

  const shuffled = shuffle(topics, rng);
  if (tailMode === "long") return NextResponse.json(debugMode ? { topics: shuffled, diag: { ...diag, mode: "long", poolCards: shuffled.length } } : { topics: shuffled });
  return NextResponse.json(debugMode ? { topics: [...boostCards, ...trendCards, ...shuffled], diag: { ...diag, boost: boostCards.length, trendCards: trendCards.length, poolCards: shuffled.length } } : { topics: [...boostCards, ...trendCards, ...shuffled] });
}
