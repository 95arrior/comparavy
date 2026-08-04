// ★썸네일 클릭 훅 — 세 경로(문구 일러스트·무문구·본문 삽화)가 같은 판정을 쓰도록 독립 모듈로 둔다.
//  ★한 곳에만 넣으면 다른 경로가 옛 규칙으로 남는다(2026-08-05에 이미 겪었다 — 고친 함수가 안 불리는 함수였다).
// ★클릭 훅 연출(2026-08-05 유저 확정 — 종전 emotionOf는 정의만 되고 아무 데서도 안 쓰였다).
//  유저 지시: "키워드에 맞는 일러스트가 나오면 안 된다. 글 유형에 따라 결핍이면 결핍, 포모면 포모,
//   호기심 증폭 — 지나가면 '아 왜 안 눌렀지' 하고 되찾는 썸네일이어야 한다."
//  ★핵심 원칙(제목의 '열린 고리'와 짝): 답을 그리지 마라 — 답 '직전'을 그려라.
//   다 끝난 장면은 궁금할 게 없다. 그래서 종전의 '결과를 그려라(완료된 체크리스트·여유로운 커피)'는
//   이득·해결 유형에만 남기고, 결핍·포모·호기심에는 정반대 연출(결여·닫히는 중·가려짐)을 준다.
export type ThumbHook = "lack" | "closing" | "hidden" | "gain" | "fork";
export function thumbHookOf(text: string): ThumbHook {
  const t = String(text || "");
  if (/(마감|마지막|오늘까지|이번\s?주까지|끝나|종료|소멸|늦으면|서둘|선착순|남은|곧|D-|기한)/.test(t)) return "closing";
  if (/(나만|다들|남들|못 받|안 받|놓치|모르고|빠뜨|제외|탈락|거부|없는|부족|새는|줄어|손해|빼앗)/.test(t)) return "lack";
  if (/(비교|차이|vs|VS|뭐가|어디가|어느|선택|고르|나을까|갈린|둘 중)/.test(t)) return "fork";
  if (/(받는|받을|환급|혜택|지원|아끼|절약|무료|추가|더 준|올랐|커진|생긴|얼마)/.test(t)) return "gain";
  return "hidden"; // 기본은 호기심 — 답을 감추는 쪽이 늘 안전하다
}
export const HOOK_DIRECTION: Record<ThumbHook, string> = {
  lack: "HOOK = LACK (결핍 — '나만 없다'). Draw an ABSENCE that is visibly felt: one empty slot in a row of full ones, an envelope that is flat while others bulge, a hand reaching where nothing is left, one chair pulled out and empty at a full table. The viewer must feel 'wait — is mine the empty one?'. NEVER draw the thing being received; draw its missing shape.",
  closing: "HOOK = CLOSING WINDOW (포모 — '지금 아니면'). Draw something in the ACT of closing/ending, mid-motion, not yet gone: a door almost shut with light still spilling, an ice cube nearly melted, the last piece being lifted away, a bus already pulling out with its door half open. Motion must be caught at the last possible instant — urgency without alarm.",
  hidden: "HOOK = HIDDEN ANSWER (호기심 — 답 감추기). Draw the moment JUST BEFORE the reveal: a lid lifting a crack with light escaping, a curtain caught mid-pull, a drawer half open with the contents unreadable, an envelope with the flap raised but its paper still inside. The answer must be present but NOT visible — the eye should strain to see what's inside. This is the strongest hook: never resolve it.",
  gain: "HOOK = UNEXPECTED GAIN (이득 — '이만큼이나?'). Draw a SCALE SURPRISE: something small producing something absurdly larger than expected, a lifted rug corner revealing more than fits, a container overflowing past its own size. The surprise is in the proportion, not in coins or bills.",
  fork: "HOOK = FORK (선택 — '어느 쪽이 나지?'). Draw two paths/objects at the split moment with the choice UNRESOLVED — a balance scale still tipping, two doors identical but one warmer, footsteps stopping exactly at the split. Never show which one wins.",
};

