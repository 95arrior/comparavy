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
  const outDir = path.join(__dirname, "out", `${new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)}-${slug}`); // KST
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
    `2-1. 본문에서 ==문장== 으로 감싼 곳(2~4곳)을 찾아: 그 문장을 드래그 → 에디터 형광펜(배경색) 적용 → 앞뒤 == 기호 삭제`,
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
  fs.writeFileSync(path.join(outDir, "view.html"), buildViewHtml(args, outDir));
  return outDir;
}

// ★복붙 도우미(2026-07-14 유저 요청: 본편처럼 버튼으로) — 브라우저로 열면 제목·본문·태그 원클릭 복사 + 카드 이미지 복사 버튼.
function buildViewHtml(args: { product: Product; keywords: KeywordResult; article: ArticleDraft; cards: { file: string; kind: string }[] }, outDir: string): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const imgs = fs.readdirSync(path.join(outDir, "03_이미지")).filter((f) => f.endsWith(".png")).map((f) => ({ name: f, b64: fs.readFileSync(path.join(outDir, "03_이미지", f)).toString("base64") }));
  const bodyHtml = esc(args.article.body)
    .replace(/\[쇼핑커넥트 링크 교체 위치\]/g, '<mark style="background:#FFE27A;padding:2px 8px;border-radius:6px;font-weight:700">[쇼핑커넥트 링크 교체 위치 — 발급 링크 붙이기]</mark>')
    .replace(/\[이미지: ([^\]]+)\]/g, '<mark style="background:#CFE3FF;padding:2px 8px;border-radius:6px;font-weight:700">[여기에 이미지 업로드: $1]</mark>')
    .replace(/==([^=\n]{2,80})==/g, '<span style="background:#FFF3A0;padding:1px 4px;border-radius:4px">$1</span> <span style="color:#C43D2B;font-size:12px;font-weight:700">← 형광펜 후 == 삭제</span>')
    .replace(/\n/g, "<br>");
  return `<meta charset="utf-8"><title>박카상사 복붙 도우미</title>
<body style="font-family:-apple-system,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;background:#FFF7E8">
<h2 style="margin:8px 0">박카상사 복붙 도우미</h2>
<p style="color:#8A6F4D;margin:0 0 18px">순서대로 버튼만 누르면 됩니다. 노란 표시 2곳은 쇼핑커넥트 발급 링크로, 파란 표시 3곳은 아래 이미지로 교체.</p>
<div style="background:#fff;border:2px solid #2B2117;border-radius:12px;padding:16px;margin-bottom:14px">
  <b>1. 제목</b> <button onclick="cp(this,${JSON.stringify(JSON.stringify(args.article.titleSearch))})">제목 복사</button>
  <div style="margin-top:8px;font-size:15px">${esc(args.article.titleSearch)}</div>
</div>
<div style="background:#fff;border:2px solid #2B2117;border-radius:12px;padding:16px;margin-bottom:14px">
  <b>2. 본문</b> <button id="bodyBtn">본문 복사</button>
  <div id="bodyText" style="margin-top:10px;font-size:14.5px;line-height:1.7;color:#2B2117">${bodyHtml}</div>
</div>
<div style="background:#fff;border:2px solid #2B2117;border-radius:12px;padding:16px;margin-bottom:14px">
  <b>3. 이미지 (마커 자리에 순서대로)</b>
  ${imgs.map((im, i) => `<div style="margin-top:12px"><button onclick="cpImg(this,'im${i}')">이미지 ${i + 1} 복사</button> <span style="color:#8A6F4D;font-size:13px">${esc(im.name)}</span><br><img id="im${i}" src="data:image/png;base64,${im.b64}" style="max-width:100%;border:1px solid #ddd;border-radius:8px;margin-top:6px"></div>`).join("")}
</div>
<div style="background:#fff;border:2px solid #2B2117;border-radius:12px;padding:16px;margin-bottom:14px">
  <b>4. 태그</b> <button onclick="cp(this,${JSON.stringify(JSON.stringify(args.article.tags.join(", ")))})">태그 복사</button>
  <div style="margin-top:8px;color:#555;font-size:14px">${esc(args.article.tags.join(", "))}</div>
</div>
<p style="color:#8A6F4D">발행 전 체크: 링크 2곳 교체 완료 / 이미지 3장 업로드 / 제목에 "${esc(args.keywords.main.keyword)}" 포함</p>
<script>
function done(b){const t=b.textContent;b.textContent="복사됨!";setTimeout(()=>b.textContent=t,1200)}
function cp(b,t){navigator.clipboard.writeText(t).then(()=>done(b))}
document.getElementById("bodyBtn").onclick=function(){navigator.clipboard.writeText(${JSON.stringify(args.article.body)}).then(()=>done(this))}
async function cpImg(b,id){const img=document.getElementById(id);const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext("2d").drawImage(img,0,0);const bl=await new Promise(r=>c.toBlob(r,"image/png"));await navigator.clipboard.write([new ClipboardItem({"image/png":bl})]);done(b)}
</script></body>`;
}
