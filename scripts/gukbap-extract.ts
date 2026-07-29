// ★국밥 키워드 추출(Search Intent Research B파트) — keyword_pool 실데이터에서 경제 카테고리 상시 수요 키워드를 뽑는다.
//  국밥 정의: 생활에서 반복 검색되는 필수 쿼리. 시즌형(연말정산 등)은 별도 태그. 우리 게이트(finalGate) 통과분만.
import { createClient } from "@supabase/supabase-js";
import { finalGate } from "../lib/cardFinalGate";
import fs from "node:fs";

// .env.local 직접 파싱(--env-file이 유니코드 주석 라인에서 파싱 실패)
for (const line of fs.readFileSync("/Users/swooosy/Documents/Codex/ateflo/.env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const CATS: [string, RegExp][] = [
  ["세금", /(세금|연말정산|양도세|양도소득|종부세|종합부동산|증여|상속|부가세|소득세|절세|세액공제|소득공제|홈택스|현금영수증|원천징수|종합소득)/],
  ["연금", /(연금|IRP|퇴직금|퇴직연금|노령)/i],
  ["건강보험·의료", /(건강보험|건보|장기요양|건강검진|실비|실손|병원비|의료비)/],
  ["지원금·복지", /(지원금|수당|바우처|급여|장려금|보조금|복지|기초생활|차상위|바우처|돌봄|육아휴직|출산)/],
  ["부동산·주거", /(전세|월세|청약|등기|임차|매매|주택|아파트|부동산|중개|전입신고|확정일자|보증금|LTV|DSR|재산세|취득세)/i],
  ["대출·신용", /(대출|신용점수|신용등급|금리|한도|상환|연체|채무|햇살론|버팀목|디딤돌)/],
  ["예금·투자", /(예금|적금|파킹|CMA|ISA|ETF|배당|주식|펀드|채권|금리\s?비교|이자)/i],
  ["카드·페이", /(카드|페이|포인트|캐시백|할부|리볼빙)/],
  ["보험", /(보험료|자동차보험|운전자보험|암보험|종신|보험금)/],
  ["생활행정", /(등본|초본|민원|정부24|여권|운전면허|인감|공동인증|주민등록)/],
];
const SEASONAL = /(연말정산|종합소득|13월|설날|추석|명절)/;
const YEARY = /20\d{2}/;

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await db.from("keyword_pool")
    .select("keyword, monthly_searches, blog_total, competition, sub")
    .eq("vertical", "online").eq("sub", "경제·재테크")
    .gte("monthly_searches", 300)
    .order("monthly_searches", { ascending: false }).limit(4000);
  if (error) { console.error("쿼리 실패:", error.message); process.exit(1); }
  console.log(`풀 크기(경제·재테크, vol≥300): ${data?.length ?? 0}`);

  // 우리 게이트 통과분만(정의형·계산기·뉴스성·민감 등 자동 탈락)
  const gated = finalGate((data ?? []).map((r) => ({ keyword: String(r.keyword), title: String(r.keyword), row: r })));
  console.log(`finalGate 통과: ${gated.pass.length} / 탈락: ${gated.drops.length}`);
  const dropSummary = new Map<string, number>();
  for (const d of gated.drops) dropSummary.set(d.reason, (dropSummary.get(d.reason) ?? 0) + 1);
  console.log("탈락 사유:", JSON.stringify([...dropSummary.entries()]));

  type Row = { keyword: string; monthly_searches: number | null; blog_total: number | null; competition: string | null };
  const byCat = new Map<string, (Row & { seasonal: boolean })[]>();
  let uncat = 0;
  for (const g of gated.pass) {
    const r = (g as unknown as { row: Row }).row;
    const kw = String(r.keyword);
    if (YEARY.test(kw)) continue; // 연도 박힌 키워드는 국밥 아님(그해 소모품)
    const cat = CATS.find(([, re]) => re.test(kw));
    if (!cat) { uncat += 1; continue; }
    const arr = byCat.get(cat[0]) ?? [];
    arr.push({ ...r, seasonal: SEASONAL.test(kw) });
    byCat.set(cat[0], arr);
  }

  let md = `# 네이버 경제 국밥 키워드 (keyword_pool 실측 추출 — ${new Date().toISOString().slice(0, 10)})\n\n`;
  md += `기준: 경제·재테크 풀, 월 검색 300+, finalGate 통과, 연도 키워드 제외. vol=월 검색량(실측), 문서=블로그 문서수(경쟁).\n\n`;
  let total = 0;
  for (const [cat] of CATS) {
    const arr = (byCat.get(cat) ?? []).slice(0, 40);
    if (!arr.length) continue;
    total += arr.length;
    md += `## ${cat} (${arr.length})\n`;
    for (const r of arr) md += `- ${r.keyword} — vol ${r.monthly_searches?.toLocaleString()}${r.blog_total != null ? ` · 문서 ${r.blog_total.toLocaleString()}` : ""}${r.seasonal ? " · [시즌형]" : ""}\n`;
    md += "\n";
  }
  md += `\n총 ${total}개 (미분류 ${uncat}개 제외)\n`;
  const out = "/private/tmp/claude-501/-Users-swooosy/4d12d941-93d4-4772-8070-1d8a1f905fca/scratchpad/gukbap-keywords.md";
  fs.writeFileSync(out, md);
  console.log(`총 ${total}개 → ${out}`);
  for (const [cat] of CATS) {
    const arr = byCat.get(cat) ?? [];
    if (arr.length) console.log(`${cat}: ${arr.length}개 | 상위: ${arr.slice(0, 5).map((r) => r.keyword).join(", ")}`);
  }
}
void main();
