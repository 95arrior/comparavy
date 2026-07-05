// ★게이미피케이션 레벨(챌린지형 코어) — 수익화 사다리를 레벨로. 각 레벨은 '다음에 할 일'을 스스로 말한다(80대 원칙: 생각하지 않아도 다음이 보인다).
export interface LevelInfo {
  level: number;
  name: string;
  next: string | null;           // 다음 레벨 조건(짧게)
  recTitle: string;              // 지금 할 일(행동 제안)
  recDesc: string;
  recAction: "write" | "checkin" | "apply" | "wordpress" | "amplify" | null; // CTA 종류
}

export function computeLevel(opts: { published: number; adpostApproved: boolean; blogCount: number; hasWp: boolean }): LevelInfo {
  const { published, adpostApproved, blogCount, hasWp } = opts;
  if (hasWp && adpostApproved) return {
    level: 5, name: "자산가", next: null,
    recTitle: "두 채널을 굴리는 중이에요", recDesc: "네이버는 반응 좋은 글에 '반응 좋아요'로 후속을 잇고, 워드프레스는 자동으로 쌓여요. 이제 배합만 지키면 돼요.", recAction: "amplify",
  };
  if (adpostApproved && blogCount >= 2) return {
    level: 4, name: "확장가", next: "워드프레스를 열면 Lv.5 자산가",
    recTitle: "이제 자산을 지을 차례예요", recDesc: "네이버로 현금흐름을 만들었으니, 구글에서 오래 가는 워드프레스를 시작할 최적 시점이에요. 글은 매일 자동으로 올라가요.", recAction: "wordpress",
  };
  if (adpostApproved) return {
    level: 3, name: "수익 블로거", next: "워드프레스를 열면 Lv.5 자산가",
    recTitle: "승인 축하해요 — 다음 단계가 열렸어요", recDesc: "지금이 워드프레스(자동 발행·애드센스)를 시작할 때예요. 네이버가 크는 동안 두 번째 수익원이 자동으로 쌓여요.", recAction: "wordpress",
  };
  if (published >= 10) return {
    level: 2, name: "꾸준러", next: "애드포스트 승인을 받으면 Lv.3 수익 블로거",
    recTitle: "승인 신청이 머지않았어요", recDesc: "지금 페이스만 유지하세요 — 성과 탭에서 신청 준비가 되면 알려드려요. 매일 체크인으로 성장을 기록하면 분석이 정확해져요.", recAction: "checkin",
  };
  if (published >= 1) return {
    level: 1, name: "첫 발행", next: `10편을 발행하면 Lv.2 꾸준러 (지금 ${published}편)`,
    recTitle: "오늘도 한 편이면 충분해요", recDesc: "매일 1편 발행 + 아침 체크인 — 이 루틴 하나가 승인까지의 전부예요.", recAction: "write",
  };
  return {
    level: 0, name: "출발선", next: "첫 글을 발행하면 Lv.1",
    recTitle: "첫 글을 발행해 보세요", recDesc: "홈의 '오늘의 글'이 데이터가 고른 글감이에요 — 버튼 하나로 시작돼요.", recAction: "write",
  };
}
