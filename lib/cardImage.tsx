import { ImageResponse } from "next/og";
import type { CardSlide } from "./cardNews";

const BRAND = "#191F28";
const ACCENT = "#3f91ff";

// 슬라이드 텍스트에 필요한 글자만 구글폰트에서 서브셋으로 받아온다(가볍고 빠름).
async function loadFont(text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } })).text();
  const m = css.match(/src:\s*url\(([^)]+)\)/);
  if (!m) throw new Error("폰트 로드 실패");
  return (await fetch(m[1]).then((r) => r.arrayBuffer()));
}

/** 슬라이드 1장을 1080x1080 PNG로 렌더. (지금은 단순 템플릿 — 나중에 디자인 교체) */
export async function renderSlide(slide: CardSlide, index: number, total: number): Promise<Buffer> {
  const isCover = index === 0;
  const text = `${slide.title}${slide.body}에이트플로${index + 1}/${total}0123456789`;
  const font = await loadFont(text);

  const img = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 88,
          fontFamily: "NotoKR",
          background: isCover ? BRAND : "#ffffff",
          color: isCover ? "#ffffff" : BRAND,
        }}
      >
        {isCover && <div style={{ fontSize: 30, color: ACCENT, marginBottom: 20 }}>에이트플로</div>}
        <div style={{ fontSize: isCover ? 76 : 60, fontWeight: 700, lineHeight: 1.18 }}>{slide.title}</div>
        {slide.body ? (
          <div style={{ marginTop: 30, fontSize: 36, lineHeight: 1.45, color: isCover ? "rgba(255,255,255,0.82)" : "#4b5563" }}>{slide.body}</div>
        ) : null}
        <div
          style={{
            position: "absolute",
            bottom: 70,
            left: 88,
            right: 88,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 26,
            color: isCover ? "rgba(255,255,255,0.5)" : "#9ca3af",
          }}
        >
          <span>에이트플로</span>
          <span>{index + 1} / {total}</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [{ name: "NotoKR", data: font, weight: 700, style: "normal" }],
    },
  );
  return Buffer.from(await img.arrayBuffer());
}
