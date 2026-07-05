// ★게이미피케이션 레벨 v0(유저 방향: 챌린지형) — 수익화 사다리를 레벨 뼈대로. 껍데기 확장(연출·해금)은 추후.
export interface LevelInfo { level: number; name: string; next: string | null }

export function computeLevel(opts: { published: number; adpostApproved: boolean; blogCount: number; hasWp: boolean }): LevelInfo {
  const { published, adpostApproved, blogCount, hasWp } = opts;
  // 위에서부터 평가 — 달성한 최고 레벨
  if (hasWp && adpostApproved) return { level: 5, name: "자산가", next: null };
  if (blogCount >= 2 && adpostApproved) return { level: 4, name: "확장가", next: "워드프레스를 열면 Lv.5 자산가" };
  if (adpostApproved) return { level: 3, name: "수익 블로거", next: "블로그를 하나 더 키우면 Lv.4 확장가" };
  if (published >= 10) return { level: 2, name: "꾸준러", next: "애드포스트 승인을 받으면 Lv.3 수익 블로거" };
  if (published >= 1) return { level: 1, name: "첫 발행", next: `10편을 발행하면 Lv.2 꾸준러 (지금 ${published}편)` };
  return { level: 0, name: "출발선", next: "첫 글을 발행하면 Lv.1" };
}
