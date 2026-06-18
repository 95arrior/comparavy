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

// 값 <p>(크고 진하게). 위계의 '값' 쪽.
function valueP(text: string): string {
  return `<p style="margin:3px 0 0;font-size:15px;font-weight:600;color:#1A1D21">${esc(text)}</p>`;
}

// 리스트 한 줄: 라벨 <p>(작고 회색) + 값. first가 아니면 윗 구분선 + 간격.
function liRow(label: string, valueHtml: string, first: boolean): string {
  const liStyle = `margin:${first ? "0" : "12px 0 0"};padding:13px 0 0;border-top:1px solid #F1F3F5`;
  return (
    `<li style="${liStyle}">` +
    `<p style="margin:0;font-size:12px;font-weight:600;color:#A0A6AE">${esc(label)}</p>` +
    valueHtml +
    `</li>`
  );
}

export function buildBusinessBox(b: BusinessInfo): string {
  const name = (b.name ?? "").trim();
  const address = (b.address ?? "").trim();
  const phone = (b.phone ?? "").trim();
  const hoursText = (b.hours ?? "").trim();
  const subtitle = (b.subtitle ?? "").trim();
  const lines = b.hoursJson ? hoursLines(b.hoursJson) : [];

  // 영업시간 → 한 줄로 압축(평일/주말 묶기 유지, 점심은 괄호, 라인은 ' · '로 연결).
  const hoursStr = lines.length
    ? lines.map((l) => (l.note ? `${l.main} (${l.note})` : l.main)).join(" · ")
    : hoursText;

  // 전화 값 = tel: 버튼(<a>에 background+padding+border-radius로 강조 → 전환 유도).
  const telHref = phone.replace(/[^0-9+]/g, "");
  const phoneBtn =
    `<p style="margin:7px 0 0">` +
    `<a href="tel:${esc(telHref)}" style="background:#F2F4F6;border:1px solid #E2E6EA;border-radius:10px;` +
    `padding:9px 16px;color:#16181D;font-size:15px;font-weight:700;text-decoration:none">${esc(phone)}</a>` +
    `</p>`;

  // 항목(주소/전화/영업시간) — 있는 것만.
  const rows: Array<{ label: string; value: string }> = [];
  if (address) rows.push({ label: "주소", value: valueP(address) });
  if (phone) rows.push({ label: "전화", value: phoneBtn });
  if (hoursStr) rows.push({ label: "영업시간", value: valueP(hoursStr) });

  // 상호도 없고 항목도 없으면 카드 자체를 만들지 않음(graceful).
  if (!name && rows.length === 0) return "";

  const heading = name ? esc(name) : "업체 안내";

  // ★ 구조: 목차(ateflo-toc) div와 '동일 패턴' — div+class + 블록 요소(<p>/<ul>/<li>).
  //   이 사이트의 콘텐츠 변환이 본문에서 목차 div만은 원본 그대로 보존(실측 확인)하므로
  //   같은 구조 유지. 그 안에서 안전 속성만으로 위계·구분선·버튼을 입힌다.
  let head = `<p style="margin:0;font-size:19px;font-weight:700;color:#16181D">${heading}</p>`;
  if (subtitle) head += `<p style="margin:3px 0 0;font-size:13px;color:#9CA3AF">${esc(subtitle)}</p>`;

  const ul = rows.length
    ? `<ul style="list-style:none;margin:14px 0 0;padding:0">` +
      rows.map((r, i) => liRow(r.label, r.value, i === 0)).join("") +
      `</ul>`
    : "";

  return (
    `\n<div class="ateflo-bizcard" style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:16px;padding:20px 22px;margin:32px 0">` +
    head +
    ul +
    `</div>`
  );
}
