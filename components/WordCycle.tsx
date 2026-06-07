"use client";

import { useEffect, useState } from "react";

const WORDS = ["뻔합니다.", "다 비슷합니다.", "AI 티가 납니다.", "금방 묻힙니다."];

export default function WordCycle() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % WORDS.length);
        setVisible(true);
      }, 280);
      return () => clearTimeout(swap);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-block bg-gradient-to-r from-neutral-900 to-neutral-500 bg-clip-text text-transparent transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {WORDS[index]}
    </span>
  );
}
