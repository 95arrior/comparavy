// ★글래스 아이콘 v2 — 박스 타일 폐지. 유저 유리 PNG의 알파를 마스크로 써서
// 아이콘 '모양 그대로' 브랜드 색 그라데이션을 입힌다(색 유리 글리프). 애플식 미니멀.

export type GlassTint = "blue" | "green" | "orange" | "violet" | "grey" | "amber" | "rose";

const GRAD: Record<GlassTint, string> = {
  blue: "linear-gradient(135deg, #4f8df9, #1D75F7)",
  green: "linear-gradient(135deg, #2fd579, #03C75A)",
  orange: "linear-gradient(135deg, #ffb056, #ff7a3d)",
  violet: "linear-gradient(135deg, #a78bfa, #7c5cf5)",
  grey: "linear-gradient(135deg, #a9b4c2, #7e8896)",
  amber: "linear-gradient(135deg, #ffc94d, #f09a1f)",
  rose: "linear-gradient(135deg, #ff8fa5, #f4587a)",
};

export default function GlassIcon({
  name,
  tint = "blue",
  size = 24,
  className = "",
}: {
  /** public/icons/glass/{name}.png */
  name: string;
  tint?: GlassTint;
  /** 글리프 박스 한 변(px) */
  size?: number;
  /** (구버전 호환 — 무시) */
  icon?: number;
  radius?: number;
  className?: string;
}) {
  const url = `url(/icons/glass/${name}.png)`;
  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        background: GRAD[tint],
      }}
      aria-hidden
    />
  );
}

/* eslint-disable @next/next/no-img-element */
/** 흰 유리 원본 그대로 (이미 톤 있는 배경 위 — 파란 CTA 버튼 안 등) */
export function GlassGlyph({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return <img src={`/icons/glass/${name}.png`} width={size} height={size} alt="" draggable={false} className={`inline-block shrink-0 ${className}`} aria-hidden />;
}
