// [species-c] §10 출력 패키지 — 복붙 순서대로 한 폴더에.
import fs from "node:fs";
import path from "node:path";
import { briefToMarkdownish } from "./brief";
import { buildRichBody } from "./richBody";
import { MARKER_LINK_1, MARKER_LINK_2 } from "./config";

/** ★발급 링크 자동 삽입(유저 확정: 입력에 링크가 오면 마커 대신 실링크) — URL 단독 줄(에디터가 링크 카드로 변환) */
export function applyConnectLink(body: string, link: string | null): string {
  if (!link) return body;
  return body.split(MARKER_LINK_1).join(link).split(MARKER_LINK_2).join(link);
}
import type { ArticleDraft, GateResult, KeywordResult, Product, PsychBrief, QualityResult } from "./types";

export function writePackage(args: {
  product: Product; gate: GateResult; keywords: KeywordResult; brief: PsychBrief;
  article: ArticleDraft; cards: { file: string; kind: string }[]; quality: QualityResult;
}): string {
  const slug = args.product.name.replace(/[^가-힣a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const outDir = path.join(__dirname, "out", `${new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)}-${slug}`); // KST
  fs.rmSync(outDir, { recursive: true, force: true }); // 재생성 시 이전 산출물 잔존 방지(실측: 구 CTA·체크리스트 카드가 남음)
  fs.mkdirSync(path.join(outDir, "03_이미지"), { recursive: true });

  fs.writeFileSync(path.join(outDir, "01_제목.txt"), [
    `검색 최적화안: ${args.article.titleSearch}`,
    `홈판 훅안:     ${args.article.titleHook}`,
    ``,
    `권장: 검색 최적화안으로 발행(신생 블로그는 검색 유입이 먼저다)`,
  ].join("\n"));

  const finalBody = applyConnectLink(args.article.body, args.product.connectLink);
  fs.writeFileSync(path.join(outDir, "02_본문.txt"), finalBody);

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
    `2-1. view.html의 [본문 복사]를 쓰면 중앙정렬·크기·형광펜 서식이 자동으로 붙습니다(권장). 02_본문.txt(플레인)를 쓴 경우에만: ==문장== 2~4곳을 드래그 → 형광펜 → == 삭제`,
    `3. 마커 교체(4곳):`,
    `   - [상품 이미지] 3~5곳(글마다 다름) → 상품 페이지의 대표·상세컷을 여러 장 저장해 각각 업로드(같은 사진 반복 금지)`,
    args.product.connectLink
      ? `   - 쇼핑커넥트 링크 2곳은 이미 본문에 삽입됨 — 붙여넣기 후 링크 줄 끝에서 엔터 한 번(링크 카드로 변환되는지 확인)`
      : `   - [쇼핑커넥트 링크 1]·[쇼핑커넥트 링크 2] → 각각 지우고 쇼핑커넥트 발급 링크 삽입(링크 카드가 상품 이미지·가격을 자동 표시)`,
    `4. 04_태그.txt의 태그들을 태그 칸에 입력`,
    `5. 발행 전 최종 체크:`,
    `   - 대가성 문구가 본문 '맨 첫 줄'에 있는가 (규정 — 절대 지우지 말 것)`,
    `   - 링크 2곳이 모두 쇼핑커넥트 발급 링크인가 (원본 상품 URL 아님)`,
    `   - 제목에 메인 키워드("${args.keywords.main.keyword}")가 들어 있는가`,
    `   - ★블로그의 '내돈내산' 체크 기능은 사용 금지 (대가성 글 — 허위 표시가 된다)`,
    `   - ★쇼핑커넥트 통계·정산 수치는 글·댓글·커뮤니티 어디에도 공개 금지 (약관)`,
    ``,
    `메인 키워드 실측: 월 ${args.keywords.main.vol?.toLocaleString()}회 검색 / 경쟁 문서 ${args.keywords.main.blogTotal?.toLocaleString()}개`,
  ].join("\n"));

  fs.writeFileSync(path.join(outDir, "06_심리브리프.md"), briefToMarkdownish(args.brief));
  fs.writeFileSync(path.join(outDir, "07_본문_서식.html"), buildRichBody(args.article.body)); // 리치 조립본(스마트에디터 생존 서식)
  fs.writeFileSync(path.join(outDir, "view.html"), buildViewHtml(args, outDir));
  return outDir;
}

// ★복붙 도우미(2026-07-14 유저 요청: 본편처럼 버튼으로) — 브라우저로 열면 제목·본문·태그 원클릭 복사 + 카드 이미지 복사 버튼.
function buildViewHtml(args: { product: Product; keywords: KeywordResult; article: ArticleDraft; cards: { file: string; kind: string }[] }, outDir: string): string {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const imgs = fs.readdirSync(path.join(outDir, "03_이미지")).filter((f) => f.endsWith(".png")).map((f) => ({ name: f, b64: fs.readFileSync(path.join(outDir, "03_이미지", f)).toString("base64") }));
  const richHtml = buildRichBody(applyConnectLink(args.article.body, args.product.connectLink)); // 서식+발급 링크 자동
  const bodyHtml = richHtml;
  return `<meta charset="utf-8"><title>박카상사 복붙 도우미</title>
<body style="font-family:-apple-system,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;background:#FFF7E8">
<h2 style="margin:8px 0">박카상사 복붙 도우미</h2>
<p style="color:#8A6F4D;margin:0 0 18px">순서대로 버튼만 누르면 됩니다. 노란 표시 2곳은 쇼핑커넥트 발급 링크로, 파란 표시 3곳은 아래 이미지로 교체.</p>
<div style="background:#fff;border:2px solid #2B2117;border-radius:12px;padding:16px;margin-bottom:14px">
  <b>1. 제목</b> <button onclick="cp(this,${JSON.stringify(JSON.stringify(args.article.titleSearch))})">제목 복사</button>
  <div style="margin-top:8px;font-size:15px">${esc(args.article.titleSearch)}</div>
</div>
<div style="background:#fff;border:2px solid #2B2117;border-radius:12px;padding:16px;margin-bottom:14px">
  <b>2. 본문</b> <button id="bodyBtn">본문 복사 (서식 포함)</button> <span style="font-size:12px;color:#8A6F4D">중앙정렬·크기·형광펜이 그대로 붙습니다 — 회색 박스 4곳만 교체</span>
  <div id="bodyText" style="margin-top:10px;background:#fff;padding:8px 0">${bodyHtml}</div>
</div>
${imgs.length ? `<div style="background:#fff;border:2px solid #2B2117;border-radius:12px;padding:16px;margin-bottom:14px">
  <b>3. 이미지 (마커 자리에 순서대로)</b>
  ${imgs.map((im, i) => `<div style="margin-top:12px"><button onclick="cpImg(this,'im${i}')">이미지 ${i + 1} 복사</button> <span style="color:#8A6F4D;font-size:13px">${esc(im.name)}</span><br><img id="im${i}" src="data:image/png;base64,${im.b64}" style="max-width:100%;border:1px solid #ddd;border-radius:8px;margin-top:6px"></div>`).join("")}
</div>` : `<div style="background:#fff;border:2px solid #2B2117;border-radius:12px;padding:16px;margin-bottom:14px"><b>3. 이미지</b> <span style="font-size:13px;color:#8A6F4D">회색 박스 [상품 이미지] 3~5곳에 상품 페이지의 대표·상세컷을 각각 업로드하세요(같은 사진 반복 금지).</span></div>`}
<div style="background:#fff;border:2px solid #2B2117;border-radius:12px;padding:16px;margin-bottom:14px">
  <b>4. 태그</b> <button onclick="cp(this,${JSON.stringify(JSON.stringify(args.article.tags.join(", ")))})">태그 복사</button>
  <div style="margin-top:8px;color:#555;font-size:14px">${esc(args.article.tags.join(", "))}</div>
</div>
<p style="color:#8A6F4D">발행 전 체크: 링크 2곳 교체 완료 / 이미지 3장 업로드 / 제목에 "${esc(args.keywords.main.keyword)}" 포함</p>
<script>
function done(b){const t=b.textContent;b.textContent="복사됨!";setTimeout(()=>b.textContent=t,1200)}
function cp(b,t){navigator.clipboard.writeText(t).then(()=>done(b))}
document.getElementById("bodyBtn").onclick=async function(){const html=document.getElementById("bodyText").innerHTML;const blob=new Blob([html],{type:"text/html"});const plain=new Blob([${JSON.stringify(applyConnectLink(args.article.body, args.product.connectLink))}],{type:"text/plain"});await navigator.clipboard.write([new ClipboardItem({"text/html":blob,"text/plain":plain})]);done(this)}
async function cpImg(b,id){const img=document.getElementById(id);const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext("2d").drawImage(img,0,0);const bl=await new Promise(r=>c.toBlob(r,"image/png"));await navigator.clipboard.write([new ClipboardItem({"image/png":bl})]);done(b)}
</script></body>`;
}
