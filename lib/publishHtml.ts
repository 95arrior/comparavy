// 네이버 발행용 본문 문자열 생성 — 순수 함수(부수효과 없음, 검증 대상).
// 입력: 제목, 본문 HTML(엔진 산출), 이미지 URL 맵(사진자리 인덱스 -> 공개 URL), 해시태그.
// 엔진 파일은 건드리지 않는다. 여기서는 발행용 표현만 만든다.
// ★정렬 규칙: 산문 문단·인용구·소제목 = 중앙 / 데이터 블록(리스트·라벨:값·다행 짧은 행) = 왼쪽 + 옅은 회색 박스.

import { BODY_ALIGN } from "@/config/publish";

export interface PublishInput {
  title: string;
  bodyHtml: string; // 엔진 산출 본문(내부에 [사진: 설명] 마커 포함)
  images?: Record<number, string>; // 사진자리 인덱스 -> 공개 이미지 URL
  hashtags?: string[]; // 해시태그(# 없이)
}

const PHOTO_RE = /\[사진:\s*([^\]]+)\]/g;

const MOBILE_MAX_CHARS = 88; // 390px 4줄(약 22자 x 4)
function visLen(html: string): number {
  return html.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]{1,7};/gi, "가").length;
}

/* ── 안전망: 4줄 초과 문단 자동 분할 (문장 → 쉼표 → 어절) ── */
function splitInner(inner: string): string[] {
  if (visLen(inner) <= MOBILE_MAX_CHARS) return [inner];
  let parts = inner.split(/(?:<br\s*\/?>)|(?<=[.?!])\s+/g).map((x) => x.trim()).filter(Boolean);
  parts = parts.flatMap((part) => (visLen(part) <= MOBILE_MAX_CHARS ? [part] : part.split(/(?<=[,،·])\s*/g).map((x) => x.trim()).filter(Boolean)));
  const units: string[] = [];
  for (const part of parts) {
    if (visLen(part) <= MOBILE_MAX_CHARS) { units.push(part); continue; }
    let buf = "";
    for (const word of part.split(/\s+/).filter(Boolean)) {
      if (visLen(buf + " " + word) > MOBILE_MAX_CHARS && buf) { units.push(buf); buf = word; }
      else buf = buf ? `${buf} ${word}` : word;
    }
    if (buf) units.push(buf);
  }
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
  return html.replace(/<(p|blockquote|li)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_m, tag, attr, inner) => {
    const chunks = splitInner(inner);
    if (chunks.length <= 1) return `<${tag}${attr ?? ""}>${inner}</${tag}>`;
    return chunks.map((c) => `<${tag}${attr ?? ""}>${c}</${tag}>`).join("");
  });
}

/* ── 데이터 블록 판정 + 정렬 스타일링 ── */
const DATA_BOX_STYLE = "background:#f2f4f6;border-radius:12px;padding:12px 16px;text-align:left;margin:10px 0";

// 데이터 블록인가 — 리스트, 또는 '라벨: 값', 또는 br로 이어진 짧은 다행.
function isDataBlock(tag: string, inner: string): boolean {
  if (tag === "ul" || tag === "ol") return true;
  if (tag !== "p") return false;
  if (/<img/i.test(inner)) return false; // 이미지 문단은 산문 취급
  const text = inner.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  if (!text) return false;
  // '라벨: 값' — 라벨이 짧고 문장부호가 적으며 전체가 길지 않음
  if (/^[^.?!\n]{1,22}[:：]\s*\S/.test(text) && text.length <= 64) return true;
  // br로 이어진 2행 이상, 각 행이 짧음
  const lines = inner.split(/<br\s*\/?>/i).map((x) => x.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
  if (lines.length >= 2 && lines.every((l) => l.length <= 32)) return true;
  return false;
}

function styleTag(tag: string, attr: string, inner: string, align: "center" | "left", extra: string): string {
  const style = `text-align:${align}${extra}`;
  if (/style=/.test(attr)) return `<${tag}${attr.replace(/style="([^"]*)"/, `style="$1;${style}"`)}>${inner}</${tag}>`;
  return `<${tag}${attr} style="${style}">${inner}</${tag}>`;
}

// 산문=중앙(또는 config), 데이터=왼쪽+회색 박스(연속 데이터는 한 박스로 묶음).
function styleBlocks(html: string): string {
  const proseAlign: "center" | "left" = BODY_ALIGN === "center" ? "center" : "left";
  const BLOCK_RE = /<(p|h1|h2|h3|h4|blockquote|ul|ol)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  const blocks = [...html.matchAll(BLOCK_RE)];
  if (blocks.length === 0) return html;
  let out = "";
  let last = 0;
  let dataBuf: string[] = [];
  const flush = () => {
    if (!dataBuf.length) return;
    out += `<div style="${DATA_BOX_STYLE}">${dataBuf.join("")}</div>`;
    dataBuf = [];
  };
  for (const m of blocks) {
    out += html.slice(last, m.index);
    last = (m.index ?? 0) + m[0].length;
    const tag = m[1].toLowerCase();
    const attr = m[2] ?? "";
    const inner = m[3];
    if (isDataBlock(tag, inner)) {
      const extra = (tag === "ul" || tag === "ol") ? ";list-style-position:inside" : "";
      dataBuf.push(styleTag(tag, attr, inner, "left", extra));
    } else {
      flush();
      out += styleTag(tag, attr, inner, proseAlign, "");
    }
  }
  flush();
  out += html.slice(last);
  return out;
}

/* ── 형광펜·해시태그 ── */
function markToBold(html: string): string {
  return html.replace(/<mark>([\s\S]*?)<\/mark>/g, '<b style="background-color:#fff3a8;">$1</b>');
}
function hashtagLine(tags?: string[]): string {
  const list = (tags ?? []).map((t) => String(t).trim().replace(/^#/, "")).filter(Boolean);
  return list.length ? list.map((t) => `#${t}`).join(" ") : "";
}

/* ── 최종 발행 본문 (미리보기·검증·복사 공용) ── */
export function formatBody(input: PublishInput, opts?: { withImages?: boolean }): string {
  const withImages = opts?.withImages ?? true;
  let idx = -1;
  let body = markToBold(input.bodyHtml).replace(PHOTO_RE, (_m, d) => {
    idx += 1;
    if (withImages) {
      const url = input.images?.[idx];
      if (url) return `<p><img src="${url}" alt="" /></p>`;
      return `<p>[사진 ${idx + 1}] 여기에 ${String(d).trim()} 사진을 올려주세요</p>`;
    }
    return `<p>[사진 ${idx + 1}]</p>`;
  });
  const tags = hashtagLine(input.hashtags);
  if (tags) body += `<p>${tags}</p>`;
  return styleBlocks(splitLongParagraphs(body));
}

// rich 모드 — 사진자리를 이미지로.
export function buildRichHtml(input: PublishInput): string {
  return formatBody(input, { withImages: true });
}
// marker 모드 — 이미지 없이 [사진 N] 마커만.
export function buildMarkerHtml(input: PublishInput): string {
  return formatBody(input, { withImages: false });
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
