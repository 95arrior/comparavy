// 업체 정보 NAP 카드 — kses-safe HTML.
// ateflo는 호스팅을 하지 않고 "고객마다 다른 워드프레스"에 발행한다. 상당수 사이트가
// unfiltered_html을 차단(DISALLOW_UNFILTERED_HTML·보안플러그인·멀티사이트)하므로,
// 카드는 권한에 의존하지 않고 wp_kses_post(safecss_filter_attr) 화이트리스트만 사용한다.
//
// 사용 가능(살아남음): background, border(+방향/-radius), padding(+방향), color,
//   text-align, margin(+방향), font-size, font-weight, line-height, text-decoration
// 금지(kses가 제거함): display(flex 포함), box-shadow, box-sizing, <svg>, 이모지
//   → 레이아웃은 block/inline 흐름 배치로, 아이콘은 텍스트 라벨로 대체.
import { DAY_KEYS, DAY_LABELS, type WeeklyHours, type DayKey } from "./blogProfile";

export interface BusinessInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  hours?: string | null; // 레거시 자유입력(fallback)
  hoursJson?: WeeklyHours | null; // 요일별 구조화(우선)
  subtitle?: string | null; // 업종/카테고리 한줄소개 — 없으면 생략(현재 route 미연결)
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

// 항목 한 줄: 라벨 + 값(둘 다 block). first가 아니면 윗 구분선. (kses-safe 속성만)
function row(label: string, valueHtml: string, first: boolean): string {
  const sep = first
    ? "margin-top:18px;"
    : "margin-top:16px;padding-top:16px;border-top:1px solid #F4F5F7;";
  return (
    `<div style="${sep}">` +
    `<div style="font-size:11px;font-weight:600;color:#ADB2BA;margin-bottom:4px;">${label}</div>` +
    `<div style="font-size:14.5px;font-weight:600;color:#1A1D21;line-height:1.5;">${valueHtml}</div>` +
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

  // 항목(주소/전화/영업시간) — 순서대로, 첫 항목만 구분선 없음.
  const items: Array<{ label: string; value: string }> = [];
  if (address) items.push({ label: "주소", value: esc(address) });
  if (phone) items.push({ label: "전화", value: esc(phone) });
  if (lines.length) {
    const html = lines
      .map((e, i) => {
        const noteHtml = e.note
          ? `<div style="font-size:12.5px;font-weight:500;color:#8A909A;margin-top:2px;">${esc(e.note)}</div>`
          : "";
        return `<div style="${i === 0 ? "" : "margin-top:8px;"}">${esc(e.main)}${noteHtml}</div>`;
      })
      .join("");
    items.push({ label: "영업시간", value: html });
  } else if (hoursText) {
    items.push({ label: "영업시간", value: esc(hoursText) });
  }

  // 상호도 없고 항목도 없으면 카드 자체를 만들지 않음(graceful).
  if (!name && items.length === 0) return "";

  const heading = name ? esc(name) : "업체 안내";
  const subHtml = subtitle
    ? `<div style="font-size:12.5px;font-weight:500;color:#9CA3AF;margin-top:4px;">${esc(subtitle)}</div>`
    : "";

  const rowsHtml = items.map((it, i) => row(it.label, it.value, i === 0)).join("");

  // 하단 CTA — 전화가 있을 때만. 연회색 알약 버튼(inline <a> + 부모 text-align:center).
  // display 속성을 못 쓰므로 풀폭 대신 가운데 정렬된 알약형으로 간다(kses-safe).
  const telHref = phone.replace(/[^0-9+]/g, "");
  const cta = phone
    ? `<div style="text-align:center;margin-top:22px;">` +
      `<a href="tel:${esc(telHref)}" style="background:#F2F4F6;border:1px solid #E2E6EA;border-radius:12px;` +
      `padding:13px 22px;color:#16181D;font-size:14.5px;font-weight:600;text-decoration:none;">전화 문의하기</a>` +
      `</div>`
    : "";

  return (
    `\n<div style="background:#FFFFFF;border:1px solid #E5E8EB;border-radius:18px;padding:24px;` +
    `margin:32px 0;color:#4e5968;line-height:1.6;">` +
    `<div style="font-size:19px;font-weight:700;color:#111316;line-height:1.3;">${heading}</div>` +
    subHtml +
    rowsHtml +
    cta +
    `</div>`
  );
}
