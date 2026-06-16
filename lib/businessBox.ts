// 업체 정보 NAP 박스 — 생성된 글 하단에 자동 삽입할 깔끔한 HTML을 만든다.
// 데이터가 하나도 없으면 빈 문자열(박스 미삽입) → general 등 미입력 블로그엔 영향 0.
// 본문과 톤을 맞춰 h2/ul/li만 사용(인라인 스타일·script 없음 → 워드프레스 테마 안전).
import { DAY_KEYS, DAY_LABELS, type WeeklyHours, type DayKey } from "./blogProfile";

export interface BusinessInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  hours?: string | null; // 레거시 자유입력(fallback)
  hoursJson?: WeeklyHours | null; // 요일별 구조화(우선)
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 요일별 구조 → "월–금 09:00–18:00 (점심 13:00–14:00)" 식 라인들. 연속된 같은 시간 요일은 묶는다.
function hoursLines(h: WeeklyHours): string[] {
  type E = { day: DayKey; sig: string; text: string };
  const entries: E[] = [];
  for (const day of DAY_KEYS) {
    const d = h[day];
    if (!d) continue; // 미설정 요일은 건너뜀
    if (d.closed) {
      entries.push({ day, sig: "closed", text: "휴무" });
    } else if (d.open && d.close) {
      const br = d.breakStart && d.breakEnd ? ` (점심 ${d.breakStart}–${d.breakEnd})` : "";
      entries.push({ day, sig: `${d.open}-${d.close}${br}`, text: `${d.open}–${d.close}${br}` });
    }
  }
  const lines: string[] = [];
  let i = 0;
  while (i < entries.length) {
    let j = i;
    // 연속(요일 순서상 바로 다음)이면서 같은 sig면 묶음
    while (
      j + 1 < entries.length &&
      entries[j + 1].sig === entries[i].sig &&
      DAY_KEYS.indexOf(entries[j + 1].day) === DAY_KEYS.indexOf(entries[j].day) + 1
    ) {
      j++;
    }
    const label = i === j ? DAY_LABELS[entries[i].day] : `${DAY_LABELS[entries[i].day]}–${DAY_LABELS[entries[j].day]}`;
    lines.push(`${label} ${entries[i].text}`);
    i = j + 1;
  }
  return lines;
}

export function buildBusinessBox(b: BusinessInfo): string {
  const name = (b.name ?? "").trim();
  const address = (b.address ?? "").trim();
  const phone = (b.phone ?? "").trim();
  const hoursText = (b.hours ?? "").trim();
  const lines = b.hoursJson ? hoursLines(b.hoursJson) : [];

  const rows: string[] = [];
  if (address) rows.push(`<li>주소: ${esc(address)}</li>`);
  if (phone) rows.push(`<li>전화: ${esc(phone)}</li>`);
  if (lines.length) {
    rows.push(`<li>영업시간:<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></li>`);
  } else if (hoursText) {
    rows.push(`<li>영업시간: ${esc(hoursText)}</li>`);
  }

  // 상호도 없고 항목도 없으면 박스 자체를 만들지 않음(graceful)
  if (!name && rows.length === 0) return "";

  const heading = name ? esc(name) : "업체 안내";
  const list = rows.length ? `<ul>${rows.join("")}</ul>` : "";
  return `\n<h2>${heading}</h2>${list}`;
}
