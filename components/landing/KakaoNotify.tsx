import Reveal from "@/components/Reveal";

// [4] 카카오톡 알림 — 토스st: 입체 아이폰 목업(카톡 채널 채팅) + 옆 카피.
const MESSAGES = [
  { t: "오늘 블로그 쓸 시간이에요! 버튼 몇 번이면 오늘 글이 발행돼요", time: "오전 9:00" },
  { t: "어제 글을 안 쓰셨어요. 잊지 않으셨죠? 지금 발행해요", time: "오전 9:00" },
];

// 카카오톡 미니 로고(노란 사각 + 갈색 말풍선)
function KakaoMark() {
  return (
    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-[#FEE500]">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="#3A1D1D" aria-hidden>
        <path d="M12 4.5C6.8 4.5 2.6 7.8 2.6 11.8c0 2.5 1.7 4.7 4.3 6l-1 3.7 4.1-2.5c.6.1 1.3.1 2 .1 5.2 0 9.4-3.3 9.4-7.4S17.2 4.5 12 4.5z" />
      </svg>
    </span>
  );
}

export default function KakaoNotify() {
  return (
    <section className="overflow-x-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20">
        {/* 아이폰 목업 */}
        <Reveal className="flex justify-center">
          <div
            className="relative w-[262px] shrink-0 rounded-[2.7rem] bg-neutral-900 p-[10px] shadow-[0_44px_90px_-26px_rgba(20,40,90,0.45)]"
            style={{ transform: "perspective(1400px) rotateY(-13deg) rotateX(3deg)" }}
          >
            {/* 다이내믹 아일랜드 */}
            <div className="absolute left-1/2 top-[18px] z-20 h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-black" />

            <div className="overflow-hidden rounded-[2.15rem] bg-[#b2c7d9]">
              {/* 상태바 */}
              <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[11px] font-semibold text-neutral-700">
                <span>9:00</span>
                <span className="flex items-center gap-1.5">
                  <svg width="16" height="11" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="6" width="3" height="6" rx="1" /><rect x="5" y="3.5" width="3" height="8.5" rx="1" /><rect x="10" y="1" width="3" height="11" rx="1" opacity="0.35" /></svg>
                  <svg width="16" height="12" viewBox="0 0 18 14" fill="currentColor"><path d="M9 3.5c2.2 0 4.2.8 5.7 2.2l1.4-1.5A11 11 0 0 0 9 1 11 11 0 0 0 1.9 4.2l1.4 1.5A8.4 8.4 0 0 1 9 3.5z" /><path d="M9 7.5c1.1 0 2.1.4 2.8 1.1l1.4-1.5A6.4 6.4 0 0 0 9 5.5 6.4 6.4 0 0 0 4.8 7.1l1.4 1.5A4 4 0 0 1 9 7.5z" /><circle cx="9" cy="11" r="1.6" /></svg>
                  <span className="ml-0.5 flex h-[11px] w-[22px] items-center rounded-[3px] border border-neutral-600/60 px-[1.5px]"><span className="h-[6px] w-[15px] rounded-[1px] bg-neutral-700" /></span>
                </span>
              </div>

              {/* 카톡 채팅 헤더 */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2b2b2b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                <span className="flex items-center gap-1.5 text-[15px] font-bold text-neutral-800">
                  AteFlo <KakaoMark />
                </span>
                <span className="ml-auto flex items-center gap-3 text-neutral-700">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                </span>
              </div>

              {/* 채팅 영역 */}
              <div className="space-y-3.5 px-3 pb-7 pt-3">
                <div className="flex justify-center">
                  <span className="rounded-full bg-black/15 px-3 py-0.5 text-[10.5px] font-medium text-white/90">2026년 6월 19일</span>
                </div>

                {MESSAGES.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/ateflo-mark.png?v=2" alt="" aria-hidden className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="mb-1 text-[11px] text-neutral-700">AteFlo</p>
                      <div className="flex items-end gap-1">
                        <div className="rounded-2xl rounded-tl-md bg-white px-3 py-2 text-[12.5px] leading-relaxed text-neutral-800 shadow-sm">
                          {m.t}
                        </div>
                        <span className="mb-0.5 shrink-0 text-[9.5px] text-neutral-600/70">{m.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* 카피 */}
        <Reveal className="text-center lg:text-left">
          <p className="text-sm font-semibold tracking-tight text-[#1D75F7]">카카오톡 알림</p>
          <h2 className="font-pretendard mt-3 text-3xl font-bold leading-[1.2] tracking-tight sm:text-[2.5rem] sm:leading-[1.18]">
            쓸 시간을,<br />카톡으로 알려드려요
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-lg lg:mx-0">
            매일 챙기기 어려운 블로그, AteFlo가 카톡으로 콕 알려드려요.<br className="hidden sm:block" />
            버튼 몇 번이면, 오늘 글이 발행돼요.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
