// AteFlo 로고 = 입(웨지)이 달린 원. 생성/로딩 중에 입을 벌렸다 씹었다(88%↔100%) 반복.
// 무료: #3f91ff 단색 / 프로: 무지개색이 요동(hue 회전).
export default function AteFloLogo({
  pro = false,
  animated = true,
  size = 20,
  className = "",
}: {
  pro?: boolean;
  animated?: boolean;
  size?: number;
  className?: string;
}) {
  const cls = [
    "ateflo-logo",
    animated && "ateflo-logo--anim",
    animated && pro && "ateflo-logo--pro",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} style={{ width: size, height: size }} role="img" aria-label="AteFlo" />
  );
}
