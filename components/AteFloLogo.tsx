// AteFlo 마크 — 새 로고(정적 이미지). 기존 무지개/씹는 애니메이션 제거.
// pro·animated 프롭은 호환용으로만 남기고 무시한다(새 로고는 단일·정적).
export default function AteFloLogo({
  size = 20,
  className = "",
}: {
  pro?: boolean;
  animated?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/ateflo-mark.png"
      alt="AteFlo"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
