// [species-c] §3 상품 게이트 — 판매왕의 첫 관문. fail-closed: 실격이면 글 생성 진행 금지(override 시 경고 유지).
import { PRODUCT_GATE, SEASON_TABLE } from "./config";
import type { GateResult, Product } from "./types";

export function runProductGate(p: Product, now = new Date()): GateResult {
  const commissionKrw = Math.round(p.price * (p.commissionPct / 100));
  const month = now.getMonth() + 1;
  const seasonTokens = SEASON_TABLE[month] ?? [];
  const hay = `${p.name} ${p.category}`.replace(/\s+/g, "");
  const seasonHit = seasonTokens.filter((t) => hay.includes(t));
  // 역시즌: 반대 계절(6개월 차) 토큰이 상품에 박혀 있으면 감점
  const offTokens = SEASON_TABLE[((month + 5) % 12) + 1] ?? [];
  const offHit = offTokens.filter((t) => hay.includes(t) && !seasonHit.includes(t));
  const seasonScore = (seasonHit.length ? PRODUCT_GATE.seasonBonus : 0) + (offHit.length ? PRODUCT_GATE.offSeasonPenalty : 0);

  const checks = [
    { key: "reviews", label: `리뷰 수 ${PRODUCT_GATE.minReviews}+`, pass: p.reviewCount >= PRODUCT_GATE.minReviews, detail: `${p.reviewCount.toLocaleString()}건` },
    { key: "rating", label: `평점 ${PRODUCT_GATE.minRating}+`, pass: p.rating >= PRODUCT_GATE.minRating, detail: `${p.rating}` },
    { key: "commission", label: `수수료 금액 ${PRODUCT_GATE.minCommissionKrw.toLocaleString()}원+`, pass: commissionKrw >= PRODUCT_GATE.minCommissionKrw, detail: `${p.price.toLocaleString()}원 × ${p.commissionPct}% = ${commissionKrw.toLocaleString()}원` },
    { key: "price", label: `판매가 ${PRODUCT_GATE.priceMin / 10000}만~${PRODUCT_GATE.priceMax / 10000}만원`, pass: p.price >= PRODUCT_GATE.priceMin && p.price <= PRODUCT_GATE.priceMax, detail: `${p.price.toLocaleString()}원` },
    { key: "season", label: "시즌 정합(가산/감점)", pass: true, detail: seasonHit.length ? `${month}월 시즌 매칭: ${seasonHit.join("·")} (+${PRODUCT_GATE.seasonBonus})` : offHit.length ? `역시즌 토큰: ${offHit.join("·")} (${PRODUCT_GATE.offSeasonPenalty})` : "시즌 중립(0)", score: seasonScore },
  ];
  return { pass: checks.every((c) => c.pass), checks, seasonScore };
}
