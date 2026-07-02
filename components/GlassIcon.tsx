/* eslint-disable @next/next/no-img-element */
// ★글래스 아이콘 — 순백 반투명 유리 PNG(public/icons/glass/*)를 '색 그라데이션 타일' 위에 얹는다.
// 애플 설정 앱 문법: 흰 유리는 톤 있는 타일 위에서만 산다. 타일 색으로 의미를 구분.

export type GlassTint = "blue" | "green" | "orange" | "violet" | "grey" | "amber" | "rose";

const TILE: Record<GlassTint, string> = {
  blue: "linear-gradient(135deg, #5b9bff, #1D75F7)",
  green: "linear-gradient(135deg, #35d97e, #03C75A)",
  orange: "linear-gradient(135deg, #ffb056, #ff7a3d)",
  violet: "linear-gradient(135deg, #a78bfa, #7c5cf5)",
  grey: "linear-gradient(135deg, #b7c2d0, #8b95a1)",
  amber: "linear-gradient(135deg, #ffd166, #f5a623)",
  rose: "linear-gradient(135deg, #ff9db0, #f4587a)",
};

export default function GlassIcon({
  name,
  tint = "blue",
  size = 36,
  icon = 0.62,
  radius,
  className = "",
}: {
  /** public/icons/glass/{name}.png */
  name: string;
  tint?: GlassTint;
  /** 타일 한 변(px) */
  size?: number;
  /** 아이콘이 타일에서 차지하는 비율 */
  icon?: number;
  radius?: number;
  className?: string;
}) {
  const r = radius ?? Math.round(size * 0.3);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: TILE[tint],
        boxShadow: "0 4px 12px -4px rgba(30,50,90,0.35), inset 0 1px 0 rgba(255,255,255,0.45)",
      }}
      aria-hidden
    >
      <img src={`/icons/glass/${name}.png`} width={Math.round(size * icon)} height={Math.round(size * icon)} alt="" draggable={false} />
    </span>
  );
}

/** 타일 없이 흰 유리 아이콘만 (이미 톤 있는 배경 위에서 사용 — 예: 파란 CTA 버튼 안) */
export function GlassGlyph({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return <img src={`/icons/glass/${name}.png`} width={size} height={size} alt="" draggable={false} className={`inline-block shrink-0 ${className}`} aria-hidden />;
}
