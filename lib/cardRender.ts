import puppeteer from "puppeteer";
import type { CardSlide } from "./cardNews";

const INK = "#191F28";
const BLUE = "#3f91ff";
const ACCENT = "#ffd23a";

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
}

// 제품 미니 목업 (흰 카드)
function mockup(kind: string): string {
  if (kind === "publish") {
    return `<div class="card ctr">
      <div class="check">✓</div>
      <div class="m-h">워드프레스에 올렸어요</div>
      <div class="m-s">myblog.com/dog-anxiety</div>
    </div>`;
  }
  if (kind === "calendar") {
    let cells = "";
    const dots: Record<number, string> = { 4: BLUE, 9: "#2fd07a", 13: BLUE, 18: BLUE, 22: "#2fd07a" };
    for (let i = 0; i < 35; i++) {
      const d = i - 2;
      cells += `<div class="cell">${d > 0 && d <= 30 ? d : ""}${dots[d] ? `<span class="bar" style="background:${dots[d]}"></span>` : ""}</div>`;
    }
    return `<div class="card">
      <div class="m-h" style="font-size:32px">6월 발행 일정</div>
      <div class="cal">${cells}</div>
    </div>`;
  }
  if (kind === "edit") {
    return `<div class="card">
      <div class="tb"><span>B</span><span>H</span><span>≡</span><span>🖼</span></div>
      <div class="ln d" style="width:62%"></div>
      <div class="ln" style="width:100%"></div>
      <div class="imgblk"></div>
    </div>`;
  }
  // generate (기본)
  return `<div class="card">
    <div class="ipt"><span>강아지 분리불안 해결 방법</span><span class="btn">글 생성</span></div>
    <div class="ln d" style="width:88%;margin-top:30px"></div>
    <div class="ln" style="width:100%"></div>
    <div class="ln" style="width:70%"></div>
  </div>`;
}

function midHtml(slide: CardSlide): string {
  if (slide.type === "stat" && slide.stat) {
    return `<div class="statwrap"><div class="stat">${esc(slide.stat)}</div>${slide.statLabel ? `<div class="statlabel">${esc(slide.statLabel)}</div>` : ""}</div>`;
  }
  if (slide.type === "point" && slide.points?.length) {
    return `<div class="points">${slide.points.map((p) => `<div class="point"><span class="pc">✓</span>${esc(p)}</div>`).join("")}</div>`;
  }
  if (slide.type === "mockup") {
    return mockup(slide.mockup || "generate");
  }
  return ""; // text → 비움(여백)
}

function slideHtml(slide: CardSlide, index: number, total: number): string {
  const isCover = index === 0;
  const bg = isCover ? BLUE : INK;
  const num = String(index + 1).padStart(2, "0");
  const totalStr = String(total).padStart(2, "0");
  const glow = isCover ? "radial-gradient(circle, rgba(255,255,255,0.55), transparent 68%)" : "radial-gradient(circle, rgba(63,145,255,0.85), transparent 68%)";
  const titleSize = isCover ? 94 : slide.type === "stat" ? 56 : 78;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1080px;height:1350px;}
body{font-family:"Pretendard","Apple SD Gothic Neo","Noto Sans KR",sans-serif;background:${bg};color:#fff;position:relative;overflow:hidden;-webkit-font-smoothing:antialiased;}
.glow{position:absolute;width:980px;height:980px;border-radius:50%;filter:blur(140px);opacity:.5;background:${glow};top:-320px;right:-260px;}
.grain{position:absolute;inset:0;opacity:.045;mix-blend-mode:overlay;background-image:url("${GRAIN}");}
.wrap{position:relative;z-index:1;height:100%;padding:100px 96px;display:flex;flex-direction:column;}
.top{display:flex;flex-direction:column;gap:36px;}
.mark{display:flex;align-items:center;gap:14px;font-size:34px;font-weight:700;letter-spacing:-.01em;opacity:.96;}
.pill{align-self:flex-start;background:${ACCENT};color:${INK};font-weight:800;font-size:36px;line-height:1;padding:14px 26px;border-radius:999px;}
.title{font-weight:800;line-height:1.14;letter-spacing:-.025em;font-size:${titleSize}px;word-break:keep-all;}
.mid{flex:1;display:flex;align-items:center;justify-content:center;}
.bottom{display:flex;flex-direction:column;}
.body{font-weight:500;font-size:42px;line-height:1.45;opacity:.85;word-break:keep-all;}
.foot{margin-top:44px;display:flex;justify-content:space-between;font-size:27px;font-weight:600;opacity:.5;}
/* stat */
.statwrap{text-align:center;}
.stat{font-weight:800;font-size:220px;line-height:1;letter-spacing:-.04em;color:${ACCENT};}
.statlabel{margin-top:24px;font-size:40px;font-weight:600;opacity:.85;}
/* point */
.points{width:100%;display:flex;flex-direction:column;gap:24px;}
.point{display:flex;align-items:center;gap:22px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:30px 34px;font-size:46px;font-weight:700;}
.pc{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:${BLUE};color:#fff;font-size:30px;flex:none;}
/* mockup card */
.card{width:760px;background:#fff;color:${INK};border-radius:32px;padding:48px;box-shadow:0 30px 80px rgba(0,0,0,.3);}
.card.ctr{text-align:center;}
.ipt{display:flex;align-items:center;justify-content:space-between;gap:16px;border:2px solid #eef0f3;border-radius:18px;padding:22px 26px;font-size:34px;color:#444;}
.btn{background:${INK};color:#fff;font-size:28px;font-weight:700;padding:14px 26px;border-radius:14px;white-space:nowrap;}
.ln{height:22px;border-radius:99px;background:#e9edf2;margin-top:22px;}
.ln.d{background:#c8d0da;}
.check{width:110px;height:110px;border-radius:50%;background:#2fd07a;color:#fff;font-size:64px;display:flex;align-items:center;justify-content:center;margin:0 auto;}
.m-h{font-size:44px;font-weight:800;margin-top:28px;}
.m-s{font-size:30px;color:#8b95a1;margin-top:10px;}
.cal{margin-top:28px;display:grid;grid-template-columns:repeat(7,1fr);gap:10px;}
.cell{aspect-ratio:1;border-radius:12px;background:#f4f6f9;color:#9aa4b0;font-size:24px;font-weight:600;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;}
.bar{width:60%;height:8px;border-radius:99px;}
.tb{display:flex;gap:14px;color:#aab2bd;font-size:30px;font-weight:800;border-bottom:2px solid #eef0f3;padding-bottom:22px;}
.imgblk{height:160px;border-radius:18px;background:#eef0f3;margin-top:24px;}
</style></head>
<body>
<div class="glow"></div><div class="grain"></div>
<div class="wrap">
  <div class="top">
    ${isCover ? `<div class="mark"><svg width="40" height="40" viewBox="0 0 32 32"><path fill="#fff" d="M16 16 L28.99 8.5 A15 15 0 1 0 28.99 23.5 Z"/></svg>에이트플로</div>` : `<span class="pill">${num}</span>`}
    <div class="title">${esc(slide.title)}</div>
  </div>
  <div class="mid">${midHtml(slide)}</div>
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
      await new Promise((r) => setTimeout(r, 300));
      const buf = await page.screenshot({ type: "png" });
      out.push(Buffer.from(buf));
    }
    return out;
  } finally {
    await browser.close();
  }
}
