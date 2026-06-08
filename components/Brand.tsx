import AteFloLogo from "./AteFloLogo";
import { SITE_NAME } from "@/lib/site";
import { Ubuntu } from "next/font/google";

const ubuntu = Ubuntu({ subsets: ["latin"], weight: "700", display: "swap" });

// 사이드바와 동일한 브랜드 표기 — 로고 + Ubuntu 볼드 "AteFlo". 기본은 무료(파랑) 로고.
export default function Brand({ pro = false, size = 22 }: { pro?: boolean; size?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <AteFloLogo size={size} pro={pro} className="shrink-0" />
      <span className={`${ubuntu.className} text-lg font-bold leading-none tracking-tight text-neutral-900`}>{SITE_NAME}</span>
    </span>
  );
}
