// 업체 정보 NAP 박스 — 생성된 글 하단에 자동 삽입할 깔끔한 HTML을 만든다.
// 데이터가 하나도 없으면 빈 문자열(박스 미삽입) → general 등 미입력 블로그엔 영향 0.
// 본문과 톤을 맞춰 h2/ul/li만 사용(인라인 스타일·script 없음 → 워드프레스 테마 안전).

export interface BusinessInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  hours?: string | null;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildBusinessBox(b: BusinessInfo): string {
  const name = (b.name ?? "").trim();
  const address = (b.address ?? "").trim();
  const phone = (b.phone ?? "").trim();
  const hours = (b.hours ?? "").trim();

  const rows: string[] = [];
  if (address) rows.push(`<li>주소: ${esc(address)}</li>`);
  if (phone) rows.push(`<li>전화: ${esc(phone)}</li>`);
  if (hours) rows.push(`<li>영업시간: ${esc(hours)}</li>`);

  // 상호도 없고 항목도 없으면 박스 자체를 만들지 않음(graceful)
  if (!name && rows.length === 0) return "";

  const heading = name ? esc(name) : "업체 안내";
  const list = rows.length ? `<ul>${rows.join("")}</ul>` : "";
  return `\n<h2>${heading}</h2>${list}`;
}
