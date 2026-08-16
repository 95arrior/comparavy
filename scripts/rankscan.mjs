// ★돼지통 순위 실측(2026-08-14 유저: "한 달 넘게 조회가 안 나와 — 뭘 놓치고 있나").
//  깔때기(발행→색인→순위→노출→클릭)의 어디가 막혔는지 잰 적이 없어서 만들었다.
//  네이버 블로그검색(blog.json)에서 우리 블로그의 순위를 찾는다 — 통검 스마트블록과 정확히 같진 않지만
//  '순위를 잡고 있긴 한가'를 가르는 데는 충분하다. 사용: node scripts/rankscan.mjs "키워드1" "키워드2" ...
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) ?? [])[1]?.trim();
const ID = get("NAVER_DATALAB_CLIENT_ID"), SECRET = get("NAVER_DATALAB_SECRET");
if (!ID || !SECRET) { console.error("키 없음"); process.exit(1); }

const BLOG = "rider95-";
const queries = process.argv.slice(2);
if (!queries.length) { console.error("사용: node scripts/rankscan.mjs \"키워드\" ..."); process.exit(1); }

for (const q of queries) {
  const res = await fetch(`https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(q)}&display=30&sort=sim`, {
    headers: { "X-Naver-Client-Id": ID, "X-Naver-Client-Secret": SECRET },
  });
  if (!res.ok) { console.log(`${q} | API ${res.status}`); continue; }
  const d = await res.json();
  const total = d.total ?? 0;
  const idx = (d.items ?? []).findIndex((i) => String(i.link ?? "").includes(BLOG));
  const mine = idx >= 0 ? `${idx + 1}위` : "30위 밖";
  const title = idx >= 0 ? String(d.items[idx].title ?? "").replace(/<[^>]+>/g, "").slice(0, 30) : "";
  console.log(`${mine.padEnd(6)} | 문서 ${String(total).padStart(7)} | ${q}${title ? ` → ${title}` : ""}`);
  await new Promise((r) => setTimeout(r, 150));
}
