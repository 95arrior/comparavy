// ★요일 의도 측정(2026-07-31) — 차단·변경 없이 '주말 축이 실제로 비어 있는지'만 잰다.
//  배경: 클릭 나온 글 5개(정기예금특판·cma계좌개설·irp이전·회사채금리·저평가우량주)가 전부 평일 행동형이었다.
//  가설: '검색자=손님' 원칙으로 행동 직전 키워드를 고르다 보니 요일 편중이 생겼다.
//  ★감으로 축을 만들지 않는다 — 재고가 이미 있는데 배정만 안 된 것이면 씨앗 손댈 필요가 없다.
//  실행: node --env-file=.env.local --import tsx scripts/measure-weekday-intent.mjs
import { createSupabaseAdminClient } from "../lib/supabase-server.ts";

// 평일형 = 영업일이 있어야 '실행'이 되는 말. 토요일 아침에 검색해도 오늘 할 수 있는 게 없다.
const WEEKDAY_RE = /신청|접수|개설|이전|발급|해지|가입|제출|방문|창구|영업일|마감|기한|특판|청약|예약|상담|등록|출금|입금|매수|매도|실시간|오늘|당일|모집|공고|선착순|지급일|납부/;
// 주말형 = 시간이 있을 때 '따져보고 정하는' 말. 요일과 무관하게 검색된다.
const WEEKEND_RE = /비교|vs|차이|어디가|어느\s*것|추천|순위|고르는|고르기|얼마|계산|시뮬|모의|뜻|이란|무엇|초보|처음|시작|기초|입문|정리|총정리|전략|노후|계획|준비물|장단점|후기|팁|방법|이유|왜/i;

function classify(kw) {
  const w = WEEKDAY_RE.test(kw);
  const e = WEEKEND_RE.test(kw);
  if (w && !e) return "평일";
  if (e && !w) return "주말";
  if (w && e) return "혼합";
  return "중립";
}

const pct = (n, total) => (total ? `${((n / total) * 100).toFixed(1)}%` : "-");

function tally(rows, label, keyOf) {
  const buckets = { 평일: [], 주말: [], 혼합: [], 중립: [] };
  for (const r of rows) buckets[classify(keyOf(r))].push(keyOf(r));
  const total = rows.length;
  console.log(`\n■ ${label} — ${total}건`);
  for (const k of ["평일", "주말", "혼합", "중립"]) {
    const b = buckets[k];
    console.log(`  ${k}  ${String(b.length).padStart(4)}건  ${pct(b.length, total).padStart(6)}   예) ${b.slice(0, 4).join(" / ") || "-"}`);
  }
  return buckets;
}

const db = createSupabaseAdminClient();

// ① WP 후보 재고 — pickWpTopic이 실제로 긁는 조건 그대로(수요 하한·경쟁 컷 포함)
const { data: pool, error: pErr } = await db.from("keyword_pool")
  .select("keyword, sub, monthly_searches, competition")
  .eq("vertical", "online").gte("monthly_searches", 300).neq("competition", "높음")
  .limit(2000);
if (pErr) console.log("pool 조회 실패:", pErr.message);
else tally(pool ?? [], "WP 후보 재고 (keyword_pool · online · 월300+ · 경쟁 높음 제외)", (r) => String(r.keyword));

// ② 실제 발행된 글 — 채널별로 무엇을 써왔는지(재고가 아니라 '결과')
const { data: arts, error: aErr } = await db.from("articles")
  .select("keyword, channel, status, created_at")
  .not("keyword", "is", null)
  .order("created_at", { ascending: false }).limit(2000);
if (aErr) console.log("articles 조회 실패:", aErr.message);
else {
  const rows = arts ?? [];
  for (const ch of ["naver", "wordpress"]) {
    const sub = rows.filter((r) => String(r.channel ?? "") === ch);
    if (sub.length) tally(sub, `발행글 — ${ch}`, (r) => String(r.keyword));
  }
  const other = rows.filter((r) => !["naver", "wordpress"].includes(String(r.channel ?? "")));
  if (other.length) tally(other, "발행글 — 채널 미지정", (r) => String(r.keyword));
}

// ③ 풀 전체(수요 하한 없이) — 하한이 주말형을 걸러내고 있는지 확인용
const { data: raw } = await db.from("keyword_pool").select("keyword").eq("vertical", "online").limit(4000);
if (raw?.length) tally(raw, "WP 풀 전체 (필터 없음 — 하한이 주말형을 깎는지 비교용)", (r) => String(r.keyword));

console.log("\n※ 분류는 어휘 휴리스틱이다. 비율의 방향을 보는 용도이고, 개별 배정 기준으로 쓰지 않는다.");
