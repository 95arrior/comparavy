/**
 * 한국어 글 생성 품질 검증.
 * 실행: npm run check:generation  (.env.local 의 ANTHROPIC_API_KEY 필요)
 *
 * 샘플 키워드로 글 1편을 생성한 뒤 16개 항목을 점검한다.
 */
import { generateArticle } from "../lib/generateArticle";
import { detectCliches, countKoreanChars } from "../lib/humanizer";

const SAMPLE = {
  keyword: "초보자를 위한 블로그 글쓰기 방법",
  angle: "처음 블로그를 시작하는 사람을 위한 실용 가이드",
  type: "howto",
  tone: "friendly",
  maxWords: 1500,
};

const HANGUL = /[가-힣]/;
const ALLOWED_TAGS = new Set(["h2", "h3", "p", "ul", "li", "ol", "strong", "em", "br"]);

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

function run(article: Awaited<ReturnType<typeof generateArticle>>): Check[] {
  const charCount = countKoreanChars(article.body_html);
  const bodyCliches = detectCliches(article.body_html);
  const titleCliches = detectCliches(article.title);
  const usedTags = Array.from(article.body_html.matchAll(/<\s*([a-zA-Z0-9]+)/g)).map((m) =>
    m[1].toLowerCase(),
  );
  const disallowed = usedTags.filter((t) => !ALLOWED_TAGS.has(t));

  return [
    { name: "제목이 존재한다", pass: article.title.length > 0 },
    { name: "제목이 한국어다", pass: HANGUL.test(article.title) },
    { name: "메타 제목이 존재한다", pass: article.meta_title.length > 0 },
    { name: "메타 제목 60자 이하", pass: article.meta_title.length <= 60, detail: `${article.meta_title.length}자` },
    { name: "메타 설명이 존재한다", pass: article.meta_description.length > 0 },
    { name: "메타 설명 160자 이하", pass: article.meta_description.length <= 160, detail: `${article.meta_description.length}자` },
    { name: "메타 설명 50자 이상", pass: article.meta_description.length >= 50, detail: `${article.meta_description.length}자` },
    { name: "본문이 존재한다", pass: article.body_html.length > 0 },
    { name: "본문에 <h2> 소제목이 있다", pass: /<h2[\s>]/i.test(article.body_html) },
    { name: "본문에 <p> 문단이 있다", pass: /<p[\s>]/i.test(article.body_html) },
    { name: "본문이 충분히 길다 (목표의 50% 이상)", pass: charCount >= SAMPLE.maxWords * 0.5, detail: `${charCount}자` },
    { name: "본문이 과도하게 길지 않다 (목표의 250% 이하)", pass: charCount <= SAMPLE.maxWords * 2.5, detail: `${charCount}자` },
    { name: "허용되지 않은 HTML 태그가 없다", pass: disallowed.length === 0, detail: disallowed.join(", ") },
    { name: "인라인 스타일이 없다", pass: !/style\s*=/.test(article.body_html) },
    { name: "FAQ가 3개 이상이다", pass: article.faq.length >= 3, detail: `${article.faq.length}개` },
    { name: "본문·제목에 AI 상투어가 없다", pass: bodyCliches.length === 0 && titleCliches.length === 0, detail: [...bodyCliches, ...titleCliches].join(", ") },
  ];
}

async function main() {
  console.log("샘플 글 생성 중…\n");
  const article = await generateArticle(SAMPLE);
  const checks = run(article);

  let failed = 0;
  for (const c of checks) {
    const mark = c.pass ? "✅" : "❌";
    const detail = c.detail ? ` (${c.detail})` : "";
    console.log(`${mark} ${c.name}${detail}`);
    if (!c.pass) failed++;
  }

  console.log(`\n${checks.length - failed}/${checks.length} 통과`);
  if (failed > 0) {
    console.log("\n⚠️  일부 항목 실패");
    process.exit(1);
  }
  console.log("\nALL PASSED ✅");
}

main().catch((err) => {
  console.error("검증 실패:", err instanceof Error ? err.message : err);
  process.exit(1);
});
