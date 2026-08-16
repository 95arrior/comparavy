"use client";

// ★안심·꿀팁 한 줄(유저 요청: "응원이 되네요") — 날짜 시드로 하루 하나씩 회전. 보장·과장 금지(정직 원칙).
const LINES = [
  { t: "조급해하지 마세요", s: "블로그는 복리예요. 지금 쌓는 글이 블로그 지수가 돼서, 보통 4~8주부터 노출이 늘어요." },
  { t: "오늘 글이 내일의 자리", s: "검색 상위는 선점 게임이에요. 그 검색어의 첫 완결 글이 오래 자리를 지켜요." },
  { t: "초반 방문 0은 정상이에요", s: "새 블로그는 색인까지 1~2주가 보통이에요. 그동안 쌓은 글이 한꺼번에 걸리기 시작해요." },
  { t: "이웃 첫 반응이 부스터", s: "발행 후 첫 공감·댓글이 노출 테스트를 통과시켜요. 초기엔 이웃 미션이 큰 차이를 만들어요." },
  { t: "성장은 계단식이에요", s: "매일 비슷하다가 어느 날 툭 오르는 게 정상이에요. 계단은 보통 글 30편, 3개월에 몰려 있어요." },
  { t: "많이 쓴 사람이 이겨요", s: "상위 블로거의 공통점은 재능이 아니라 발행 수예요. 오늘 한 편이 통계적으로 가장 확실한 전략이에요." },
  { t: "체류시간이 품질 신호", s: "끝까지 읽히는 완결 글이 다음 노출을 부르는 구조예요. 우리가 답 먼저·완결형으로 쓰는 이유예요." },
];

export default function ReassureLine({ className = "" }: { className?: string }) {
  const d = new Date();
  const idx = (d.getFullYear() * 366 + (d.getMonth() + 1) * 31 + d.getDate()) % LINES.length;
  const line = LINES[idx];
  return (
    <div className={`rounded-[16px] bg-[#1D75F7]/[0.05] px-5 py-4 ${className}`}>
      <p className="text-[13px] font-bold text-[#1D75F7]">{line.t}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">{line.s}</p>
    </div>
  );
}
