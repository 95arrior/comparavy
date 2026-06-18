import { SITE_NAME } from "@/lib/site";

// 새 로고 — 마크+워드마크 일체형 가로 이미지.
// light=true 면 어두운 배경용 흰색 워드마크. pro 프롭은 호환용(무시).
export default function Brand({ size = 22, light = false }: { pro?: boolean; size?: number; light?: boolean }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={light ? "/ateflo-logo-white.png?v=2" : "/ateflo-logo.png?v=2"}
      alt={SITE_NAME}
      height={size}
      className="block w-auto max-w-full shrink-0"
      style={{ height: size, width: "auto", maxWidth: "100%" }}
    />
  );
}
