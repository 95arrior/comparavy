import WaitlistForm from "@/components/WaitlistForm";

const BRAND = "#3182F6";

/**
 * 토스식 히어로 — 거창함 없이 "뭘 하는 서비스인지" 3초 안에.
 * 진짜 제품 화면(키워드 → 글 → 발행)이 한 프레임에서 자동으로 돌아감(CSS 루프, 동기화 4s).
 * 추상 모션·다크 연출 없음. 화이트+블루 신뢰톤.
 */
export default function HeroProduct() {
  return (
    <section className="hero-aurora relative overflow-hidden">
      <div className="relative z-10 mx-auto max-w-md px-5 pb-16 pt-14 text-center sm:max-w-xl sm:pb-20 sm:pt-16">
        <p className="mono-rise inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND }} /> 곧 오픈 · 사전 신청 받는 중
        </p>
        <h1
          className="font-pretendard mono-rise mono-d1 mt-5 font-bold tracking-tight"
          style={{ fontSize: "clamp(28px, 7vw, 50px)", lineHeight: 1.25, wordBreak: "keep-all" }}
        >
          키워드만 넣으면,<br />발행까지 끝.
        </h1>
        <p
          className="mono-rise mono-d2 mx-auto mt-5 max-w-md text-neutral-500"
          style={{ fontSize: "clamp(15px, 4vw, 18px)", lineHeight: 1.6, wordBreak: "keep-all" }}
        >
          주제 찾기부터 글쓰기·발행까지,<br />알아서 굴러가는 블로그.
        </p>

        {/* 진짜 제품 화면 — 키워드 → 글 → 발행 (한눈에) */}
        <div className="mono-rise mono-d3 mx-auto mt-10 max-w-sm">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-[0_18px_50px_-20px_rgba(49,130,246,0.35)]">
            <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
            </div>
            <div className="p-5">
              {/* 1) 키워드 + 글 생성 */}
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">강아지가 슬리퍼만 물어뜯는 이유 🐶</span>
                <span className="mock-gen-press inline-block shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: BRAND }}>글 생성</span>
              </div>
              {/* 2) 글이 써짐 */}
              <div className="mt-4 space-y-2.5">
                <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "100%", animationDelay: "0.15s" }} />
                <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "94%", animationDelay: "0.4s" }} />
                <div className="mock-gen-bar h-2 rounded-full bg-neutral-200" style={{ width: "70%", animationDelay: "0.65s" }} />
              </div>
              {/* 3) 발행됨 */}
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5">
                <span className="mock-reveal flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-sm font-medium text-emerald-800">우리집댕댕이.com 에 발행됐어요</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-neutral-400">키워드 하나 넣으면 여기까지, 자동으로.</p>
        </div>

        {/* 사전 신청 */}
        <div className="mono-rise mono-d4 mt-10">
          <WaitlistForm source="hero" />
        </div>
        <a href="#more" className="mono-rise mono-d5 mt-7 inline-block text-sm text-neutral-400 transition hover:text-neutral-600">
          어떻게 되는지 볼게요 ↓
        </a>
      </div>
    </section>
  );
}
