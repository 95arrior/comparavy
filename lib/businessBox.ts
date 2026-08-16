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

// 한국 전화번호 자동 하이픈. 이미 하이픈이 있으면 원본 유지, 인식 못 하면 원본 그대로(graceful).
// 핵심: 02(서울)만 지역번호 2자리, 나머지는 3자리. 국번 3/4자리는 전체 자릿수로 판단.
export function formatKoreanPhone(raw: string): string {
  const s = raw.trim();
  if (!s || s.includes("-")) return s; // 이미 포맷됐거나(사장이 하이픈 입력) 빈 값
  const n = s.replace(/\D/g, "");

  // 대표번호(1588/1577/1899 등) — 8자리, 0으로 시작 안 함 → 4-4
  if (n.length === 8 && n[0] !== "0") return `${n.slice(0, 4)}-${n.slice(4)}`;

  // 서울 02 — 지역번호 2자리
  if (n.startsWith("02")) {
    if (n.length === 10) return `${n.slice(0, 2)}-${n.slice(2, 6)}-${n.slice(6)}`; // 2-4-4
    if (n.length === 9) return `${n.slice(0, 2)}-${n.slice(2, 5)}-${n.slice(5)}`; // 2-3-4
    return s; // 자릿수 이상 → 원본
  }

  // 그 외 0으로 시작(휴대폰 010·070·지역 031 등) — 국번 3자리
  if (n.startsWith("0")) {
    if (n.length === 11) return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`; // 3-4-4
    if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`; // 3-3-4
    return s; // 자릿수 이상 → 원본
  }

  return s; // 인식 불가 → 원본 그대로
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

  // 항목 = "굵은 라벨: 값" 한 줄. 전화는 자동 하이픈 + tel: 링크(탭하면 전화).
  const telHref = phone.replace(/[^0-9+]/g, "");
  const phoneDisplay = formatKoreanPhone(phone);
  const lis: string[] = [];
  if (address) lis.push(`<strong>주소:</strong> ${esc(address)}`);
  if (phone) lis.push(`<strong>전화:</strong> <a href="tel:${esc(telHref)}">${esc(phoneDisplay)}</a>`);
  if (hoursStr) lis.push(`<strong>영업시간:</strong> ${esc(hoursStr)}`);

  // 상호도 없고 항목도 없으면 카드 자체를 만들지 않음(graceful).
  if (!name && lis.length === 0) return "";

  const heading = name ? esc(name) : "업체 안내";

  // ★ 구조: 목차(ateflo-toc) div와 '동일 패턴' — div+class + 블록 요소(<p>/<ul>/<li>).
  //   이 사이트의 콘텐츠 변환이 본문에서 목차 div만은 원본 그대로 보존(실측 확인)하므로
  //   같은 구조 유지. 안전 속성만(border, border-radius, padding, margin, font-*, color).
  let head = `<p style="margin:0;font-size:19px;font-weight:700;color:#16181D">${heading}</p>`;
  if (subtitle) head += `<p style="margin:3px 0 0;font-size:13px;color:#9CA3AF">${esc(subtitle)}</p>`;

  // 글머리표는 목차처럼 유지. 항목 간격은 li margin으로 정돈(마지막은 0).
  const ul = lis.length
    ? `<ul style="margin:12px 0 0;padding-left:1.2em;color:#3A3F47">` +
      lis
        .map((c, i) => `<li style="margin:0 0 ${i === lis.length - 1 ? "0" : "6px"}">${c}</li>`)
        .join("") +
      `</ul>`
    : "";

  return (
    `\n<div class="ateflo-bizcard" style="border:1px solid #ECEEF1;border-radius:14px;padding:16px 20px;margin:32px 0">` +
    head +
    ul +
    `</div>`
  );
}
