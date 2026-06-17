// 업체 정보 NAP 카드 — 워드프레스 "검증된 생존 구조"로 작성.
//
// 배경(중요): 일부 사이트의 콘텐츠 정리 필터가 "클래스 없이 인라인 텍스트만 든 <div style>"를
//   <p><strong>으로 변환해 카드를 뭉갠다. 반면 우리 목차 <div class="ateflo-toc" style="...">는
//   인라인 스타일째 멀쩡히 살아남는다(같은 글 내 실측 확인). 차이는 ① div에 class가 있고
//   ② 자식이 블록 요소(<p>/<ul>/<li>)라는 것. 특히 <p style="font-weight:700">는 변환되지 않고 보존됨.
//   → 박스도 목차와 동일 패턴(div+class + <p> 블록 자식 + 인라인 안전 스타일)으로 만든다.
//
// 사용 속성: background, border(+radius), padding(+top), margin, color, font-size,
//   font-weight, text-align, text-decoration — 전부 safecss 화이트리스트(목차가 쓰는 것들).
//   금지: display/flex/box-shadow/box-sizing/<svg>/이모지, 그리고 인라인 텍스트를 직접 든 <div>.
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

// 항목 한 줄 = 라벨 <p> + 값 <p>(여럿 가능, note는 작은 회색 <p>). first가 아니면 라벨에 윗 구분선.
// 모두 블록 <p> + 인라인 스타일 → 목차와 동일한 '생존 구조'.
function itemBlock(label: string, entries: HourLine[], first: boolean): string {
  const labelStyle = first
    ? "margin:18px 0 6px;font-size:11px;font-weight:600;color:#ADB2BA"
    : "margin:16px 0 6px;padding-top:16px;border-top:1px solid #F4F5F7;font-size:11px;font-weight:600;color:#ADB2BA";
  let html = `<p style="${labelStyle}">${esc(label)}</p>`;
  entries.forEach((e, i) => {
    const vStyle =
      (i === 0 ? "margin:0;" : "margin:8px 0 0;") + "font-size:14.5px;font-weight:600;color:#1A1D21";
    html += `<p style="${vStyle}">${esc(e.main)}</p>`;
    if (e.note) {
      html += `<p style="margin:2px 0 0;font-size:12.5px;font-weight:500;color:#8A909A">${esc(e.note)}</p>`;
    }
  });
  return html;
}

export function buildBusinessBox(b: BusinessInfo): string {
  const name = (b.name ?? "").trim();
  const address = (b.address ?? "").trim();
  const phone = (b.phone ?? "").trim();
  const hoursText = (b.hours ?? "").trim();
  const subtitle = (b.subtitle ?? "").trim();
  const lines = b.hoursJson ? hoursLines(b.hoursJson) : [];

  // 항목(주소/전화/영업시간) — 순서대로, 첫 항목만 구분선 없음.
  const items: Array<{ label: string; entries: HourLine[] }> = [];
  if (address) items.push({ label: "주소", entries: [{ main: address, note: "" }] });
  if (phone) items.push({ label: "전화", entries: [{ main: phone, note: "" }] });
  if (lines.length) items.push({ label: "영업시간", entries: lines });
  else if (hoursText) items.push({ label: "영업시간", entries: [{ main: hoursText, note: "" }] });

  // 상호도 없고 항목도 없으면 카드 자체를 만들지 않음(graceful).
  if (!name && items.length === 0) return "";

  const heading = name ? esc(name) : "업체 안내";
  const headingP = `<p style="margin:0;font-size:19px;font-weight:700;color:#111316">${heading}</p>`;
  const subP = subtitle
    ? `<p style="margin:4px 0 0;font-size:12.5px;font-weight:500;color:#9CA3AF">${esc(subtitle)}</p>`
    : "";

  const itemsHtml = items.map((it, i) => itemBlock(it.label, it.entries, i === 0)).join("");

  // 하단 CTA — 전화가 있을 때만. 알약 스타일은 <p>에 싣고(목차처럼 보존됨), <a>는 색/굵기만.
  // display 불가라 <a>를 풀폭 블록으로 못 만들어, <p> 자체를 가운데정렬 알약으로 쓴다.
  const telHref = phone.replace(/[^0-9+]/g, "");
  const cta = phone
    ? `<p style="margin:22px 0 0;background:#F2F4F6;border:1px solid #E2E6EA;border-radius:12px;padding:13px;text-align:center">` +
      `<a href="tel:${esc(telHref)}" style="color:#16181D;font-size:14.5px;font-weight:600;text-decoration:none">전화 문의하기</a>` +
      `</p>`
    : "";

  return (
    `\n<div class="ateflo-bizcard" style="background:#FFFFFF;border:1px solid #E5E8EB;border-radius:18px;padding:24px;margin:32px 0">` +
    headingP +
    subP +
    itemsHtml +
    cta +
    `</div>`
  );
}
