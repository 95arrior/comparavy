// [species-c] 라운드1 C-2 디자인 토큰 — 이 6색·3단 위계 외 사용 금지. 승인 전까지 본문 파이프라인 미연결.
export const T = {
  W: 1200,
  H: 900,
  margin: 64, // 외곽 여백
  gap: 48, // 섹션 간
  color: {
    bg: "#F7F1E3",
    ink: "#211A16",
    red: "#C43D2B",
    green: "#2E6B4F",
    blue: "#2B4C9B",
    line: "#D9CFBB",
  },
  // 타이포 3단(캔버스 900 기준): 디스플레이 ≥ 135(15%), 타이틀 44~52, 본문 30~34
  font: { display: 150, title: 48, body: 32, caption: 22 },
  bar: { h: 44, w: 560 }, // 가로 막대(비율 시각화) — 최소 높이 40 이상
};
