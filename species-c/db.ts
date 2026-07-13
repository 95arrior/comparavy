// [species-c] §10 발행 로그 — node:sqlite 파일 DB(기존 Supabase 불가침). 필드명은 향후 성과 루프 호환(연동 코드는 없음).
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

let db: DatabaseSync | null = null;
export function getDb(): DatabaseSync {
  if (db) return db;
  db = new DatabaseSync(path.join(__dirname, "data.db"));
  db.exec(`
    create table if not exists posts (
      id integer primary key autoincrement,
      created_at text not null,
      product_name text not null,
      product_url text not null,
      main_keyword text not null,
      monthly_searches integer,          -- post_performance 호환 필드명
      blog_total integer,
      article_type text,
      gate_result text,                  -- JSON
      quality_result text,               -- JSON
      out_dir text,
      -- 쇼핑커넥트 실적(수동 입력·CSV 임포트용 자리 — 지금은 기록만)
      clicks integer,
      orders integer,
      commission_krw integer,
      performance_note text
    );
  `);
  db.exec(`
    create table if not exists keyword_candidates (
      id integer primary key autoincrement,
      created_at text not null,
      source text not null,               -- 'review' 등(바늘 광산 1b)
      product_name text,
      keyword text not null unique,
      monthly_searches integer,
      blog_total integer,
      tag text                            -- 'golden' | 'gold' | null
    );
  `);
  try { db.exec("alter table posts add column connect_link text"); } catch { /* 이미 있음 */ }
  return db;
}

/** 이전 글 상품(발급 링크 보유) — '함께 보면 좋은 제품' 크로스 링크용 */
export function recentLinkedProducts(excludeName: string, limit = 3): { product_name: string; connect_link: string }[] {
  const rows = getDb().prepare("select product_name, connect_link from posts where connect_link is not null and connect_link != '' and product_name != ? order by id desc").all(excludeName) as { product_name: string; connect_link: string }[];
  const seen = new Set<string>(); const out: { product_name: string; connect_link: string }[] = [];
  for (const r of rows) { if (!seen.has(r.product_name)) { seen.add(r.product_name); out.push(r); if (out.length >= limit) break; } }
  return out;
}

/** 지금까지 생성한 글 수 — 글 유형 로테이션 축 */
export function countPosts(): number {
  const r = getDb().prepare("select count(*) c from posts").get() as { c: number };
  return r?.c ?? 0;
}

/** 리뷰 유래 검색어 씨앗 적재(1b) — 다음 글감 후보. 중복 키워드는 무시. */
export function saveKeywordCandidates(rows: { source: string; productName: string; keyword: string; monthlySearches?: number | null; blogTotal?: number | null; tag?: string | null }[]): void {
  const st = getDb().prepare(`insert or ignore into keyword_candidates (created_at, source, product_name, keyword, monthly_searches, blog_total, tag) values (?, ?, ?, ?, ?, ?, ?)`);
  for (const r of rows) st.run(new Date().toISOString(), r.source, r.productName, r.keyword, r.monthlySearches ?? null, r.blogTotal ?? null, r.tag ?? null);
}

export function logPost(row: { productName: string; productUrl: string; mainKeyword: string; monthlySearches: number | null; blogTotal: number | null; articleType: string; gateResult: unknown; qualityResult: unknown; outDir: string; connectLink?: string | null }): void {
  getDb().prepare(
    `insert into posts (created_at, product_name, product_url, main_keyword, monthly_searches, blog_total, article_type, gate_result, quality_result, out_dir)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(new Date().toISOString(), row.productName, row.productUrl, row.mainKeyword, row.monthlySearches, row.blogTotal, row.articleType, JSON.stringify(row.gateResult), JSON.stringify(row.qualityResult), row.outDir);
  if (row.connectLink) { try { getDb().prepare("update posts set connect_link = ? where id = (select max(id) from posts)").run(row.connectLink); } catch { /* 무해 */ } }
}

/** 실적 수동 입력 훅(§10) — CSV 임포트는 이 함수를 행 단위로 호출. */
export function recordPerformance(postId: number, perf: { clicks?: number; orders?: number; commissionKrw?: number; note?: string }): void {
  getDb().prepare(`update posts set clicks = coalesce(?, clicks), orders = coalesce(?, orders), commission_krw = coalesce(?, commission_krw), performance_note = coalesce(?, performance_note) where id = ?`)
    .run(perf.clicks ?? null, perf.orders ?? null, perf.commissionKrw ?? null, perf.note ?? null, postId);
}
