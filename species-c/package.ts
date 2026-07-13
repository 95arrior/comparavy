// [species-c] §10 출력 패키지 — 복붙 순서대로 한 폴더에.
import fs from "node:fs";
import path from "node:path";
import { briefToMarkdownish } from "./brief";
import type { ArticleDraft, GateResult, KeywordResult, Product, PsychBrief, QualityResult } from "./types";

export function writePackage(args: {
  product: Product; gate: GateResult; keywords: KeywordResult; brief: PsychBrief;
  article: ArticleDraft; cards: { file: string; kind: string }[]; quality: QualityResult;
}): string {
  const slug = args.product.name.replace(/[^가-힣a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const outDir = path.join(__dirname, "out", `${new Date().toISOString().slice(0, 10)}-${slug}`);
  fs.mkdirSync(path.join(outDir, "03_이미지"), { recursive: true });

  fs.writeFileSync(path.join(outDir, "01_제목.txt"), [
    `검색 최적화안: ${args.article.titleSearch}`,
    `홈판 훅안:     ${args.article.titleHook}`,
    ``,
    `권장: 검색 최적화안으로 발행(신생 블로그는 검색 유입이 먼저다)`,
  ].join("\n"));

  fs.writeFileSync(path.join(outDir, "02_본문.txt"), args.article.body);

  args.cards.forEach((c, i) => {
    const dest = path.join(outDir, "03_이미지", `${String(i + 1).padStart(2, "0")}_${c.kind}.png`);
    fs.copyFileSync(c.file, dest);
    fs.rmSync(c.file, { force: true });
  });

  fs.writeFileSync(path.join(outDir, "04_태그.txt"), args.article.tags.join(", "));

  fs.writeFileSync(path.join(outDir, "05_조립가이드.md"), [
    `# 조립 가이드 (5분 복붙 코스)`,
    ``,
    `1. 네이버 블로그 글쓰기 열기 → 01_제목.txt의 "검색 최적화안"을 제목에 붙여넣기`,
    `2. 02_본문.txt 전체 복사 → 본문에 붙여넣기`,
    `3. 본문에서 "[이미지: 리뷰 분석 카드]" 줄을 지우고 그 자리에 03_이미지/01_review.png 업로드`,
    `   같은 방식으로 [이미지: CTA 카드] → 02_cta.png, [이미지: 체크리스트 카드] → 03_checklist.png`,
    `4. 본문의 "[쇼핑커넥트 링크 교체 위치]" 2곳을 지우고, 쇼핑커넥트에서 발급한 이 상품 링크를 삽입`,
    `   (쇼핑커넥트 → 링크 만들기 → 상품 URL 붙여넣기 → 발급 링크 복사)`,
    `5. 04_태그.txt의 태그들을 태그 칸에 입력`,
    `6. 발행 전 최종 체크:`,
    `   - 대가성 문구가 본문 앞부분에 있는가 (있어야 정상)`,
    `   - 이미지 3장이 모두 업로드됐는가`,
    `   - 링크 2곳이 모두 쇼핑커넥트 발급 링크인가 (원본 상품 URL 아님)`,
    `   - 제목에 메인 키워드("${args.keywords.main.keyword}")가 들어 있는가`,
    ``,
    `메인 키워드 실측: 월 ${args.keywords.main.vol?.toLocaleString()}회 검색 / 경쟁 문서 ${args.keywords.main.blogTotal?.toLocaleString()}개`,
  ].join("\n"));

  fs.writeFileSync(path.join(outDir, "06_심리브리프.md"), briefToMarkdownish(args.brief));
  return outDir;
}
