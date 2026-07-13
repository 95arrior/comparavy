// [species-c] §2 상품 인테이크 — 공식 경로(공개 og 메타태그) 우선, 실패 시 수동 입력이 1급 시민.
// 크롤링 우회·차단 회피는 시도하지 않는다. 스마트스토어가 봇을 막으면 조용히 수동 필드로 간다.
import type { Product, ProductInput } from "./types";

/** 공개 메타태그(og:title 등)만 시도 — 로그인·쿠키·우회 없음. 몇 초 내 실패하면 포기. */
async function tryPublicMeta(url: string): Promise<Partial<Product>> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (compatible; ateflo-species-c/1.0)" } });
    if (!res.ok) return {};
    const html = await res.text();
    const meta = (prop: string) => new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`, "i").exec(html)?.[1];
    const name = meta("og:title");
    const priceRaw = meta("product:price:amount") ?? meta("og:product:price:amount");
    return {
      ...(name ? { name: name.replace(/\s*:\s*네이버.*$/, "").trim() } : {}),
      ...(priceRaw && Number(priceRaw) > 0 ? { price: Number(priceRaw) } : {}),
    };
  } catch { return {}; }
}

export async function intake(input: ProductInput): Promise<{ product: Product; notes: string[] }> {
  const notes: string[] = [];
  if (!input.url) throw new Error("상품 URL이 필요합니다");
  if (!(input.commissionPct > 0)) throw new Error("수수료율(%)이 필요합니다 — 쇼핑커넥트 화면에서 확인해 수동 입력");

  const auto = await tryPublicMeta(input.url);
  if (auto.name) notes.push(`자동 수집: 상품명(공개 메타태그)`);
  else notes.push("자동 수집 실패 또는 차단 — 수동 입력 필드 사용(정상 경로)");

  const name = input.name ?? auto.name;
  const price = input.price ?? auto.price;
  const missing: string[] = [];
  if (!name) missing.push("name(상품명)");
  if (!price) missing.push("price(판매가)");
  if (input.rating == null) missing.push("rating(평점)");
  if (input.reviewCount == null) missing.push("reviewCount(리뷰 수)");
  if (!input.category) missing.push("category(카테고리)");
  if (missing.length) throw new Error(`수동 입력 필요 필드: ${missing.join(", ")} — 상품 페이지에서 복사해 입력 JSON에 추가하세요`);

  const reviewsText = (input.reviewsText ?? "").trim();
  if (!reviewsText) notes.push("리뷰 텍스트 없음 — 리뷰 마이닝은 리뷰 붙여넣기 입력이 필요(§6)");

  return {
    product: {
      url: input.url,
      name: name!,
      price: price!,
      rating: input.rating!,
      reviewCount: input.reviewCount!,
      category: input.category!,
      discountPct: input.discountPct ?? 0,
      commissionPct: input.commissionPct,
      reviewsText,
      myExperience: (input.myExperience ?? "").trim() || null,
      source: input.name && auto.name ? "mixed" : auto.name ? "auto" : "manual",
    },
    notes,
  };
}
