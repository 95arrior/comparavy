import puppeteer from "puppeteer";
import type { CardSlide } from "./cardNews";

const INK = "#191F28";
const BLUE = "#3f91ff";
const ACCENT = "#ffd23a";

// 미세 그레인(노이즈) — 프리미엄 질감
const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
}

function slideHtml(slide: CardSlide, index: number, total: number): string {
  const isCover = index === 0;
  const bg = isCover ? BLUE : INK;
  const num = String(index + 1).padStart(2, "0");
  const totalStr = String(total).padStart(2, "0");
  const glow = isCover
    ? "radial-gradient(circle, rgba(255,255,255,0.55), transparent 68%)"
    : "radial-gradient(circle, rgba(63,145,255,0.85), transparent 68%)";
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1350px;}
body{font-family:"Pretendard","Apple SD Gothic Neo","Noto Sans KR",sans-serif;background:${bg};color:#fff;position:relative;overflow:hidden;-webkit-font-smoothing:antialiased;}
.glow{position:absolute;width:980px;height:980px;border-radius:50%;filter:blur(140px);opacity:.5;background:${glow};top:-320px;right:-260px;}
.grain{position:absolute;inset:0;opacity:.045;mix-blend-mode:overlay;background-image:url("${GRAIN}");}
.wrap{position:relative;z-index:1;height:100%;padding:100px 96px;display:flex;flex-direction:column;justify-content:space-between;}
.top{display:flex;flex-direction:column;gap:38px;}
.pill{align-self:flex-start;background:${ACCENT};color:${INK};font-weight:800;font-size:36px;line-height:1;padding:14px 26px;border-radius:999px;}
.mark{font-size:32px;font-weight:700;letter-spacing:-.01em;opacity:.92;}
.title{font-weight:800;line-height:1.14;letter-spacing:-.025em;font-size:${isCover ? "94px" : "80px"};word-break:keep-all;}
.bottom{display:flex;flex-direction:column;}
.body{font-weight:500;font-size:42px;line-height:1.45;opacity:.85;word-break:keep-all;}
.foot{margin-top:48px;display:flex;justify-content:space-between;font-size:27px;font-weight:600;opacity:.5;}
</style></head>
<body>
<div class="glow"></div><div class="grain"></div>
<div class="wrap">
  <div class="top">
    ${isCover ? `<div class="mark">● 에이트플로</div>` : `<span class="pill">${num}</span>`}
    <div class="title">${esc(slide.title)}</div>
  </div>
  <div class="bottom">
    ${slide.body ? `<div class="body">${esc(slide.body)}</div>` : ""}
    <div class="foot"><span>에이트플로 · ateflo.com</span><span>${num} / ${totalStr}</span></div>
  </div>
</div>
</body></html>`;
}

/** 슬라이드들을 1080x1350 PNG로 렌더 (풀 Puppeteer, 로컬). */
export async function renderCards(slides: CardSlide[]): Promise<Buffer[]> {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
    const out: Buffer[] = [];
    for (let i = 0; i < slides.length; i++) {
      await page.setContent(slideHtml(slides[i], i, slides.length), { waitUntil: "load" });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await new Promise((r) => setTimeout(r, 300)); // 폰트·그라데이션 안정화
      const buf = await page.screenshot({ type: "png" });
      out.push(Buffer.from(buf));
    }
    return out;
  } finally {
    await browser.close();
  }
}
