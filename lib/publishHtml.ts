// 네이버 발행용 본문 문자열 생성 — 순수 함수(부수효과 없음, 검증 대상).
// 입력: 제목, 본문 HTML(엔진 산출), 이미지 URL 맵(사진자리 인덱스 -> 공개 URL), 해시태그.
// 엔진 파일은 건드리지 않는다. 여기서는 발행용 표현만 만든다.

export interface PublishInput {
  title: string;
  bodyHtml: string; // 엔진 산출 본문(내부에 [사진: 설명] 마커 포함)
  images?: Record<number, string>; // 사진자리 인덱스 -> 공개 이미지 URL
  hashtags?: string[]; // 해시태그(# 없이)
}

import { BODY_ALIGN } from "@/config/publish";

const PHOTO_RE = /\[사진:\s*([^\]]+)\]/g;



// ★출력 레이어 안전망 — 4줄(약 88자) 넘는 문단을 문장(.!?)·<br>·쉼표 경계로 자동 분할.
//  엔진이 1차 분절하고, 여기서 남은 긴 문단을 결정적으로 쪼개 모바일 4줄 이하를 보장.
const MOBILE_MAX_CHARS = 88; // 390px 4줄(약 22자 x 4)
function visLen(html: string): number {
  return html.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]{1,7};/gi, "가").length;
}
function splitInner(inner: string): string[] {
  if (visLen(inner) <= MOBILE_MAX_CHARS) return [inner];
  // 1차: <br> 및 문장 끝(.?! 뒤 공백/끝) 경계로 절
  const parts = inner.split(/(?:<br\s*\/?>)|(?<=[.?!])\s+/g).map((x) => x.trim()).filter(Boolean);
  // 2차: 아직 긴 절은 쉼표·구 경계로 더 쪼갬
  const units: string[] = [];
  for (const part of parts) {
    if (visLen(part) <= MOBILE_MAX_CHARS) { units.push(part); continue; }
    const sub = part.split(/(?<=[,،·])\s*/g).map((x) => x.trim()).filter(Boolean);
    let buf = "";
    for (const u of sub) {
      if (visLen(buf + u) > MOBILE_MAX_CHARS && buf) { units.push(buf); buf = u; }
      else buf = buf ? `${buf} ${u}` : u;
    }
    if (buf) units.push(buf);
  }
  // 절들을 4줄 이하 문단으로 재조립
  const out: string[] = [];
  let acc = "";
  for (const u of units) {
    if (visLen(acc + " " + u) > MOBILE_MAX_CHARS && acc) { out.push(acc); acc = u; }
    else acc = acc ? `${acc} ${u}` : u;
  }
  if (acc) out.push(acc);
  return out.length ? out : [inner];
}
export function splitLongParagraphs(html: string): string {
  return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (_m, attr, inner) => {
    const chunks = splitInner(inner);
    if (chunks.length <= 1) return `<p${attr ?? ""}>${inner}</p>`;
    return chunks.map((c) => `<p${attr ?? ""}>${c}</p>`).join("");
  });
}

// 모바일 리듬: 블록 요소에 정렬 스타일 주입(가운데 기본). config로 분리.
function applyAlign(html: string): string {
  if (BODY_ALIGN !== "center") return html;
  // 모든 블록 요소에 통일 적용(li·ul·ol·blockquote 포함). ul/ol은 불릿이 중앙에서 어색하므로 list-style 제거.
  return html.replace(/<(p|h1|h2|h3|h4|blockquote|li|ul|ol)(\s[^>]*)?>/gi, (m, tag, attr) => {
    const t = String(tag).toLowerCase();
    const extra = (t === "ul" || t === "ol") ? ";list-style-position:inside" : "";
    if (/style=/.test(attr ?? "")) return m.replace(/style="([^"]*)"/, `style="$1;text-align:center${extra}"`);
    return `<${tag}${attr ?? ""} style="text-align:center${extra}">`;
  });
}

// 형광펜 마크(mark) -> 굵게+배경(네이버 붙여넣기에서 배경이 유실돼도 굵게는 유지).
function markToBold(html: string): string {
  return html.replace(/<mark>([\s\S]*?)<\/mark>/g, '<b style="background-color:#fff3a8;">$1</b>');
}

function hashtagLine(tags?: string[]): string {
  const list = (tags ?? []).map((t) => String(t).trim().replace(/^#/, "")).filter(Boolean);
  return list.length ? list.map((t) => `#${t}`).join(" ") : "";
}

// rich 모드 본문 HTML — 사진자리를 이미지가 있으면 img로, 없으면 안내 문단으로.
export function buildRichHtml(input: PublishInput): string {
  let idx = -1;
  let body = markToBold(input.bodyHtml).replace(PHOTO_RE, (_m, d) => {
    idx += 1;
    const url = input.images?.[idx];
    if (url) return `<p><img src="${url}" alt="" /></p>`;
    return `<p>[사진 ${idx + 1}] 여기에 ${String(d).trim()} 사진을 올려주세요</p>`;
  });
  const tags = hashtagLine(input.hashtags);
  if (tags) body += `<p>${tags}</p>`;
  return applyAlign(splitLongParagraphs(body));
}

// marker 모드 본문 HTML — 이미지는 넣지 않고 [사진 N] 마커만.
export function buildMarkerHtml(input: PublishInput): string {
  let idx = -1;
  let body = markToBold(input.bodyHtml).replace(PHOTO_RE, () => {
    idx += 1;
    return `<p>[사진 ${idx + 1}]</p>`;
  });
  const tags = hashtagLine(input.hashtags);
  if (tags) body += `<p>${tags}</p>`;
  return applyAlign(splitLongParagraphs(body));
}

// text/plain — 태그 제거, 이미지 위치에 [사진 N] 마커.
export function buildPlainText(input: PublishInput): string {
  let idx = -1;
  const withMarkers = input.bodyHtml.replace(PHOTO_RE, () => {
    idx += 1;
    return `[사진 ${idx + 1}]`;
  });
  const text = withMarkers
    .replace(/<\/(p|h1|h2|h3|blockquote|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const tags = hashtagLine(input.hashtags);
  return tags ? `${text}\n\n${tags}` : text;
}

// 본문 내 사진자리 개수.
export function countPhotoSlots(bodyHtml: string): number {
  return (bodyHtml.match(PHOTO_RE) ?? []).length;
}
