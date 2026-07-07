// 네이버 발행용 본문 문자열 생성 — 순수 함수(부수효과 없음, 검증 대상).
// 입력: 제목, 본문 HTML(엔진 산출), 이미지 URL 맵(사진자리 인덱스 -> 공개 URL), 해시태그.
// 엔진 파일은 건드리지 않는다. 여기서는 발행용 표현만 만든다.
// ★정렬 규칙: 산문 문단·인용구·소제목 = 중앙 / 데이터 블록(리스트·라벨:값·다행 짧은 행) = 왼쪽 + 옅은 회색 박스.

import { BODY_ALIGN } from "@/config/publish";
import { sanitizeUrls } from "./linkWhitelist";

export interface PublishInput {
  title: string;
  bodyHtml: string; // 엔진 산출 본문(내부에 [사진: 설명] 마커 포함)
  images?: Record<number, string>; // 사진자리 인덱스 -> 공개 이미지 URL
  hashtags?: string[]; // 해시태그(# 없이)
  /** 내 네이버 블로그 아이디 — 자기 글 주소(전편 링크)는 URL 정화에서 통과 */
  ownNaverBlogId?: string | null;
  /** AI 생성 이미지 슬롯 인덱스 — 해당 이미지 아래 '참고 이미지' 캡션 자동(오인 방지) */
  aiImageIdx?: number[];
  /** 본문 클로징 — 경계선 + 중앙 작은 이미지(뉴스룸 마감 문법, 보통 썸네일 재사용) */
  closingImageUrl?: string | null;
}

const PHOTO_RE = /\[사진:\s*([^\]]+)\]/g;
// ★슬롯 통합 — 사진·카드 둘 다 이미지 슬롯. 문서 순서로 인덱싱, images 맵이 URL 제공(사진=Gemini, 카드=satori).
const SLOT_RE = /\[(?:사진|카드):\s*([^\]]+)\]/g;
export interface Slot { type: "photo" | "card"; desc: string }
// 본문의 슬롯을 문서 순서로 파싱(생성 파이프라인이 타입별로 렌더).
export function parseSlots(bodyHtml: string): Slot[] {
  const out: Slot[] = [];
  const re = /\[(사진|카드):\s*([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyHtml))) out.push({ type: m[1] === "카드" ? "card" : "photo", desc: m[2].trim() });
  return out;
}
// 카드 마커 desc('라벨=값 | 라벨=값') → CardItem 파싱.
export function parseCardItems(desc: string): { label: string; value: string }[] {
  return desc.split("|").map((seg) => { const [label, ...rest] = seg.split("="); return { label: (label ?? "").trim(), value: rest.join("=").trim() }; }).filter((x) => x.label && x.value).slice(0, 3);
}
// ★유출 판정 — '콜론형 원본 마커([사진: 설명])'와 '독자용 지시 문구'만 유출로 본다.
//  깨끗한 '[사진 N]'(모바일 삽입 위치 표시)은 정상이라 건드리지 않는다.
const PHOTO_MARKER_ANY_G = /\[\s*(?:사진|카드)[^\]]*\]/g;         // 모든 [사진/카드...] (rich에선 하나도 없어야)
const INSTRUCTION_SRC = "\\[\\s*사진\\s*:[\\s\\S]*?\\]|사진을?\\s*(여기에\\s*)?(올려|넣어|추가|삽입)\\s*주세요";
const INSTRUCTION_G = new RegExp(INSTRUCTION_SRC, "g");        // 콜론형 + 지시 문구
// 이모지·픽토그램·기호(화살표 U+2190~21FF·가운뎃점·불릿은 보존).
const EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2049}\u{203C}\u{2122}\u{2139}]/gu;
// ★포맷 v3(네이버 공식 블로그팀 문법) — 포인트 이모지 화이트리스트만 통과(도배 방지), 그 외 전부 제거.
const EMOJI_ALLOW = ["📌", "✅", "💡", "🍀", "🎉", "😊", "👇", "⏰", "📢"];
export function stripEmoji(s: string): string {
  const MASK = "\u0000EM";
  let out = s;
  EMOJI_ALLOW.forEach((e, i) => { out = out.split(e).join(`${MASK}${i};`); });
  out = out.replace(EMOJI_RE, "");
  EMOJI_ALLOW.forEach((e, i) => { out = out.split(`${MASK}${i};`).join(e); });
  return out.replace(/[ \t]{2,}/g, " ");
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
export function hasPhotoLeak(s: string): boolean { return /\[\s*(?:사진|카드)[^\]]*\]/.test(s) || new RegExp(INSTRUCTION_SRC).test(s); }       // rich 기준(마커 하나도 불가)
export function hasPhotoLeakPlain(s: string): boolean { return new RegExp(INSTRUCTION_SRC).test(s); } // plain 기준(지시/콜론만)

// ★서스펜스 개행 — 엔진이 긴장 지점에 '[간격]' 마킹만 하고, 렌더러가 여백을 삽입한다(엔진이 빈 줄 직접 X).
//  글당 최대 3회. 초과분은 드롭. 마킹된 개행만 안전망 압축의 예외(비마킹 과잉 빈줄은 압축 유지).
const SUSPENSE_TOKEN_RE = /<p[^>]*>\s*\[간격\]\s*<\/p>|\[간격\]/g;
const SUSPENSE_MAX = 3;
const SUSPENSE_SPACER = '<p style="text-align:left"><br></p><p style="text-align:left"><br></p>'; // 빈 줄 2칸
const SUSPENSE_OVER = '<p style="text-align:left"><br></p>'; // 상한 초과 마킹 → 일반 여백 1칸
export function applySuspenseBreaks(html: string): string {
  let n = 0;
  return html.replace(SUSPENSE_TOKEN_RE, () => { n += 1; return n <= SUSPENSE_MAX ? SUSPENSE_SPACER : SUSPENSE_OVER; });
}
export function applySuspenseBreaksPlain(text: string): string {
  let n = 0;
  return text.replace(/\[간격\]/g, () => { n += 1; return n <= SUSPENSE_MAX ? "\n\n" : ""; });
}
export function countSuspenseMarks(html: string): number {
  return (html.match(/\[간격\]/g) ?? []).length;
}

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
// ★유저 교본(2026-07-07): 문단을 쪼개면(빈 줄) 흐름이 끊긴다 — 같은 문단 안에서 <br>로 '의미 구 줄바꿈'.
//  문장별 한 줄. 문장이 길면(>44자) 쉼표·연결어미 구 경계에서 균형 줄바꿈(양쪽 12자 이상일 때만 — 고아 조각 금지).
function breakSentence(sen: string): string {
  // ★모바일 줄폭 개행(네이버 실측 ~18자): 절 경계에서 반복 절단. 1차=이상 구간(10~28자), 실패 시 2차=완화(8~40자).
  if (/<br/.test(sen)) return sen;
  const CLAUSE = /([,，、]|에서|라면|다면|하면|이면|인지|는지|한지|는 건|은 건|하고|하며|지만|는데|면서|위해|보다|어서|아서|여도|해도|므로|더라도|든지|거나|처럼|때는|때만|경우|까지|기간은|기한은|여부는|한도는|기준은|넣어야|하려면|통해|따라|대해|관해|[가-힣]{2,}[은는도]|[가-힣]{2,}할|[가-힣]{2,}면)\s+/g;
  const parts: string[] = [];
  let rest = sen;
  let guard = 0;
  while (visLen(rest) > 21 && guard++ < 8) { // ★진입 24→21(실측: 22자 잔여 줄이 네이버 폭에서 재접힘 '접/수해요')
    const cands: number[] = [];
    let m: RegExpExecArray | null;
    CLAUSE.lastIndex = 0;
    while ((m = CLAUSE.exec(rest))) cands.push(m.index + m[0].length);
    let best = -1, bestD = Infinity;
    for (const pass of [{ min: 10, max: 28 }, { min: 8, max: 9999 }]) { // 2차: 상한 없음 — 통줄보다 낫다
      for (const cut of cands) {
        const left = visLen(rest.slice(0, cut));
        if (left < pass.min || left > pass.max || visLen(rest.slice(cut)) < 4) continue; // 우측 4자('접수해요.')도 유효한 줄
        const d = Math.abs(left - 18);
        if (d < bestD) { bestD = d; best = cut; }
      }
      if (best >= 0) break;
    }
    if (best < 0) break;
    parts.push(rest.slice(0, best).trimEnd());
    rest = rest.slice(best).trimStart();
  }
  parts.push(rest);
  return parts.join("<br>");
}
function splitInner(inner: string): string[] {
  if (visLen(inner) <= MOBILE_MAX_CHARS && !/(?<=[?!])\s|(?<=[^\d]\.)\s/.test(inner.replace(/<[^>]+>/g, ""))) return [breakSentence(inner)]; // ★단문 문단도 절 개행은 적용(실측: 한 문장 문단이 통줄로 남음)
  const sentences = mergeUnbalanced(inner.split(/(?:<br\s*\/?>)|(?<=[?!])\s+|(?<=[^\d]\.)\s+/g).map((x) => x.trim()).filter(Boolean));
  if (sentences.length <= 1) return [breakSentence(inner)];
  // 2문장씩 한 문단(그룹 안은 <br> 밀착·그룹 사이만 여백) — 유저 편집본 리듬
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    out.push(sentences.slice(i, i + 2).map(breakSentence).join("<br>"));
  }
  return out;
}
export function splitLongParagraphs(html: string): string {
  return html.replace(/<(p|blockquote|li)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (_m, tag, attr, inner) => {
    const chunks = splitInner(inner);
    if (chunks.length <= 1) return `<${tag}${attr ?? ""}>${chunks[0] ?? inner}</${tag}>`; // ★가공본(절 개행 <br>) 보존 — 원문 반환이 개행을 버리고 있었음
    return chunks.map((c) => `<${tag}${attr ?? ""}>${c}</${tag}>`).join("");
  });
}

/* ── 정렬 — ★왼쪽 단일 세계(동결). 데이터박스·중앙분리 폐기, 리스트는 네이버 기본 불릿/번호. ── */
//  모든 블록에 text-align만 주입. 인용구(blockquote)는 네이버 인용 포맷이 요소 자체로 구분되나 정렬은 동일.
function styleBlocks(html: string): string {
  const align: "center" | "left" = BODY_ALIGN === "center" ? "center" : "left";
  return html.replace(/<(p|h1|h2|h3|h4|blockquote|ul|ol|li)(\s[^>]*)?>/gi, (m, tag, attr) => {
    if (/^(ul|ol|li)$/i.test(String(tag))) return /style=/.test(attr ?? "") ? m.replace(/style="([^"]*)"/, 'style="$1;text-align:left"') : m.replace(/>$/, ' style="text-align:left">'); // ★리스트는 항상 좌(유저 교본: 불릿 중앙정렬 금지)
    if (/text-align\s*:\s*center/.test(attr ?? "")) return m; // ★중앙 안내 블록(포맷 v3) — 엔진 지정 존중
    if (/style=/.test(attr ?? "")) return m.replace(/style="([^"]*)"/, `style="$1;text-align:${align}"`);
    return m.replace(/>$/, ` style="text-align:${align}">`);
  });
}

/* ── ★여백 스케일 v2 — 블록 무게 비례. 여백은 CSS가 아니라 '마크업'(스페이서 문단)으로 넣는다(네이버 실렌더 = 미리보기 = 복사본 동일). ── */
//  소제목 앞3·뒤1 / 문단 사이1 / 4줄↑ 긴 블록 위아래3 / 강조 문장 위아래2 / 해시태그 앞2. 연속 빈 줄 상한 4(압축 아님 — 캡만).
export const BLANK_P = '<p style="text-align:left"><br></p>'; // 네이버 스마트에디터ONE 생존형 빈 줄
const BLANK_CAP = 3; // ★실측: FAQ·요약 주변 여백 과다 — 상한 4→3
const CHARS_PER_LINE_PUB = 19; // ★네이버 실측
function blockLines(inner: string): number {
  return Math.max(1, Math.ceil(visLen(inner) / CHARS_PER_LINE_PUB));
}
interface Blk { tag: string; attr: string; inner: string; raw: string }
function walkBlocks(html: string): { blocks: Blk[]; exact: boolean } {
  const re = /<(p|h1|h2|h3|h4|blockquote|ul|ol|table)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi; // table 포함 — 표가 여백 재조립에서 증발하지 않게(평가 반영)
  const blocks: Blk[] = [];
  let covered = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) { blocks.push({ tag: m[1].toLowerCase(), attr: m[2] ?? "", inner: m[3], raw: m[0] }); covered += m[0].length; }
  return { blocks, exact: covered >= html.replace(/\s+/g, "").length * 0 }; // exact 판정은 재조합 검증에서
}
function isEmphasisPara(b: Blk): boolean { // <b>단독 문단(형광펜 배경 제외) = 강조/브릿지 규격
  return b.tag === "p" && /^\s*<b(?![^>]*background)[^>]*>[\s\S]{2,80}<\/b>\s*$/.test(b.inner);
}
function isHashtagPara(b: Blk): boolean { return b.tag === "p" && /^\s*#/.test(b.inner.replace(/<[^>]+>/g, "")); }
function isImagePara(b: Blk): boolean { return b.tag === "p" && /<img/i.test(b.inner); }
function isSuspenseMark(b: Blk): boolean { return b.tag === "p" && /^\s*\[간격\]\s*$/.test(b.inner.replace(/<[^>]+>/g, "")); }
// ★단계 헤더(실측: 1단계/2단계 여백이 제각각 — h3·굵은 문단·📌 강조가 섞여 규칙이 널뛰기) —
//  'N단계:'·'STEP N'·'첫째:' 류는 형태 불문 앞2·뒤1로 통일한다.
function isStepPara(b: Blk): boolean {
  if (!/^(p|h[1-4])$/.test(b.tag)) return false;
  const t = b.inner.replace(/<[^>]+>/g, "").trim();
  if (t.length > 60) return false; // 헤더성 짧은 줄만
  return /^(?:[📌✅💡🍀🎉😊👇⏰📢]\s*)?(?:\d{1,2}\s*단계|STEP\s*\d{1,2}|Step\s*\d{1,2}|(?:첫|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)째)\s*[:.]/u.test(t);
}
const isQPara = (b: Blk) => {
  if (b.tag !== "p") return false;
  const plain = b.inner.replace(/<[^>]+>/g, "").trim();
  return /^Q[.．]\s?/.test(plain) || (/^\d{1,2}[.．]\s/.test(plain) && /\?$/.test(plain)); // Q. 원형 + 변환 후(1. …?) 모두
};
function beforeBlanks(b: Blk): number {
  if (isSuspenseMark(b)) return 0; // 여백은 서스펜스 확장 전담
  if (/^h[1-4]$/.test(b.tag)) return 3;
  if (isHashtagPara(b)) return 2;
  if (isEmphasisPara(b)) return 2;
  if (!isImagePara(b) && blockLines(b.inner) >= 4) return 2; // ★3→2(실측: 과다)
  return 1;
}
function afterBlanks(b: Blk): number {
  if (isSuspenseMark(b)) return 0;
  if (/^h[1-4]$/.test(b.tag)) return 1;
  if (isEmphasisPara(b)) return 2;
  if (!isImagePara(b) && blockLines(b.inner) >= 4) return 2; // ★3→2
  return 1;
}
/** 블록 사이 빈 줄 수(마크업) — max(앞블록 after, 뒷블록 before), 상한 3. */
export function gapBetween(prev: { tag: string; inner: string } | null, cur: { tag: string; inner: string }): number {
  const c = cur as Blk;
  if (!prev) return 0;
  // [간격] 마킹 인접 갭은 0 — 그 자리 여백은 서스펜스 확장(2칸/초과 1칸)이 전담
  if (isSuspenseMark(prev as Blk) || isSuspenseMark(c)) return 0;
  // ★단계 헤더 고정 규격 — 앞2(직전 블록이 뭐든)·뒤1(제목과 본문 밀착). 시퀀스 전체가 같은 리듬.
  if (isStepPara(c)) return 2;
  if (isStepPara(prev as Blk)) return 1;
  // ★FAQ 리듬(유저 모범답안): 제목 → 빈줄 1 → 설명 → 빈줄 3 → 다음 제목
  if (isQPara(c)) return 3;
  if (isQPara(prev as Blk)) return 1;
  return Math.min(BLANK_CAP, Math.max(afterBlanks(prev as Blk), beforeBlanks(c)));
}
// ★엔진 마커 변환 — '---' 단독 문단=구분선, '> 문장'=인용 블록, 'Q.' 문단=강조(FAQ 가독)
// ★화살표 체인 분해(유저 교본: 'A → B → C 순서예요'가 중앙정렬에서 뒤엉킴) — →가 2개 이상이면 번호 세로 줄로
function arrowChainToSteps(html: string): string {
  return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (raw, attr, inner) => {
    if (/<(table|img|ul|ol)/i.test(inner)) return raw;
    const arrows = (inner.match(/→/g) ?? []).length;
    if (arrows < 2) return raw;
    const steps = inner.split(/\s*→\s*/).map((x: string) => x.trim()).filter(Boolean);
    if (steps.length < 3) return raw;
    const lines = steps.map((st: string, i: number) => `${i + 1}. ${st}`).join("<br>");
    return `<p${attr ?? ""}>${lines}</p>`;
  });
}

function styleMarkers(html: string): string {
  // ★내부링크 마커 — [관련글: URL | 제목] → 중앙 링크 문단(네이버가 URL을 링크카드로)
  html = html.replace(/\[관련글:\s*(https?:[^\s|\]]+)\s*\|\s*([^\]]+)\]/g,
    '<p style="text-align:center;font-size:14px">함께 보면 좋은 글<br>$2<br>$1</p>');
  let qNum = 0; // ★FAQ 질문 자동 번호(유저 교본: 1. 2. 3. 진행감)
  html = html.replace(/<(h[2-4])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (raw, tag, attr, inner) => {
    const plain = String(inner).replace(/<[^>]+>/g, "").trim();
    if (/자주 묻는 질문|FAQ/i.test(plain)) return `<${tag}${attr ?? ""}><b style="background-color:#fff3a8;">${plain}</b></${tag}>`; // 헤더 형광펜
    return raw;
  });
  return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (raw, attr, inner) => {
    const plain = String(inner).replace(/<[^>]+>/g, "").trim();
    if (/^-{3,}$/.test(plain)) return '<p style="text-align:center;color:#d5d9df;letter-spacing:2px;margin:8px 0">─────</p>';
    if (/^(?:&gt;|>)\s+/.test(plain)) {
      const q = plain.replace(/^(?:&gt;|>)\s+/, "");
      return `<p style="text-align:center;font-size:17px;font-weight:700;color:#33363d;padding:4px 24px">“${q}”</p>`;
    }
    if (/^Q[.．]\s?/.test(plain)) { qNum += 1; return `<p><b style="font-size:16px">${plain.replace(/^Q[.．]\s?/, `${qNum}. `)}</b></p>`; } // Q. → 번호 볼드
    return raw;
  });
}

// ★나열은 표 박스로(유저 확정: 중앙 정렬 본문에서 리스트가 흐름을 끊음 — 박스에 담아 좌정렬 유지)
function listsToTable(html: string): string {
  return html.replace(/<(ul|ol)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (raw, tag, _attr, inner) => {
    const items = (inner.match(/<li[\s\S]*?<\/li>/gi) ?? []).map((li: string) => li.replace(/<\/?li[^>]*>/gi, "").trim()).filter(Boolean);
    if (items.length < 4) { // ★짧은 리스트=중앙 불릿 문단들(유저 교본: 항목 사이 빈 줄 — 붙이면 답답)
      return items.map((it: string) => `<p style="text-align:center;word-break:keep-all">• ${it}</p>`).join("");
    }
    const ol = String(tag).toLowerCase() === "ol";
    const rows = items.map((it: string, i: number) => `<tr><td>${ol ? `<b>${i + 1}.</b> ` : "• "}${it}</td></tr>`).join("");
    return `<table><tbody>${rows}</tbody></table>`;
  });
}

function applySpacingRich(html: string): string {
  const { blocks } = walkBlocks(html);
  if (blocks.length === 0) return html;
  let out = "";
  for (let i = 0; i < blocks.length; i++) {
    if (i > 0) out += BLANK_P.repeat(gapBetween(blocks[i - 1], blocks[i]));
    out += blocks[i].raw;
  }
  return out;
}

/* ── ★크기 위계 — 밀도 블록 축소(13px), 강조/브릿지 확대(17px). 네이버 생존은 실측 체크리스트로. ── */
// ★표 규격(평가 반영) — 네이버 붙여넣기 생존을 위해 인라인 보더·패딩 주입, 셀 좌정렬.
function styleTables(html: string): string {
  return html
    .replace(/<table(\s[^>]*)?>/gi, '<table style="border-collapse:collapse;width:100%;margin:8px 0">')
    .replace(/<th(\s[^>]*)?>/gi, '<th style="border:1px solid #ddd;padding:8px 10px;background:#f7f8fa;text-align:left;font-size:14px">')
    .replace(/<td(\s[^>]*)?>/gi, '<td style="border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:14px">');
}

function applySizing(html: string): string {
  return html.replace(/<(p|blockquote|ul|ol)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (raw, tag, attr, inner) => {
    const t = String(tag).toLowerCase();
    const addStyle = (r: string, css: string) => /style="/.test(r) ? r.replace(/style="([^"]*)"/, `style="$1;${css}"`) : r.replace(new RegExp(`^<${t}`), `<${t} style="${css}"`);
    if (t === "blockquote") {
      const len = visLen(inner);
      if (len <= 44) return addStyle(raw, "font-size:17px;font-weight:700"); // ★도입 훅 인용(유저 교본) — 크고 진하게
      if (len > 44) { // 모바일 2줄(약 44자) 초과 → 축소 + 의미 단위 줄 분리
        const parts = inner.split(/(?<=[.?!,，])\s+/).map((x: string) => x.trim()).filter(Boolean);
        const joined = parts.length > 1 ? parts.join("<br>") : inner;
        return addStyle(`<blockquote${attr ?? ""}>${joined}</blockquote>`, "font-size:14px");
      }
      return raw;
    }
    if (t === "ul" || t === "ol") {
      const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1].replace(/<[^>]+>/g, ""));
      const dense = items.length >= 6 || items.some((it) => [...it].length > CHARS_PER_LINE_PUB); // 6항목+ 또는 줄바꿈 발생
      if (dense) {
        const shrunk = raw.replace(/<li(\s[^>]*)?>/gi, (lm: string) => /style="/.test(lm) ? lm.replace(/style="([^"]*)"/, 'style="$1;font-size:13px"') : lm.replace(/^<li/, '<li style="font-size:13px"'));
        return addStyle(shrunk, "font-size:14px");
      }
      return raw;
    }
    // p: <b> 단독 문단(강조/브릿지) → 확대
    if (/^\s*<b(?![^>]*background)[^>]*>[\s\S]{2,80}<\/b>\s*$/.test(inner)) return addStyle(raw, "font-size:18px");
    if (t === "p" && !/font-size/.test(String(attr ?? ""))) return addStyle(raw, "font-size:16px;word-break:keep-all"); // ★16px+어절 단위 줄바꿈(실측: 포/인트예요 단어 잘림)
    return raw;
  });
}

/* ── 형광펜·해시태그 ── */
// ★형광펜 총량 게이트(실측: 도배 — 3줄짜리 통형광 다수) — 규칙 위반은 코드가 강등한다.
//  70자 초과=무조건 해제(면적 도배), 문장급(15~70자)=글 전체 3개까지, 구급(≤14자)=5개까지. 초과분은 볼드로.
function capMarks(html: string): string {
  // ★고아 태그 방어 — <mark> 열림/닫힘 불균형이면 형광 전부 해제(도배보다 무강조가 낫다)
  const opens = (html.match(/<mark>/g) ?? []).length;
  const closes = (html.match(/<\/mark>/g) ?? []).length;
  if (opens !== closes) return html.replace(/<\/?mark>/g, "");
  let sentCount = 0, phraseCount = 0;
  return html.replace(/<mark>([\s\S]*?)<\/mark>/g, (raw, inner) => {
    const len = [...String(inner).replace(/<[^>]+>/g, "")].length;
    if (len > 70) return `<b>${inner}</b>`;
    if (len >= 15) { sentCount += 1; return sentCount <= 3 ? raw : `<b>${inner}</b>`; }
    phraseCount += 1; return phraseCount <= 5 ? raw : `<b>${inner}</b>`;
  });
}

function markToBold(html: string): string {
  // ★전부 인라인(유저 교본 최종: 단독 줄 강제가 '…경향' 형광 뒤 '이 있어요' 고아 조각을 만들었다) — 문장 흐름 절대 보존
  html = html.replace(/<mark>([\s\S]*?)<\/mark>/g, '<b style="background-color:#fff3a8;">$1</b>');
  return html.replace(/<\/?mark>/g, ""); // 잔여 고아 태그 소거(도배 방어)
}
function hashtagGroups(tags?: string[]): string[] {
  const list = (tags ?? []).map((t) => String(t).trim().replace(/^#/, "")).filter(Boolean).map((t) => `#${t}`);
  const groups: string[] = [];
  for (let i = 0; i < list.length; i += 3) groups.push(list.slice(i, i + 3).join(" ")); // 2~3개 단위 줄
  return groups;
}
function hashtagLine(tags?: string[]): string { return hashtagGroups(tags).join(" "); }

/* ── 최종 발행 본문 (미리보기·검증·복사 공용) ── */
export function formatBody(input: PublishInput, opts?: { withImages?: boolean }): string {
  const withImages = opts?.withImages ?? true;
  let idx = -1;
  // ★사진 자리는 '구조화 슬롯'으로만 — 채워진 슬롯만 이미지로, 미충족 슬롯은 줄 자체를 제거(안내문구 유출 금지).
  let body = markToBold(capMarks(input.bodyHtml)).replace(SLOT_RE, () => {
    idx += 1;
    if (!withImages) return `<p>[사진 ${idx + 1}]</p>`; // marker 모드(수동 배치) — 명시적 선택
    const url = input.images?.[idx];
    if (!url) return ""; // 미충족 → 제거(마커·지시 노출 안 함)
    const isAi = input.aiImageIdx?.includes(idx);
    // ★AI 생성분 캡션 자동(오인 방지) — 참고 이미지 명시가 신뢰를 지킨다
    return `<p><img src="${url}" alt="" /></p>${isAi ? `<p><span style="font-size:12px;color:#999">AI로 제작한 참고 이미지입니다. 실제와 다를 수 있어요.</span></p>` : ""}`;
  });
  // ★해시태그는 본문에 넣지 않는다 — 네이버가 본문 #태그를 태그칸에 자동 등록해 '본문+태그칸' 중복이 생김.
  //  태그는 발행 위저드의 '태그' 단계에서 태그칸 전용으로 복사(hashtagGroups는 그 용도로 유지).
  // 최종 게이트: rich는 사진 마커/지시·이모지 전면 제거. marker 모드(수동 배치)는 [사진 N] 유지하고 이모지만.
  const gated0 = withImages ? sanitizeForCopy(body) : stripEmoji(body);
  const gated = sanitizeUrls(gated0, { allowNaverBlogId: input.ownNaverBlogId }).html; // ★소급 정화 — 내 블로그 전편 링크는 통과
  // 파이프: 분할 → 정렬 → 크기 위계 → ★여백 스케일 v2(마크업 스페이서) → 서스펜스(마킹 예외)
  let out = applySuspenseBreaks(applySpacingRich(styleTables(applySizing(styleBlocks(listsToTable(styleMarkers(arrowChainToSteps(splitLongParagraphs(gated)))))))));
  // ★클로징(뉴스룸 마감 문법) — 얇은 경계선 + 중앙 작은 이미지(보통 썸네일). withImages(rich)일 때만.
  if (withImages && input.closingImageUrl) {
    out += `<p><br /></p><p style="text-align:center;"><span style="display:inline-block;width:55%;border-top:1px solid #d9dde3;">&nbsp;</span></p><p style="text-align:center;"><img src="${input.closingImageUrl}" alt="" width="300" /></p>`;
  }
  return out;
}

// rich 모드 — 사진자리를 이미지로.
export function buildRichHtml(input: PublishInput): string {
  return formatBody(input, { withImages: true });
}
// marker 모드 — 이미지 없이 [사진 N] 마커만.
export function buildMarkerHtml(input: PublishInput): string {
  return formatBody(input, { withImages: false });
}

// text/plain — ★rich(formatBody)에서 파생: 여백 스케일·서스펜스·해시태그 그룹이 rich와 항상 동일(단일 소스).
//  채워진 사진 슬롯은 [사진 N](모바일 삽입 위치), 미충족은 제거(formatBody와 동일 규칙).
function tableToLines(html: string): string {
  return html.replace(/<table[\s\S]*?<\/table>/gi, (t) => {
    const rows = [...t.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) =>
      [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => c[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(" : ")
    ).filter(Boolean);
    return `<p>${rows.join("</p><p>")}</p>`;
  });
}
export function buildPlainText(input: PublishInput): string {
  const rich = tableToLines(formatBody(input, { withImages: true })); // 표 → '항목 : 값' 줄(모바일 plain)
  let n = 0;
  const text = rich
    .replace(new RegExp(BLANK_P.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "\n") // 스페이서 1개 = 빈 줄 1
    .replace(/<p[^>]*><img[^>]*><\/p>/gi, () => { n += 1; return `[사진 ${n}]\n`; })
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)") // 전편 링크 등 — plain에도 URL 보존
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|blockquote|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{6,}/g, "\n\n\n\n\n") // 상한 4 빈 줄(=개행 5) 캡 — 압축 아님
    .replace(/^[\n\s]+|[\n\s]+$/g, "");
  return text;
}

// 본문 내 사진자리 개수.
export function countPhotoSlots(bodyHtml: string): number {
  return (bodyHtml.match(SLOT_RE) ?? []).length; // 사진+카드 슬롯 총수
}
