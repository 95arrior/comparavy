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
// ★유출 판정 — '콜론형 원본 마커([사진: 설명])'와 '독자용 지시 문구'만 유출로 본다.
//  깨끗한 '[사진 N]'(모바일 삽입 위치 표시)은 정상이라 건드리지 않는다.
const PHOTO_MARKER_ANY_G = /\[\s*사진[^\]]*\]/g;               // 모든 [사진...] (rich에선 하나도 없어야)
const INSTRUCTION_SRC = "\\[\\s*사진\\s*:[\\s\\S]*?\\]|사진을?\\s*(여기에\\s*)?(올려|넣어|추가|삽입)\\s*주세요";
const INSTRUCTION_G = new RegExp(INSTRUCTION_SRC, "g");        // 콜론형 + 지시 문구
// 이모지·픽토그램·기호(화살표 U+2190~21FF·가운뎃점·불릿은 보존).
const EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2049}\u{203C}\u{2122}\u{2139}]/gu;
export function stripEmoji(s: string): string {
  return s.replace(EMOJI_RE, "").replace(/[ \t]{2,}/g, " ");
}
// rich 최종 게이트 — 모든 사진 마커·지시·이모지 제거 + 빈 문단 정리.
export function sanitizeForCopy(html: string): string {
  const s = stripEmoji(html).replace(PHOTO_MARKER_ANY_G, "").replace(INSTRUCTION_G, "");
  return s.replace(/<p[^>]*>\s*<\/p>/gi, "");
}
// plain 게이트 — 지시/콜론형만 제거(깨끗한 [사진 N] 삽입 표시는 유지) + 이모지.
export function sanitizePlain(text: string): string {
  return stripEmoji(text).replace(INSTRUCTION_G, "");
}
export function hasPhotoLeak(s: string): boolean { return /\[\s*사진[^\]]*\]/.test(s) || new RegExp(INSTRUCTION_SRC).test(s); }       // rich 기준(마커 하나도 불가)
export function hasPhotoLeakPlain(s: string): boolean { return new RegExp(INSTRUCTION_SRC).test(s); } // plain 기준(지시/콜론만)

const MOBILE_MAX_CHARS = 88; // 390px 4줄(약 22자 x 4)
function visLen(html: string): number {
  return html.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]{1,7};/gi, "가").length;
}

// ★괄호·따옴표 균형 추적 — 열린 상태에서 나눈 조각은 다시 합친다(미닫힌 괄호 분할 금지).
function isBalanced(s: string): boolean {
  let depth = 0;
  for (const ch of s.replace(/<[^>]+>/g, "")) {
    if (ch === "(" || ch === "（" || ch === "[" || ch === "「" || ch === "【") depth++;
    else if (ch === ")" || ch === "）" || ch === "]" || ch === "」" || ch === "】") depth--;
  }
  const dq = (s.match(/["“”]/g) ?? []).length; // 따옴표 홀수면 열림
  const sq = (s.match(/['‘’]/g) ?? []).length;
  return depth <= 0 && dq % 2 === 0 && sq % 2 === 0;
}
function mergeUnbalanced(parts: string[]): string[] {
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && !isBalanced(out[out.length - 1])) out[out.length - 1] = `${out[out.length - 1]} ${p}`;
    else out.push(p);
  }
  return out;
}

/* ── 안전망: 4줄 초과 문단 자동 분할 (문장 → 쉼표 → 어절) ── */
function splitInner(inner: string): string[] {
  if (visLen(inner) <= MOBILE_MAX_CHARS) return [inner];
  let parts = mergeUnbalanced(inner.split(/(?:<br\s*\/?>)|(?<=[.?!])\s+/g).map((x) => x.trim()).filter(Boolean));
  // 쉼표 분할 — 단, 괄호·따옴표가 열린 조각은 다시 합쳐 미닫힘 분할 방지.
  parts = parts.flatMap((part) => (visLen(part) <= MOBILE_MAX_CHARS ? [part] : mergeUnbalanced(part.split(/(?<=[,，、])\s*/g).map((x) => x.trim()).filter(Boolean))));
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
  // ★사진 자리는 '구조화 슬롯'으로만 — 채워진 슬롯만 이미지로, 미충족 슬롯은 줄 자체를 제거(안내문구 유출 금지).
  let body = markToBold(input.bodyHtml).replace(PHOTO_RE, () => {
    idx += 1;
    if (!withImages) return `<p>[사진 ${idx + 1}]</p>`; // marker 모드(수동 배치) — 명시적 선택
    const url = input.images?.[idx];
    return url ? `<p><img src="${url}" alt="" /></p>` : ""; // 미충족 → 제거(마커·지시 노출 안 함)
  });
  const tags = hashtagLine(input.hashtags);
  if (tags) body += `<p>${tags}</p>`;
  // 최종 게이트: 이모지·잔존 사진 마커/지시 제거(구조적 차단) → 분할 → 정렬.
  return styleBlocks(splitLongParagraphs(sanitizeForCopy(body)));
}

// rich 모드 — 사진자리를 이미지로.
export function buildRichHtml(input: PublishInput): string {
  return formatBody(input, { withImages: true });
}
// marker 모드 — 이미지 없이 [사진 N] 마커만.
export function buildMarkerHtml(input: PublishInput): string {
  return formatBody(input, { withImages: false });
}

// text/plain — 태그 제거. 이미지가 채워진 슬롯만 [사진 N](모바일: 저장한 N번 사진 삽입 위치), 미충족은 제거.
export function buildPlainText(input: PublishInput): string {
  let idx = -1;
  const hasAnyImage = input.images && Object.keys(input.images).length > 0;
  const withMarkers = input.bodyHtml.replace(PHOTO_RE, () => {
    idx += 1;
    // 이미지가 하나라도 있으면(=AI 모드) 채워진 슬롯만 마커, 미충족 제거. 이미지 전무(수동 모드)면 마커 유지.
    if (!hasAnyImage) return `[사진 ${idx + 1}]`;
    return input.images?.[idx] ? `[사진 ${idx + 1}]` : "";
  });
  const text = stripEmoji(withMarkers)
    .replace(/<\/(p|h1|h2|h3|blockquote|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(INSTRUCTION_G, "") // 잔존 지시/콜론형만 제거(깨끗한 [사진 N]은 유지)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const tags = hashtagLine(input.hashtags);
  return tags ? `${text}\n\n${tags}` : text;
}

// 본문 내 사진자리 개수.
export function countPhotoSlots(bodyHtml: string): number {
  return (bodyHtml.match(PHOTO_RE) ?? []).length;
}
