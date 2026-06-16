import type { Metadata } from "next";
import StartLanding from "@/components/StartLanding";

// 검증용 별도 랜딩 — 광고(인스타/스레드) 유입 대상. 홈(ateflo.com 제품)과 독립.
// 색인은 막아 본 제품과 경쟁/중복되지 않게 한다(검증 목적).
export const metadata: Metadata = {
  title: "AteFlo — 워드프레스 블로그, 버튼 몇 번이면 시작",
  description: "개설부터 글쓰기, 애드센스 수익화까지. 처음이라도 막히는 데 없이.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function StartPage() {
  return <StartLanding />;
}
