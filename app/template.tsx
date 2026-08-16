"use client";

// 페이지 이동마다 다시 마운트되어 좌→우 진입 애니메이션을 준다.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="ateflo-page-in">{children}</div>;
}
