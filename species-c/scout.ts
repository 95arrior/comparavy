// [species-c] 상품 스카우터 — 시기(월)·시즌 테이블·검색량 실측·쇼핑 API로 후보 상품을 자동 발굴한다.
// 사람의 몫은 마지막 10초: 쇼핑커넥트에서 수수료율·리뷰 수 확인(로그인 내부 정보 — 자동화 불가 영역).
import { loadEnv } from "./env";
import { PRODUCT_GATE, SEASON_TABLE } from "./config";
import { fetchVolumes } from "./copied/naverApi";
import { askJson } from "./llm";

interface ShopItem { title: string; link: string; lprice: string; mallName: string; brand: string; category3: string; productId: string }

async function shopSearch(query: string, display = 10): Promise<ShopItem[]> {
  loadEnv();
  const id = process.env.NAVER_DATALAB_CLIENT_ID!, sec = process.env.NAVER_DATALAB_SECRET!;
  const res = await fetch(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=${display}&sort=sim`, {
    headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": sec },
  });
  if (!res.ok) { await res.text(); return []; }
  const json = (await res.json()) as { items?: ShopItem[] };
  return json.items ?? [];
}

const strip = (s: string) => s.replace(/<[^>]+>/g, "");

export async function scout(theme?: string): Promise<void> {
  const month = new Date().getMonth() + 1;
  const seasonTokens = SEASON_TABLE[month] ?? [];

  // ① 시즌×구매 맥락으로 '상품 검색어' 후보 생성(트렌드·이슈 감각은 LLM, 검증은 실측)
  const phrases = await askJson<string[]>(
    [
      `지금은 ${month}월이다. 이 시즌 수요 테마: ${seasonTokens.join(", ")}.`,
      theme ? `블로그 주제 고정: "${theme}" — 모든 검색어가 이 주제 카테고리 안의 상품이어야 한다(주제 전문성 보호).` : "",
      `네이버 쇼핑에서 '지금 사람들이 실제로 사는 저관여 생활용품'을 찾는 상품 검색어 12개를 만들어라.`,
      `조건: 1~5만원대 생활용품이 걸릴 검색어(가전·명품 금지), 문제 해결형 니즈(냄새·습기·정리·더위 등), 브랜드명 금지, 2~4어절.`,
      `JSON 배열: ["세탁조 클리너", ...]`,
    ].filter(Boolean).join("\n"),
    3000,
  );

  // ② 검색어 수요 실측(광고 API) — 수요 없는 검색어 제거
  const vols = await fetchVolumes(phrases);
  const ranked = phrases
    .map((p) => ({ phrase: p, vol: vols.get(p) ?? 0 }))
    .filter((p) => (p.vol ?? 0) >= 300)
    .sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0))
    .slice(0, 6);

  // ③ 쇼핑 API로 후보 상품 수집 → 가격 밴드 필터 → 스마트스토어 우선
  console.log(`\n[상품 스카우터] ${month}월 시즌 후보 (검색량 실측 완료 — 마지막 확인 2가지: 쇼핑커넥트 수수료율, 리뷰 300+/평점 4.3+)\n`);
  for (const { phrase, vol } of ranked) {
    const items = await shopSearch(phrase, 12);
    const fit = items
      .filter((i) => { const p = Number(i.lprice); return p >= PRODUCT_GATE.priceMin && p <= PRODUCT_GATE.priceMax; })
      .filter((i) => /smartstore\.naver\.com/.test(i.link) || i.mallName)
      .slice(0, 3);
    if (!fit.length) continue;
    console.log(`◆ "${phrase}" — 월 ${vol?.toLocaleString()}회 검색`);
    for (const f of fit) {
      console.log(`   - ${strip(f.title).slice(0, 44)} | ${Number(f.lprice).toLocaleString()}원 | ${f.mallName}`);
      console.log(`     ${f.link}`);
    }
    console.log("");
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log("고르는 법: 링크 열어 리뷰 300+·평점 4.3+ 확인 → 쇼핑커넥트에서 수수료율 확인 → URL·수수료율·리뷰 복사본을 입력으로.");
}

scout(process.argv[2]).catch((e) => { console.error("스카우터 실패:", e instanceof Error ? e.message : e); process.exit(1); });
