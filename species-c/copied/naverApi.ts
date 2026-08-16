// copied from lib/naverKeyword.ts(서명·키워드도구) + lib/naverBlogSearch.ts(블로그 검색) — 독립 유지, 원본과 동기화하지 않음.
// [species-c] 네이버 검색광고 API(검색량 실측) + 검색 API(blog_total 실측).
import crypto from "node:crypto";
import { loadEnv } from "../env";

const AD_BASE = "https://api.searchad.naver.com";
const AD_PATH = "/keywordstool";

function parseCount(v: number | string | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  if (v.includes("<")) return 0;
  const digits = v.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function sign(timestamp: string, method: string, path: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(`${timestamp}.${method}.${path}`).digest("base64");
}

function adHeaders(method: string, path: string): Record<string, string> {
  const timestamp = Date.now().toString();
  return {
    "X-Timestamp": timestamp,
    "X-API-KEY": process.env.NAVER_AD_ACCESS_LICENSE ?? "",
    "X-Customer": process.env.NAVER_AD_CUSTOMER_ID ?? "",
    "X-Signature": sign(timestamp, method, path, process.env.NAVER_AD_SECRET_KEY ?? ""),
  };
}

/** 키워드 배치(최대 5개/호출)의 월 검색량(모바일+PC 합) 실측. 실패한 키워드는 null. */
export async function fetchVolumes(keywords: string[]): Promise<Map<string, number | null>> {
  loadEnv();
  const out = new Map<string, number | null>();
  for (const kw of keywords) out.set(kw, null);
  if (!process.env.NAVER_AD_ACCESS_LICENSE) throw new Error("NAVER_AD_* 키 미설정");
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    const hints = batch.map((k) => k.replace(/\s+/g, "")).join(",");
    try {
      const res = await fetch(`${AD_BASE}${AD_PATH}?hintKeywords=${encodeURIComponent(hints)}&showDetail=1`, { headers: adHeaders("GET", AD_PATH) });
      if (!res.ok) { await res.text(); continue; }
      const json = (await res.json()) as { keywordList?: { relKeyword: string; monthlyPcQcCnt: number | string; monthlyMobileQcCnt: number | string }[] };
      const byKey = new Map((json.keywordList ?? []).map((k) => [norm(k.relKeyword), k]));
      for (const kw of batch) {
        const hit = byKey.get(norm(kw));
        if (hit) out.set(kw, parseCount(hit.monthlyMobileQcCnt) + parseCount(hit.monthlyPcQcCnt));
      }
      await new Promise((r) => setTimeout(r, 300)); // 호출 간 매너 간격
    } catch { /* 배치 실패 = 해당 키워드 null 유지(fail-closed) */ }
  }
  return out;
}

/** 블로그탭 문서 수(blog_total) 실측. 실패 시 null. */
export async function fetchBlogTotal(keyword: string): Promise<number | null> {
  loadEnv();
  const id = process.env.NAVER_DATALAB_CLIENT_ID, sec = process.env.NAVER_DATALAB_SECRET;
  if (!id || !sec) throw new Error("NAVER_DATALAB_CLIENT_ID/SECRET 미설정");
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=1`, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": sec },
    });
    if (!res.ok) { await res.text(); return null; }
    const json = (await res.json()) as { total?: number };
    return typeof json.total === "number" ? json.total : null;
  } catch { return null; }
}

/** 쇼핑 검색 API(공식)로 상품 대표이미지 매칭 — 상품명 토큰 겹침 상위 1건. 실패 시 null(수동 업로드 폴백). */
export async function fetchShopImage(productName: string): Promise<Buffer | null> {
  loadEnv();
  const id = process.env.NAVER_DATALAB_CLIENT_ID, sec = process.env.NAVER_DATALAB_SECRET;
  if (!id || !sec) return null;
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(productName)}&display=5&sort=sim`, { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": sec } });
    if (!res.ok) { await res.text(); return null; }
    const json = (await res.json()) as { items?: { title: string; image: string }[] };
    const toks = productName.split(/\s+/).filter((t) => t.length >= 2);
    const hit = (json.items ?? []).find((i) => { const t = i.title.replace(/<[^>]+>/g, ""); return toks.filter((k) => t.includes(k)).length >= Math.min(2, toks.length); });
    if (!hit?.image) return null;
    const imgRes = await fetch(hit.image, { signal: AbortSignal.timeout(8000) });
    if (!imgRes.ok) return null;
    return Buffer.from(await imgRes.arrayBuffer());
  } catch { return null; }
}

// copied from lib/naverAutocomplete.ts — 독립 유지, 원본과 동기화하지 않음.
/** 네이버 자동완성(비공식·graceful) — 실패 시 빈 배열. */
export async function fetchAutocomplete(query: string): Promise<string[]> {
  const q = (query || "").trim();
  if (q.length < 2) return [];
  try {
    const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://search.naver.com/" } });
    if (!res.ok) return [];
    const j = (await res.json()) as { items?: unknown[][] };
    const items = j?.items?.[0];
    if (!Array.isArray(items)) return [];
    const out: string[] = [];
    for (const row of items) {
      const t = Array.isArray(row) ? String(row[0] ?? "").trim() : "";
      if (t && t !== q && !out.includes(t)) out.push(t);
    }
    return out.slice(0, 10);
  } catch { return []; }
}

/** 자동완성 재귀 확장(깊이 2·중복 제거) — 시드당 1차 제안 → 상위 제안 재확장. */
export async function expandAutocomplete(seeds: string[], perSeedCap = 8): Promise<string[]> {
  const seen = new Set<string>(seeds.map((s) => s.replace(/\s+/g, "")));
  const out: string[] = [];
  for (const seed of seeds) {
    const d1 = await fetchAutocomplete(seed);
    const picked1 = d1.slice(0, perSeedCap);
    for (const k of picked1) {
      const nk = k.replace(/\s+/g, "");
      if (!seen.has(nk)) { seen.add(nk); out.push(k); }
    }
    for (const k of picked1.slice(0, 3)) { // 깊이 2 — 상위 3개만 재확장(폭주 방지)
      const d2 = await fetchAutocomplete(k);
      for (const k2 of d2.slice(0, 5)) {
        const nk2 = k2.replace(/\s+/g, "");
        if (!seen.has(nk2)) { seen.add(nk2); out.push(k2); }
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}
