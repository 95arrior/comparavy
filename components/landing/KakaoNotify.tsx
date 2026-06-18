import Reveal from "@/components/Reveal";

// [4] 카카오톡 알림 — 가볍게: 프레임 없이 알림 카드만(토스st). 부가 기능이라 산뜻하게.
const MESSAGES = [
  "오늘 블로그 쓸 시간이에요! 버튼 몇 번이면 발행 끝",
  "어제 글을 안 쓰셨어요. 지금 발행해요",
];

// 카카오톡 미니 로고(노란 사각 + 갈색 말풍선)
function KakaoMark() {
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-[#FEE500]">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="#3A1D1D" aria-hidden>
        <path d="M12 4.5C6.8 4.5 2.6 7.8 2.6 11.8c0 2.5 1.7 4.7 4.3 6l-1 3.7 4.1-2.5c.6.1 1.3.1 2 .1 5.2 0 9.4-3.3 9.4-7.4S17.2 4.5 12 4.5z" />
      </svg>
    </span>
  );
}

function NotifCard({ msg }: { msg: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_14px_34px_-16px_rgba(20,40,90,0.22)] ring-1 ring-black/[0.04]">
      <div className="mb-2.5 flex items-center gap-1.5">
        <KakaoMark />
        <span className="text-[11px] font-medium text-neutral-400">카카오톡 · 지금</span>
      </div>
      <div className="flex gap-2.5">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-[#1D75F7]/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ateflo-mark.png?v=2" alt="" aria-hidden className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-800">AteFlo</p>
          <p className="mt-0.5 text-sm leading-relaxed text-neutral-600">{msg}</p>
        </div>
      </div>
    </div>
  );
}

export default function KakaoNotify() {
  return (
    <section className="overflow-x-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20">
        {/* 알림 카드 */}
        <div className="mx-auto w-full max-w-sm space-y-3 lg:mx-0">
          {MESSAGES.map((m, i) => (
            <Reveal key={i} delay={i * 120}>
              <NotifCard msg={m} />
            </Reveal>
          ))}
        </div>

        {/* 카피 */}
        <Reveal className="text-center lg:text-left">
          <p className="text-sm font-semibold tracking-tight text-[#1D75F7]">카카오톡 알림</p>
          <h2 className="font-pretendard mt-3 text-3xl font-bold leading-[1.2] tracking-tight sm:text-[2.5rem] sm:leading-[1.18]">
            쓸 시간을,<br />카톡으로 알려드려요
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-neutral-500 sm:text-lg lg:mx-0">
            매일 챙기기 어려운 블로그,<br className="hidden sm:block" />
            카톡으로 콕 알려드려요.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
