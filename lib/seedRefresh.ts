// ★새 글감(트렌드 씨앗) 갱신 시각 — trend-refresh 크론(0 */6 UTC = KST 03·09·15·21)과 정합.
//  교체 한도 도달 시 '다음 갱신까지 카운트다운'으로 안내(부드럽게, 이모지 금지).
const KST_REFRESH_HOURS = [3, 9, 15, 21]; // KST 기준 크론 실행 시각

export function nextSeedRefresh(now: Date = new Date()): { hour: number; hoursUntil: number } {
  const kstMs = now.getTime() + 9 * 3600_000;
  const kst = new Date(kstMs);
  const h = kst.getUTCHours() + kst.getUTCMinutes() / 60;
  let target = KST_REFRESH_HOURS.find((x) => x > h);
  let addDay = false;
  if (target === undefined) { target = KST_REFRESH_HOURS[0]; addDay = true; }
  const hoursUntil = Math.max(1, Math.ceil(target + (addDay ? 24 : 0) - h));
  return { hour: target, hoursUntil };
}

export function nextSeedRefreshLabel(now: Date = new Date()): string {
  const { hour, hoursUntil } = nextSeedRefresh(now);
  const ampm = hour < 12 ? "오전" : "오후";
  const disp = hour <= 12 ? hour : hour - 12;
  return `새 글감은 ${ampm} ${disp}시에 와요 (약 ${hoursUntil}시간 후)`;
}
