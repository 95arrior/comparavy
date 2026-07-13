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
  return db;
}

export function logPost(row: { productName: string; productUrl: string; mainKeyword: string; monthlySearches: number | null; blogTotal: number | null; articleType: string; gateResult: unknown; qualityResult: unknown; outDir: string }): void {
  getDb().prepare(
    `insert into posts (created_at, product_name, product_url, main_keyword, monthly_searches, blog_total, article_type, gate_result, quality_result, out_dir)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(new Date().toISOString(), row.productName, row.productUrl, row.mainKeyword, row.monthlySearches, row.blogTotal, row.articleType, JSON.stringify(row.gateResult), JSON.stringify(row.qualityResult), row.outDir);
}

/** 실적 수동 입력 훅(§10) — CSV 임포트는 이 함수를 행 단위로 호출. */
export function recordPerformance(postId: number, perf: { clicks?: number; orders?: number; commissionKrw?: number; note?: string }): void {
  getDb().prepare(`update posts set clicks = coalesce(?, clicks), orders = coalesce(?, orders), commission_krw = coalesce(?, commission_krw), performance_note = coalesce(?, performance_note) where id = ?`)
    .run(perf.clicks ?? null, perf.orders ?? null, perf.commissionKrw ?? null, perf.note ?? null, postId);
}
