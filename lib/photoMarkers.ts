// 본문 속 사진 자리 마커 '[사진: 설명]' 처리.
// - 네이버 복붙: 친절한 안내 줄로(붙여넣으면 그 자리에 사진 올리면 됨 — 네이버는 붙여넣기 이미지가 안 들어가므로).
// - 미리보기: 점선 박스 플레이스홀더로.
// - 워드프레스 발행: 이미지 안 넣은 빈 마커는 제거(literal '[사진:]'이 안 보이게).
const PHOTO_RE = /\[사진:\s*([^\]]+)\]/g;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 네이버 복붙용 — 토스톤 안내 줄. 붙여넣고 그 자리에 사진을 올린 뒤 이 줄을 지우면 된다. */
export function photoMarkerToGuide(html: string): string {
  return html.replace(PHOTO_RE, (_m, d) => `<p>📷 여기에 '${escapeHtml(String(d).trim())}' 사진을 올려주세요</p>`);
}

/** 네이버 복붙용 — 형광펜(<mark>)이 붙여넣기로 사라지므로 '굵게 + 배경색 inline'으로 변환(굵게는 100% 전달, 배경색은 살면 형광펜처럼). */
export function markToNaverBold(html: string): string {
  return html.replace(/<mark>([\s\S]*?)<\/mark>/g, '<b style="background-color:#fff3a8;">$1</b>');
}

/** 미리보기 표시용 — 점선 박스 플레이스홀더. */
export function photoMarkerToSlot(html: string): string {
  return html.replace(PHOTO_RE, (_m, d) => `<p class="ateflo-photo-slot">📷 여기에 '${escapeHtml(String(d).trim())}' 사진을 넣어보세요</p>`);
}

/** 워드프레스 발행용 — 이미지 안 넣은 빈 마커 제거(그 마커만 든 <p>도 함께 정리). */
export function stripPhotoMarkers(html: string): string {
  return html
    .replace(/<p>\s*\[사진:\s*[^\]]+\]\s*<\/p>/g, "")
    .replace(PHOTO_RE, "");
}

/** 본문에 사진 자리가 몇 개인지 + 설명 목록(발행 시트 체크리스트용). */
export function photoSlots(html: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(PHOTO_RE.source, "g");
  while ((m = re.exec(html))) out.push(String(m[1]).trim());
  return out;
}
