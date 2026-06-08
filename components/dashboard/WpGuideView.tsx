"use client";

import Reveal from "@/components/Reveal";

const BRAND = "#3f91ff";

type Step = {
  title: string;
  lines: string[];
  tip?: string;
};

const STEPS: Step[] = [
  {
    title: "워드프레스 호스팅에 가입하기",
    lines: [
      "‘워드프레스를 자동으로 설치해 주는’ 호스팅 한 곳에 가입해요.",
      "처음이라면 한국어로 된 ‘카페24 워드프레스 호스팅’이 편해요. (검색창에 ‘카페24 워드프레스 호스팅’ 검색 → 신청)",
      "요금은 보통 한 달 몇천 원대예요. 카드로 결제하면 끝이에요.",
    ],
    tip: "꼭 카페24가 아니어도 돼요. ‘원클릭(자동) 워드프레스 설치’만 된다면 어디든 괜찮아요.",
  },
  {
    title: "워드프레스 자동 설치 누르기",
    lines: [
      "가입한 호스팅의 ‘나의 서비스 관리’ 화면에 들어가요.",
      "거기서 ‘워드프레스 설치’ 또는 ‘원클릭 설치’ 버튼을 누르면 자동으로 깔려요.",
      "설치할 때 만드는 ‘관리자 아이디’와 ‘비밀번호’를 종이에 꼭 적어두세요. 다음 단계에서 써요.",
    ],
    tip: "이 아이디·비밀번호가 곧 내 블로그(워드프레스)에 들어가는 열쇠예요. 잃어버리지 마세요.",
  },
  {
    title: "내 블로그 관리자 화면에 들어가기",
    lines: [
      "인터넷 주소창에 ‘내 사이트 주소’ 뒤에 ‘/wp-admin’을 붙여 들어가요.",
      "예: 내 주소가 myblog.com 이면 → 주소창에 myblog.com/wp-admin 입력.",
      "방금 2단계에서 적어둔 아이디·비밀번호로 로그인하면, 까만 왼쪽 메뉴가 있는 관리자 화면이 나와요.",
    ],
  },
  {
    title: "‘앱 비밀번호’ 만들기 (제일 중요!)",
    lines: [
      "왼쪽 까만 메뉴에서 **‘사용자(Users)’**를 누르고, 그 안의 **‘프로필(Profile)’**을 눌러요.",
      "화면을 아래로 쭉 내리면 맨 아래쯤 **‘애플리케이션 비밀번호(Application Passwords)’** 칸이 나와요.",
      "빈칸에 이름으로 ‘AteFlo’라고 적고 옆의 **‘새 애플리케이션 비밀번호 추가’** 버튼을 눌러요.",
      "그러면 ‘xxxx xxxx xxxx ...’ 처럼 띄어쓰기가 있는 비밀번호가 한 줄 나와요. 그걸 **그대로(띄어쓰기 포함) 복사**하세요.",
    ],
    tip: "이건 로그인 비밀번호와 다른, ‘연결 전용’ 비밀번호예요. 화면을 닫으면 다시 못 보니 꼭 복사해 두세요.",
  },
  {
    title: "AteFlo에 연결하기",
    lines: [
      "다시 AteFlo로 돌아와 ‘워드프레스’ 메뉴의 연결 화면을 열어요.",
      "① 사이트 주소(예: https://myblog.com) ② 사용자명(2단계에서 만든 관리자 아이디) ③ 방금 복사한 앱 비밀번호 — 세 칸을 채워요.",
      "‘사이트 연결하기’를 누르면 초록불이 켜지면서 연결 완료! 이제 글을 쓰고 버튼 하나로 발행할 수 있어요.",
    ],
  },
];

export default function WpGuideView({ onBack, onGoConnect }: { onBack: () => void; onGoConnect: () => void }) {
  return (
    <div className="ateflo-page-in">
      {/* 상단바 */}
      <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
            <span className="text-base leading-none">←</span> 돌아가기
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <Reveal>
          <p className="text-sm font-semibold tracking-tight" style={{ color: BRAND }}>워드프레스 5분 시작 가이드</p>
          <h1 className="mt-3 text-3xl font-bold leading-[1.2] tracking-tight sm:text-4xl">
            워드프레스가 처음이어도<br />5단계면 끝나요.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-500">
            천천히 하나씩만 따라 하면 돼요. 어려운 말은 다 풀어서 적었어요.
          </p>
        </Reveal>

        <div className="mt-12 space-y-8">
          {STEPS.map((step, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold text-white" style={{ background: BRAND }}>
                    {i + 1}
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight">{step.title}</h2>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {step.lines.map((line, j) => (
                    <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                      <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<b class="text-neutral-900">$1</b>') }} />
                    </li>
                  ))}
                </ul>
                {step.tip && (
                  <p className="mt-4 rounded-xl bg-[#3f91ff]/5 px-4 py-3 text-sm leading-relaxed text-neutral-600">
                    💡 {step.tip}
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-12">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center">
            <p className="text-base font-semibold tracking-tight">준비됐어요. 이제 연결만 하면 끝!</p>
            <p className="mt-1.5 text-sm text-neutral-500">앱 비밀번호를 복사했다면, 연결 화면으로 가서 붙여넣으세요.</p>
            <button
              onClick={onGoConnect}
              className="mt-5 inline-block rounded-full px-6 py-3 text-sm font-medium text-white transition"
              style={{ background: BRAND }}
            >
              워드프레스 연결하러 가기 →
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
