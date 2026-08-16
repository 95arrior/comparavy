// 인트로 애니메이션 제거 — 즉시 통과(아무것도 렌더하지 않음).
// 호출부(app/page.tsx, WaitlistLanding) 호환 위해 컴포넌트 시그니처만 유지.
export default function LandingIntro(_props: { skip?: boolean }) {
  return null;
}
