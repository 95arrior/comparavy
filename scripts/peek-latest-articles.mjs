// 점검용 — 최근 생성 글의 상태·본문 이상 여부 확인(2026-08-14 유저: "글쓰기가 좀 이상하네 점검하자")
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const get = (k) => ((env.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, "m")) ?? [])[1] ?? "").trim().replace(/^["']|["']$/g, "");
const URL_ = get("NEXT_PUBLIC_SUPABASE_URL"), KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const res = await fetch(`${URL_}/rest/v1/articles?select=id,keyword,title,status,created_at,body_html&order=created_at.desc&limit=4`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
const rows = await res.json();
for (const a of rows) {
  const body = String(a.body_html ?? "");
  const text = body.replace(/<[^>]+>/g, " ");
  console.log("────────────────────────────");
  console.log(`[${String(a.created_at).slice(5, 16)}] ${a.status} | ${a.keyword}`);
  console.log(`제목: ${a.title}`);
  console.log(`본문: ${text.replace(/\s+/g, "").length}자, 표 ${(body.match(/<table/g) ?? []).length}, 리스트 ${(body.match(/<[uo]l/g) ?? []).length}`);
  // 이상 신호: 마커 유출·잘린 문장·괄호 잔재·URL 조각
  const leaks = [];
  for (const [re, label] of [
    [/\[(사진|브랜드|표|인물|마무리관련글|전편 링크 자리|상품 링크 자리)[^\]]*\]/g, "마커 유출"],
    [/\{[a-zA-Z_]+\}/g, "템플릿 변수 유출"],
    [/[a-z0-9-]+\.\s+(go|or|co|kr|com)\b/gi, "주소 띄어쓰기"],
    [/undefined|null,|NaN/g, "undefined류"],
  ]) {
    const m = text.match(re);
    if (m) leaks.push(`${label}: ${[...new Set(m)].slice(0, 3).join(" · ")}`);
  }
  console.log(leaks.length ? "⚠ " + leaks.join(" | ") : "유출 신호 없음");
  console.log("끝 3줄:", text.replace(/\s+/g, " ").trim().slice(-150));
}
