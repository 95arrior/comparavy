"use client";

import { useEffect, useRef, useState } from "react";

// ★칩 툴팁 — 처음 쓰는 사람도 칩 의미를 바로 알게(실측: '애드포스트 칩 뭐야' 2회).
//  데스크톱=호버, 모바일=탭 토글(바깥 탭으로 닫힘). 부모 카드 탭과 충돌하지 않게 전파 차단.
export const CHIP_TIPS: Record<string, string> = {
  "지금 뜨는 키워드": "검색이 갑자기 늘고 있는 주제예요. 경쟁 글이 쌓이기 전에 먼저 쓰면 검색 상위를 선점할 수 있어요.",
  "꾸준한 수요": "매달 꾸준히 검색되는 주제예요. 한 번 상위에 잡히면 방문자가 오래 들어와요.",
  "단가 높음": "광고주들이 비싸게 입찰하는 키워드예요. 같은 방문자 수라도 광고 수익이 더 높게 나올 수 있어요.",
  "커미션 기회": "상품 리뷰·비교형 글감이에요. 나중에 쇼핑커넥트 링크를 달면 광고 수익에 더해 판매 커미션까지 받을 수 있어요.",
  "반응 후속": "반응이 좋았던 내 글의 이어지는 글감이에요. 관심이 살아 있을 때 이어 쓰면 효과가 커져요.",
  "홈판 배팅": "검색이 아니라 네이버 홈피드(홈판) 확산을 노리는 글감이에요. 반응(공감·저장)이 좋으면 방문자 상한 없이 터질 수 있어요. 하루 1장, 출퇴근·점심·밤 시간대 발행이 유리해요.",
  "경쟁 낮음": "이 키워드로 쓰인 글이 적은 편이에요. 새 블로그도 검색 상위에 오를 확률이 높아요.",
  "경쟁 보통": "경쟁 글이 어느 정도 있는 키워드예요. 완결성 있게 쓰면 충분히 승산이 있어요.",
  "경쟁 높음": "이미 글이 많은 키워드예요. 각도를 다르게 잡은 글이 필요해요.",
};
export function tipFor(label: string): string | undefined {
  if (/^시리즈/.test(label)) return "여러 편으로 이어지는 시리즈 글감이에요. 전편을 읽은 방문자가 다음 편으로 넘어와 블로그 체류가 늘어나요.";
  return CHIP_TIPS[label];
}

export default function TipChip({ tip, className, children }: { tip?: string; className: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  if (!tip) return <span className={className}>{children}</span>;
  return (
    <span ref={ref} className="relative inline-flex">
      <button type="button" aria-label={`${typeof children === "string" ? children : "칩"} 설명`}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        className={className}>{children}</button>
      {open && (
        <span className="ateflo-fade-in absolute left-0 top-full z-[75] mt-1.5 w-60 rounded-[12px] bg-neutral-900/95 px-3.5 py-2.5 text-left text-[12px] font-medium leading-relaxed text-white shadow-xl">
          {tip}
        </span>
      )}
    </span>
  );
}
