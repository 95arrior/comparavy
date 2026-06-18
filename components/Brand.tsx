import { SITE_NAME } from "@/lib/site";

// 새 로고 — 마크+워드마크 일체형 가로 이미지. (기존 마크+Ubuntu 텍스트 조합 대체)
// pro 프롭은 호환용으로만 남기고 무시한다(새 로고는 단일).
export default function Brand({ size = 24 }: { pro?: boolean; size?: number }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/ateflo-logo.png"
      alt={SITE_NAME}
      height={size}
      className="block w-auto"
      style={{ height: size, width: "auto" }}
    />
  );
}
