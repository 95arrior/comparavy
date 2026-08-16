"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ITEMS = [
  { id: "how", label: "사용법" },
  { id: "features", label: "기능" },
  { id: "pricing", label: "요금" },
];

// 스크롤하며 보고 있는 섹션을 상단 메뉴에 표시 (scrollspy)
export default function LandingNav() {
  const [active, setActive] = useState("");

  useEffect(() => {
    const sections = ITEMS.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.2, 0.5, 1] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <nav className="hidden items-center gap-8 text-sm md:flex">
      {ITEMS.map((it) => (
        <Link
          key={it.id}
          href={`#${it.id}`}
          className={`transition ${active === it.id ? "font-medium text-neutral-900" : "text-neutral-500 hover:text-neutral-900"}`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
