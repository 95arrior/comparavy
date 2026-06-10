import { ImageResponse } from "next/og";
import type { CardSlide } from "./cardNews";

const INK = "#191F28";
const BLUE = "#3f91ff";
const PILL = "#ffd23a"; // 포인트(노랑) — 페이지 번호 알약

// 슬라이드 텍스트에 필요한 글자만 구글폰트(고딕 A1)에서 서브셋으로 — 가볍고 한글 안정적.
async function loadWeight(weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Gothic+A1:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } })).text();
  const m = css.match(/src:\s*url\(([^)]+)\)/);
  if (!m) throw new Error("폰트 로드 실패");
  return fetch(m[1]).then((r) => r.arrayBuffer());
}

/** 슬라이드 1장을 1080x1080 PNG로. (base44식: 솔리드 배경 + 번호 알약 + 굵은 헤드라인 + 설명) */
export async function renderSlide(slide: CardSlide, index: number, total: number): Promise<Buffer> {
  const bg = index % 2 === 0 ? INK : BLUE;
  const num = String(index + 1).padStart(2, "0");
  const text = `${slide.title}${slide.body}에이트플로${num}/${String(total).padStart(2, "0")}0123456789`;
  const [body, head] = await Promise.all([loadWeight(500, text), loadWeight(800, text)]);

  const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 90,
          background: bg,
          color: "#ffffff",
          fontFamily: "GothicA1",
        }}
      >
        {/* 상단: 번호 알약 + 헤드라인 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            <span style={{ background: PILL, color: INK, fontWeight: 800, fontSize: 34, padding: "8px 22px", borderRadius: 999 }}>{num}</span>
          </div>
          <div style={{ marginTop: 34, fontSize: 78, fontWeight: 800, lineHeight: 1.14, letterSpacing: "-0.02em" }}>{slide.title}</div>
        </div>

        {/* 하단: 설명 + 브랜드 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {slide.body ? <div style={{ fontSize: 38, fontWeight: 500, lineHeight: 1.45, color: "rgba(255,255,255,0.86)" }}>{slide.body}</div> : null}
          <div style={{ marginTop: 36, display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>
            <span>에이트플로</span>
            <span>{num} / {String(total).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: "GothicA1", data: body, weight: 500, style: "normal" },
        { name: "GothicA1", data: head, weight: 800, style: "normal" },
      ],
    },
  );
  return Buffer.from(await img.arrayBuffer());
}
