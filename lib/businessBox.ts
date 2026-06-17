// 업체 정보 NAP 카드 — 생성된 글 하단에 자동 삽입하는 "중립 프리미엄" 클린 카드.
// 인라인 스타일만 사용(<style>·class·script 없음). 색·이모지 배제(특정 브랜드색/이모지는 업종마다 안 맞음).
// 아이콘은 SVG 선 아이콘만. 데이터가 하나도 없으면 빈 문자열 → 미입력 블로그엔 영향 0.
import { DAY_KEYS, DAY_LABELS, type WeeklyHours, type DayKey } from "./blogProfile";

export interface BusinessInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  hours?: string | null; // 레거시 자유입력(fallback)
  hoursJson?: WeeklyHours | null; // 요일별 구조화(우선)
  subtitle?: string | null; // 업종/카테고리 한줄소개 — 없으면 생략(현재 route 미연결, 아래 주석 참고)
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 선 아이콘(stroke #6B7280, 18px) — feather 계열. 이모지 대신 사용.
const ICON_PIN =
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
const ICON_PHONE =
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const ICON_CLOCK =
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

const WEEKDAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
const WEEKEND: DayKey[] = ["sat", "sun"];

type DayHoursLike = WeeklyHours[DayKey];
type HourEntry = { sig: string; time: string; note: string };
type HourLine = { main: string; note: string };

// 한 요일 → 비교용 시그니처 + 시간 텍스트 + 부가정보(점심). 미설정/불완전이면 null.
function daySig(d: DayHoursLike): HourEntry | null {
  if (!d) return null;
  if (d.closed) return { sig: "closed", time: "휴무", note: "" };
  if (d.open && d.close) {
    const note = d.breakStart && d.breakEnd ? `점심 ${d.breakStart}–${d.breakEnd}` : "";
    return { sig: `${d.open}-${d.close}|${note}`, time: `${d.open}–${d.close}`, note };
  }
  return null;
}

// 주어진 요일 묶음에서 '연속된 같은 시그니처'를 범위로 압축한다("월–수 09:00–18:00").
function groupRun(days: DayKey[], map: Map<DayKey, HourEntry>): HourLine[] {
  const present = days.filter((d) => map.has(d));
  const out: HourLine[] = [];
  let i = 0;
  while (i < present.length) {
    let j = i;
    while (
      j + 1 < present.length &&
      map.get(present[j + 1])!.sig === map.get(present[i])!.sig &&
      days.indexOf(present[j + 1]) === days.indexOf(present[j]) + 1
    ) {
      j++;
    }
    const label = i === j ? DAY_LABELS[present[i]] : `${DAY_LABELS[present[i]]}–${DAY_LABELS[present[j]]}`;
    const e = map.get(present[i])!;
    out.push({ main: `${label} ${e.time}`, note: e.note });
    i = j + 1;
  }
  return out;
}

// 요일별 구조 → 압축된 영업시간 라인들.
// 평일(월–금) 전체가 동일하면 "평일 …", 주말(토·일)이 동일하면 "주말 …"로 묶어 7줄 나열을 막는다.
function hoursLines(h: WeeklyHours): HourLine[] {
  const map = new Map<DayKey, HourEntry>();
  for (const day of DAY_KEYS) {
    const s = daySig(h[day]);
    if (s) map.set(day, s);
  }
  if (map.size === 0) return [];

  const out: HourLine[] = [];

  const wd = WEEKDAYS.filter((d) => map.has(d));
  if (wd.length === 5 && WEEKDAYS.every((d) => map.get(d)!.sig === map.get("mon")!.sig)) {
    const e = map.get("mon")!;
    out.push({ main: `평일 ${e.time}`, note: e.note });
  } else {
    out.push(...groupRun(WEEKDAYS, map));
  }

  const we = WEEKEND.filter((d) => map.has(d));
  if (we.length === 2 && map.get("sat")!.sig === map.get("sun")!.sig) {
    const e = map.get("sat")!;
    out.push({ main: `주말 ${e.time}`, note: e.note });
  } else {
    out.push(...groupRun(WEEKEND, map));
  }

  return out;
}

// 항목 한 줄: 선 아이콘 + (라벨/값). first가 아니면 윗 구분선.
function row(icon: string, label: string, valueHtml: string, first: boolean): string {
  const sep = first
    ? "margin-top:20px;"
    : "margin-top:16px;padding-top:16px;border-top:1px solid #F4F5F7;";
  return (
    `<div style="display:flex;gap:14px;align-items:flex-start;${sep}">` +
    `<span style="flex:0 0 auto;margin-top:1px;" aria-hidden="true">${icon}</span>` +
    `<div style="flex:1 1 auto;min-width:0;">` +
    `<div style="font-size:11px;font-weight:600;color:#ADB2BA;margin-bottom:4px;">${label}</div>` +
    `<div style="font-size:14.5px;font-weight:600;color:#1A1D21;line-height:1.5;">${valueHtml}</div>` +
    `</div>` +
    `</div>`
  );
}

export function buildBusinessBox(b: BusinessInfo): string {
  const name = (b.name ?? "").trim();
  const address = (b.address ?? "").trim();
  const phone = (b.phone ?? "").trim();
  const hoursText = (b.hours ?? "").trim();
  const subtitle = (b.subtitle ?? "").trim();
  const lines = b.hoursJson ? hoursLines(b.hoursJson) : [];

  // 항목(주소/전화/영업시간) 구성 — 순서대로, 첫 항목만 구분선 없음.
  const items: Array<{ icon: string; label: string; value: string }> = [];
  if (address) items.push({ icon: ICON_PIN, label: "주소", value: esc(address) });
  if (phone) items.push({ icon: ICON_PHONE, label: "전화", value: esc(phone) });
  if (lines.length) {
    const html = lines
      .map((e, i) => {
        const noteHtml = e.note
          ? `<div style="font-size:12.5px;font-weight:500;color:#8A909A;margin-top:2px;">${esc(e.note)}</div>`
          : "";
        return `<div style="${i === 0 ? "" : "margin-top:8px;"}">${esc(e.main)}${noteHtml}</div>`;
      })
      .join("");
    items.push({ icon: ICON_CLOCK, label: "영업시간", value: html });
  } else if (hoursText) {
    items.push({ icon: ICON_CLOCK, label: "영업시간", value: esc(hoursText) });
  }

  // 상호도 없고 항목도 없으면 카드 자체를 만들지 않음(graceful).
  if (!name && items.length === 0) return "";

  const heading = name ? esc(name) : "업체 안내";
  const subHtml = subtitle
    ? `<div style="font-size:12.5px;font-weight:500;color:#9CA3AF;margin-top:4px;">${esc(subtitle)}</div>`
    : "";

  const rowsHtml = items.map((it, i) => row(it.icon, it.label, it.value, i === 0)).join("");

  // 하단 CTA — 전화가 있을 때만. 검정 풀폭 버튼.
  const telHref = phone.replace(/[^0-9+]/g, "");
  const cta = phone
    ? `<a href="tel:${esc(telHref)}" style="display:block;width:100%;box-sizing:border-box;margin-top:22px;` +
      `padding:14px;background:#F2F4F6;color:#16181D;border:1px solid #E2E6EA;border-radius:12px;text-align:center;` +
      `text-decoration:none;font-size:14.5px;font-weight:600;">전화 문의하기</a>`
    : "";

  return (
    `\n<div style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:18px;padding:26px 24px;` +
    `box-shadow:0 6px 24px rgba(17,24,39,0.06);box-sizing:border-box;">` +
    `<div style="font-size:19px;font-weight:700;color:#111316;letter-spacing:-0.5px;line-height:1.3;">${heading}</div>` +
    subHtml +
    rowsHtml +
    cta +
    `</div>`
  );
}
