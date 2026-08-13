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
  topImageUrl?: string | null; // ★썸네일 맨 위 배치(2026-07-10 유저) — 제목 바로 아래 대표컷
}

const PHOTO_RE = /\[사진:\s*([^\]]+)\]/g;
// ★슬롯 통합 — 사진·카드 둘 다 이미지 슬롯. 문서 순서로 인덱싱, images 맵이 URL 제공(사진=Gemini, 카드=satori).
// ★유저가 찾아 넣는 3종 추가(2026-08-05): 브랜드·표·인물.
//  ★이걸 안 넣으면 새 마커가 파싱 대상이 아니라 대괄호째로 발행본에 노출된다 —
//   마커를 만들 때는 '그리는 쪽'과 '지우는 쪽'을 반드시 같이 고쳐야 한다.
const SLOT_RE = /\[(사진|카드|차트|브랜드|표|인물):\s*([^\]]+)\]/g;
// ★"find" = 유저가 웹에서 찾아 넣는 자리(브랜드·표·인물). AI로 그리면 안 된다 —
//  로고·표는 애초에 그릴 수 없고(글자), 크레딧만 태우고 쓰레기 이미지가 나온다.
//  ★타입을 안 나누면 소비하는 쪽이 desc 문자열을 냄새 맡아 판단하게 된다(반드시 어긋난다).
export interface Slot { type: "photo" | "card" | "find"; desc: string }
// 본문의 슬롯을 문서 순서로 파싱(생성 파이프라인이 타입별로 렌더).
export function parseSlots(bodyHtml: string): Slot[] {
  const out: Slot[] = [];
  const re = /\[(사진|카드|차트|브랜드|표|인물):\s*([^\]]+)\]/g;
  const FIND = new Set(["브랜드", "표", "인물"]); // 유저가 웹에서 찾아 넣는 것 — 우리가 그리지 않는다
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyHtml))) {
    const kind = m[1]!;
    const prefix = kind === "차트" ? "차트: " : FIND.has(kind) ? `${kind} 찾기: ` : "";
    out.push({ type: FIND.has(kind) ? "find" : kind === "카드" ? "card" : "photo", desc: prefix + m[2]!.trim() });
  }
  return out;
}
// 카드 마커 desc('라벨=값 | 라벨=값') → CardItem 파싱.
export function parseCardItems(desc: string): { label: string; value: string }[] {
  return desc.split("|").map((seg) => { const [label, ...rest] = seg.split("="); return { label: (label ?? "").trim(), value: rest.join("=").trim() }; }).filter((x) => x.label && x.value).slice(0, 3);
}
// ★유출 판정 — '콜론형 원본 마커([사진: 설명])'와 '독자용 지시 문구'만 유출로 본다.
//  깨끗한 '[사진 N]'(모바일 삽입 위치 표시)은 정상이라 건드리지 않는다.
const PHOTO_MARKER_ANY_G = /\[\s*(?:사진|카드|브랜드|표|인물)[^\]]*\]/g;         // 모든 [사진/카드...] (rich에선 하나도 없어야)
const INSTRUCTION_SRC = "\\[\\s*(?:사진|브랜드|표|인물)\\s*:[\\s\\S]*?\\]|사진을?\\s*(여기에\\s*)?(올려|넣어|추가|삽입)\\s*주세요";
const INSTRUCTION_G = new RegExp(INSTRUCTION_SRC, "g");        // 콜론형 + 지시 문구
// 이모지·픽토그램·기호(화살표 U+2190~21FF·가운뎃점·불릿은 보존).
const EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2300}-\u{23FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2049}\u{203C}\u{2122}\u{2139}]/gu;
// ★포맷 v3(네이버 공식 블로그팀 문법) — 포인트 이모지 화이트리스트만 통과(도배 방지), 그 외 전부 제거.
// ★정책 전환(2026-07-13 유저 확정 — 금융보카 레퍼런스): 가벼운 이모지 간간히 허용. 도배 우려는 금지가 아니라 '총량 캡'으로 해소.
const EMOJI_ALLOW = ["📌", "💡", "⚠️", "✔️", "👀", "😊", "😂", "🎯", "💰", "🙌"];
const EMOJI_CAP = 8; // ★6→8(2026-08-11 유저 2차: 이모지 더) — 📌 제외 글당 상한, 초과분은 뒤에서부터 소거
export function stripEmoji(s: string): string {
  const MASK = "\u0000EM";
  let out = s;
  EMOJI_ALLOW.forEach((e, i) => { out = out.split(e).join(`${MASK}${i};`); });
  out = out.replace(EMOJI_RE, "");
  EMOJI_ALLOW.forEach((e, i) => { out = out.split(`${MASK}${i};`).join(e); });
  // 총량 캡 — 📌 외 허용 이모지가 EMOJI_CAP을 넘으면 초과분(뒤쪽부터) 제거
  let seen = 0;
  out = out.replace(/📌|💡|⚠️|✔️|👀|😊|😂|🎯|💰|🙌/gu, (m) => {
    if (m === "📌") return m;
    seen += 1;
    return seen <= EMOJI_CAP ? m : "";
  });
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
const SUSPENSE_SPACER = '<p style="text-align:left"><br></p><p style="text-align:left"><br></p><p style="text-align:left"><br></p>'; // ★빈 줄 3칸(2026-07-14 여백 다이어트로 일반 문단이 2칸이 되며 대비 복원 — 서스펜스=일반+1)
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

const MOBILE_MAX_CHARS = 72; // 390px 4줄(약 18자 x 4) — ★개행 v6(2026-07-17 유저: 한 줄 띄어쓰기 포함 18자 상한)
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

// ★주소 보호(2026-08-11 유저: "주소는 띄어쓰기 없이 한 문단에서 끝내") — 프로토콜 없는 도메인까지 잡는다
const BARE_URL_RE = /(https?:\/\/|www\.|[a-z0-9-]{2,}\.(?:go|or|co)\.kr\b|[a-z0-9-]{2,}\.(?:kr|com|net|org)\b)/i;
/** 모델이 주소 안에 넣은 공백·개행을 재접합한다("bokjiro.go. kr" → "bokjiro.go.kr"). 좌변을 ASCII 도메인 조각으로 한정해 한글 문장 끝 마침표는 안 건드린다. */
/** ★표 칸수 정규화(2026-08-14 실측: '농협 적금' 표에서 '총 납입액' 행이 셀 하나라 3칸 표가 어긋나 보임).
 *  머리행보다 칸이 모자란 행은 빈 칸으로 채운다 — 값을 지어내지 않고 렌더 붕괴만 막는다(내용 교정은 재생성 게이트 몫). */
export function normalizeTableColumns(html: string): string {
  return String(html ?? "").replace(/<table[\s\S]*?<\/table>/gi, (tbl) => {
    const rows = tbl.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    const count = (r: string) => (r.match(/<t[dh]\b/gi) ?? []).length;
    const max = Math.max(0, ...rows.map(count));
    if (!max) return tbl;
    let out = tbl;
    for (const r of rows) {
      const c = count(r);
      if (c > 0 && c < max) out = out.replace(r, r.replace(/<\/tr>/i, `${"<td></td>".repeat(max - c)}</tr>`));
    }
    return out;
  });
}

/** ★소수점 재접합(2026-08-14 실측: 'PF 금리 0.5%p'가 '0.' / '5%p' 줄로 쪼개져 발행) — 숫자.줄바꿈.숫자는 소수점이다. */
export function fixSplitDecimals(html: string): string {
  return String(html ?? "").replace(/(\d)\.\s*(?:<\/p>\s*<p[^>]*>|<br\s*\/?>|\n)+\s*(\d)/gi, "$1.$2");
}

/** ★이중 마무리 재배치(2026-08-14 실측 2회: 댓글 질문 뒤에 요약 불릿이 또 붙음 — 경고 게이트는 재생성 예산이 없으면 그대로 나간다).
 *  댓글 문단 뒤의 불릿 블록을 댓글 문단 앞으로 옮긴다 — 내용은 그대로, 순서만 바로잡는다. */
export function fixDoubleClosing(html: string): string {
  const s = String(html ?? "");
  const ci = s.lastIndexOf("댓글");
  if (ci < 0) return s;
  const pStart = s.lastIndexOf("<p", ci);
  const pEnd = s.indexOf("</p>", ci);
  if (pStart < 0 || pEnd < 0) return s;
  const tail = s.slice(pEnd + 4);
  const m = tail.match(/^(?:\s|<(?:ul|ol)[\s\S]*?<\/(?:ul|ol)>|<p[^>]*>\s*(?:•|·)[\s\S]*?<\/p>|<blockquote[\s\S]*?<\/blockquote>)+/i);
  if (!m || !/<(ul|ol)|•|·/.test(m[0])) return s;
  return s.slice(0, pStart) + m[0].trim() + s.slice(pStart, pEnd + 4) + tail.slice(m[0].length);
}

export function fixBrokenUrls(html: string): string {
  let out = String(html || "");
  const SEP = String.raw`(?:\s|<br\s*\/?\s*>)+`;
  const FRAG = new RegExp(String.raw`([A-Za-z0-9-]{2,}\.)` + SEP + String.raw`((?:[A-Za-z0-9-]+\.)*(?:kr|com|net|org|go|or|co)\b)`, "g");
  for (let i = 0; i < 3; i++) out = out.replace(FRAG, "$1$2");
  out = out.replace(/([A-Za-z0-9-]{2,})\s+\.((?:go|or|co)\.kr|kr|com|net|org)\b/g, "$1.$2");
  return out;
}

/* ── 안전망: 4줄 초과 문단 자동 분할 (문장 → 쉼표 → 어절) ── */
// ★유저 교본(2026-07-07): 문단을 쪼개면(빈 줄) 흐름이 끊긴다 — 같은 문단 안에서 <br>로 '의미 구 줄바꿈'.
//  문장별 한 줄. 문장이 길면(>44자) 쉼표·연결어미 구 경계에서 균형 줄바꿈(양쪽 12자 이상일 때만 — 고아 조각 금지).
function breakSentence(sen: string): string {
  // ★개행 v6(2026-07-17 유저 확정 — 중앙 정렬 유지 조건): 한 줄 '띄어쓰기 포함 18자' 상한, 꼬리줄 5자 미만 금지(달랑 1~2자 줄 = 흉함).
  //  의미 경계(조사·어미·쉼표) 우선, 없으면 어절(공백) 경계 폴백 — 단어 중간 억지 절단은 여전히 금지. URL 포함 문장은 통줄(실측: 고용24 깨짐).
  // ★URL 감지 확장(2026-08-11 유저 실물: "kr가 밑줄로 내려감") — https만 보던 게 구멍이었다.
  //  프로토콜 없는 주소(www.gov.kr·bokjiro.go.kr)도 통줄 — 주소 포함 문장은 절대 안 자른다.
  if (/<br/i.test(sen) || BARE_URL_RE.test(sen)) return sen;
  const tokens = sen.split(/(<[^>]+>)/).filter((t) => t !== "");
  const plain = tokens.filter((t) => !t.startsWith("<")).join("");
  // ★v6.1(2026-07-17 실측 3건): ①20자 이하 문장은 통줄("하면 돼요." 조각 방지 — 미세 초과는 자연 wrap이 흡수)
  //  ②의존어('게·것·수' 등)가 줄머리로 떨어지는 분할 감점 ③숫자+단위('2주') 뒤 의존어('뒤인') 분리 감점.
  if (visLen(plain) <= 20) return sen;
  const CLAUSE = /([,，、]\s+|(?:에서|라면|다면|하면|이면|는데|면서|하고|하며|지만|므로|위해|통해|보다|까지|경우|대해|따라)\s+|[가-힣]{2,}[은는도을를]\s+)/g;
  const DEP_HEAD_RE = /^(게|것[이은을도]?|수[가는도]?|때[가는에도]?|중[이에]?|만[에큼]?|지|채로?|둥|편|셈|김|바|데|줄|뿐|번째?|적|만큼|정도|이상|이하|이내|안에|만에|동안|뒤[가-힣]{0,2}|전[은는에엔]?|후[가-힣]{0,2})[,.!?]?$/;
  const cutOffsets: number[] = [];
  let rest = plain, base = 0, guard = 0;
  while (visLen(rest) > 20 && guard++ < 8) {
    const clauseCands: number[] = [];
    let m: RegExpExecArray | null;
    CLAUSE.lastIndex = 0;
    while ((m = CLAUSE.exec(rest))) clauseCands.push(m.index + m[0].length);
    // 어절(공백) 폴백 후보 — 의미 경계가 밴드 안에 없을 때만 쓴다(공백 뒤에서 자름)
    const spaceCands: number[] = [];
    const SP = /\s+/g;
    while ((m = SP.exec(rest))) spaceCands.push(m.index + m[0].length);
    const pick = (cands: number[]): number => {
      let best = -1, bestD = Infinity;
      for (const cut of cands) {
        const left = visLen(rest.slice(0, cut).trimEnd()); // 꼬리 공백 제외(실측: 쉼표 경계가 19로 계산돼 탈락 → 5자 조각)
        if (left < 6 || left > 18 || visLen(rest.slice(cut)) < 6) continue; // 좌 6~18자 밴드 + 우측 최소 6자(꼬리줄 보장)
        const nextTok = (rest.slice(cut).match(/^\S+/) ?? [""])[0];
        const prevTok = (rest.slice(0, cut).trim().match(/\S+$/) ?? [""])[0];
        const depPenalty = DEP_HEAD_RE.test(nextTok) ? 100 : 0; // 의존어 줄머리 — 사실상 금지
        const numTail = /^\d/.test(prevTok) && [...nextTok].length <= 3 ? 100 : 0; // '2주 / 뒤인' — 숫자 단위와 의존어 분리 금지
        const dateSplit = /\d+(년|월)[,，]?$/.test(prevTok) && /^\d/.test(nextTok) ? 100 : 0; // ★'7월 / 22일' 분리 금지(2026-08-11 유저: "날짜 내려쓰면 보기 이상해요")
        const d = Math.abs(left - 15) + depPenalty + numTail + dateSplit;
        if (d < bestD) { bestD = d; best = cut; }
      }
      return bestD >= 100 ? -1 : best; // 감점 후보뿐이면 이 라운드는 자르지 않는다(어색한 절단보다 긴 줄)
    };
    let best = pick(clauseCands);
    if (best < 0) best = pick(spaceCands); // 의미 경계가 없으면 어절 경계 — 18자 상한은 지킨다
    if (best < 0) break; // 좋은 절단점 없음 — 단어 중간 절단·의존어 고아보다 자연 wrap
    cutOffsets.push(base + best);
    base += best;
    rest = plain.slice(base);
  }
  if (cutOffsets.length === 0) return sen;
  let acc = 0, ci = 0;
  const out: string[] = [];
  for (const tok of tokens) {
    if (tok.startsWith("<")) { out.push(tok); continue; }
    let t = tok, consumed = 0;
    while (ci < cutOffsets.length) {
      const target = cutOffsets[ci]! - acc - consumed;
      if (target <= 0 || target >= t.length) break;
      out.push(t.slice(0, target), "<br>");
      t = t.slice(target);
      consumed += target;
      ci += 1;
    }
    out.push(t);
    acc += tok.length;
  }
  // ★경계 공백 삼킴(2026-07-20 실측: '계약 종류를␣'+개행 — 줄꼬리 공백이 중앙정렬 기준점을 왼쪽으로 민다)
  return out.join("").replace(/[  \t]+(<br\s*\/?>)/gi, "$1").replace(/(<br\s*\/?>)[  \t]+/gi, "$1");
}
function splitInner(inner: string): string[] {
  // ★마커 문단 보호 — 절 개행이 [관련글]/[마무리관련글]/[사진] 마커 안에 <br>을 박으면 변환 정규식이 죽는다(실측: 3층 블록 미출력·마커 원형 노출)
  if (/\[(?:마무리)?관련글:|\[(?:사진|카드|차트):|\[링크 카드/.test(inner)) return [inner];
  inner = fixBrokenUrls(inner); // ★주소 재접합을 개행보다 먼저 — 붙여야 통줄 보호(BARE_URL_RE)가 잡는다(2026-08-11)
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
    if (/^blockquote$/i.test(String(tag))) return /style=/.test(attr ?? "") ? m.replace(/style="([^"]*)"/, 'style="$1;text-align:center"') : m.replace(/>$/, ' style="text-align:center">'); // ★도입 훅 인용구는 중앙 유지(2026-07-10 유저 확인 — 좌측 문서체 속 유일한 중앙 포인트)
    if (/^(ul|ol|li)$/i.test(String(tag))) return /style=/.test(attr ?? "") ? m.replace(/style="([^"]*)"/, 'style="$1;text-align:left"') : m.replace(/>$/, ' style="text-align:left">'); // ★리스트는 항상 좌(유저 교본: 불릿 중앙정렬 금지)
    if (/text-align\s*:\s*center/.test(attr ?? "")) return m; // ★중앙 안내 블록(포맷 v3) — 엔진 지정 존중
    if (/style=/.test(attr ?? "")) return m.replace(/style="([^"]*)"/, `style="$1;text-align:${align}"`);
    return m.replace(/>$/, ` style="text-align:${align}">`);
  });
}

/* ── ★여백 스케일 v2 — 블록 무게 비례. 여백은 CSS가 아니라 '마크업'(스페이서 문단)으로 넣는다(네이버 실렌더 = 미리보기 = 복사본 동일). ── */
//  소제목 앞3·뒤2 / 문단 사이2 / 4줄↑ 긴 블록 위아래2 / 강조 문장 위아래2 / 해시태그 앞2. 연속 빈 줄 상한 4(압축 아님 — 캡만).
//  ★숫자 갱신(2026-08-05): 2026-07-14 여백 다이어트 이후 실제 값과 이 주석이 어긋나 있었다.
export const BLANK_P = '<p style="text-align:left"><br></p>'; // 네이버 스마트에디터ONE 생존형 빈 줄
const BLANK_CAP = 3; // ★실측: FAQ·요약 주변 여백 과다 — 상한 4→3
const CHARS_PER_LINE_PUB = 18; // ★개행 v6(2026-07-17) — 한 줄 18자 상한과 동조(여백 줄 수 추정용)
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
function isEmojiOnlyPara(b: Blk): boolean { // 📌 단독 문단 — 다음 블록을 가리키는 라벨
  const t = b.inner.replace(/<[^>]+>/g, "").trim();
  return b.tag === "p" && t.length <= 3 && /[📌]/u.test(t);
}
function isBulletPara(b: Blk): boolean { // 불릿·리스트 문단(ul/ol 또는 평문 불릿)
  return /^(ul|ol)$/.test(b.tag) || (b.tag === "p" && /^\s*(?:<[^>]+>\s*)*[•・·]/.test(b.inner));
}
function beforeBlanks(b: Blk): number {
  if (isSuspenseMark(b)) return 0; // 여백은 서스펜스 확장 전담
  if (/^h[1-4]$/.test(b.tag)) return 3;
  if (isHashtagPara(b)) return 2;
  if (isEmphasisPara(b)) return 2;
  if (!isImagePara(b) && blockLines(b.inner) >= 4) return 2; // ★3→2(실측: 과다)
  return 2; // ★여백 다이어트 반대급부(2026-07-14 유저: 빽빽함 — 승지 교본): 일반 문단 사이 기본 2칸(숨통)
}
function afterBlanks(b: Blk): number {
  if (isSuspenseMark(b)) return 0;
  if (/^h[1-4]$/.test(b.tag)) return 1;
  if (isEmphasisPara(b)) return 2;
  if (!isImagePara(b) && blockLines(b.inner) >= 4) return 2; // ★3→2
  return 2; // ★문단 사이 기본 2칸
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
  if (isQPara(c)) return /^h[1-4]$/.test((prev as Blk).tag) ? 2 : 3; // 헤더 직후 첫 Q는 2(유저: 위3·아래2 리듬)
  if (isQPara(prev as Blk)) return 1;
  // ★📌 라벨 밀착(유저 최종: 위2·아래1 — 아래도 2칸이면 뭘 가리키는지 모름)
  if (isEmojiOnlyPara(prev as Blk)) return 1;
  if (isEmojiOnlyPara(c)) return 2;
  // ★리스트 리듬(유저 최종: 리스트 사이는 1칸 — 2줄짜리만 2칸이던 것 통일)
  if (isBulletPara(prev as Blk) && isBulletPara(c)) return 1;
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
  // ★소제목 앞 구분선 재도입(2026-07-15 유저: "단락마다 구분선"). 첫 h2 제외(도입 직후 과밀 방지).
  //  ★문자 구분선으로 교체(2026-07-17 실측: border 계열 인라인 스타일은 네이버 붙여넣기에서 소실 — 구분선·세로바 동시 실종).
  //  글자(U+2500)와 color·정렬은 복붙에서 살아남는 검증된 속성이다.
  {
    const DIVIDER = '<p style="text-align:center;color:#d9dde3;font-size:14px">───────</p>';
    let h2Seen = 0;
    html = html.replace(/<h2(\s[^>]*)?>/gi, (m) => { h2Seen += 1; return h2Seen === 1 ? m : `${DIVIDER}${m}`; });
  }

  // ★소제목 네이버 공식 문법(유저 레퍼런스: 블로그팀 공식 — 파란 큰 소제목이 섹션 마디를 색으로 보여준다)
  html = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, _attr, inner) => {
    const clean = String(inner).replace(/<[^>]+>/g, "").trim();
    // ★소제목 v2.1(2026-07-17 유저: 버티컬 라인 필수 + 실측: border-left는 네이버 붙여넣기에서 소실) —
    //  세로 바를 스타일이 아니라 '글자(▍ U+258D)'로 그린다(파란 글자 = 복붙 생존 검증됨). 텍스트는 진한 검정.
    return `<h2 style="text-align:center;word-break:keep-all;font-size:19px;font-weight:800;color:#191919"><span style="color:#0073e9">▍</span> ${clean}</h2>`;
  });
  // ★※ 각주 — 작은 회색 보조문(레퍼런스 문법: 참고·단서는 본문보다 한 단계 작고 옅게)
  html = html.replace(/<p(\s[^>]*)?>\s*(※[\s\S]*?)<\/p>/gi, (_m, _attr, inner) => {
    return `<p style="text-align:center;font-size:13px;color:#8b95a1;word-break:keep-all">${inner}</p>`;
  });

  // ★평문 불릿 문단 좌정렬(실측: 엔진이 <ul> 대신 <p>・항목</p>로 쓰면 중앙 감김 — 리스트=좌정렬 풀폭 규격 적용)
  html = html.replace(/<p(\s[^>]*)?>(\s*(?:[•・·]|- )[\s\S]*?)<\/p>/g, (_m, _attr, inner) => `<p style="text-align:left;word-break:keep-all">${inner}</p>`);
  // ★단계 블록 승격(유저 교본 최종: 'N단계' 볼드 단독 줄 + 내용 + 단계 간 빈 줄 — 인라인 불릿은 전부 같은 무게라 지루)
  html = html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/g, (m, attr, inner) => {
    const steps = (String(inner).match(/\d{1,2}\s?단계\s?:/g) ?? []).length;
    if (steps < 2) return m;
    // 문단을 단계 단위로 쪼개 각각 별도 문단으로: <b>N단계</b><br>내용
    const parts = String(inner).split(/(?=\d{1,2}\s?단계\s?:)/);
    const head = (parts[0] ?? "").trim();
    const blocks = parts.slice(head && !/^\d{1,2}\s?단계/.test(head) ? 1 : 0).map((seg) => {
      const mm = /^(\d{1,2})\s?단계\s?:\s*([\s\S]*)$/.exec(seg.trim());
      if (!mm) return "";
      return `<p style="text-align:center;word-break:keep-all"><b>${mm[1]}단계</b><br>${(mm[2] ?? "").replace(/^[・•\s]+/, "").trim()}</p>`;
    }).filter(Boolean).join("");
    const lead = head && !/^\d{1,2}\s?단계/.test(head) ? `<p${attr ?? ""}>${head}</p>` : "";
    return lead + blocks;
  });
  // 불릿 안의 단계('• 1단계: ...' 각각 별도 문단으로 온 경우)도 같은 승격
  html = html.replace(/<p(\s[^>]*)?>\s*[・•]?\s*(\d{1,2})\s?단계\s?:\s*([\s\S]*?)<\/p>/g,
    (_m, _attr, n, body) => `<p style="text-align:center;word-break:keep-all"><b>${n}단계</b><br>${String(body).trim()}</p>`);

  // ★깨진 태그 잔재 소거(실측: style="background-color:#fff3a8;"> 텍스트 노출) — 태그 시작(<) 없이 속성 문자열이 텍스트로 남은 것
  html = html.replace(/([가-힣)\].,!?%])\s*(?:style|class)="[^"<>]*"\s*\/?>/g, "$1 "); // 앞 문자가 한글·문장부호일 때만 — 숫자 제외(h2·h3의 2·3이 매치돼 소제목 태그를 파손하던 실측 버그)

  // ★엔진이 평문으로 쓴 '함께 보면 좋은 글' 라벨 소거(규격 위반 실측: 블록 2회) — 라벨은 시스템 산출(하단 3층) 전용
  html = html.replace(/<p[^>]*>\s*(?:<b[^>]*>)?\s*함께\s?보면\s?좋은\s?글\s*[:：]?\s*(?:<\/b>)?\s*<\/p>/g, "");
  // ★'함께 보면 좋은 글' — 마커 2~3개를 한 블록으로 묶는다(2026-08-04 유저: "2~3개도 링크 본문에 나오게,
  //  이상한 데 숨기지 말고"). 종전엔 마커마다 제 블록을 만들어 같은 제목이 두세 번 반복되거나,
  //  '마지막 것만 남기는' 옛 방어가 앞엣것을 지워 결국 한 개만 남았다 — 둘 다 유저가 원한 모습이 아니다.
  //  ★안내 문구 상자도 뺀다. 독자가 보는 본문에 시스템 지시문이 서 있을 이유가 없다 —
  //   제목 아래 주소를 그대로 두면 네이버 편집기가 붙여넣는 순간 링크로 만든다.
  {
    const marks = [...html.matchAll(/\[마무리관련글:\s*(https?:[^\s|\]]+)\s*\|\s*([^|\]]+?)\s*(?:\|[^\]]*)?\]/g)];
    if (marks.length) {
      const seen = new Set<string>();
      const items: string[] = [];
      for (const m of marks) {
        const url = String(m[1]).split("?")[0]; // 트래킹 파라미터 제거 — 원형만
        const title = String(m[2]).trim().replace(/</g, "");
        if (!url || seen.has(url)) continue; // 같은 글 두 번 금지
        seen.add(url);
        if (items.length >= 3) continue;     // 유저 확정: 2~3개
        items.push(`<p style="text-align:center;font-size:13.5px;color:#4e5968">${title}<br><span style="font-size:12.5px;color:#8b95a1">${url}</span></p>`);
      }
      const block = items.length
        ? `<p style="text-align:center;font-size:15px;font-weight:700">함께 보면 좋은 글</p>${items.join("")}`
        : "";
      // 첫 마커 자리에 블록을 놓고(=해시태그 위), 나머지 마커는 문단째 지운다
      let placed = false;
      html = html.replace(/<p[^>]*>\s*\[마무리관련글:[^\]]*\]\s*<\/p>|\[마무리관련글:[^\]]*\]/g, () => {
        if (placed) return "";
        placed = true;
        return block;
      });
    }
  }
  // ★중간 [관련글:] 마커 — 전면 제거(유저 확정: 내부링크는 하단 '함께 보면 좋은 글'만) — 기존 생성 글의 마커도 조립 시 소거
  html = html.replace(/\[관련글:\s*(https?:[^\s|\]]+)\s*\|\s*([^\]]+)\]/g, "");
  // ★변환에 실패한 마커는 반드시 지운다(2026-08-04 유저 실물: 대괄호 원문 3줄이 글 끝에 그대로 노출).
  //  주소가 빠졌거나 모양이 깨진 마커는 링크가 될 수 없다 — 그럴 땐 '없는 것'이 맞다.
  //  원문 노출은 독자에게 시스템 내부 문법을 보여 주는 사고고, 그 한 줄이 글 전체의 신뢰를 깎는다.
  html = html.replace(/<p[^>]*>\s*\[(?:마무리)?관련글:[^\]]*\]\s*<\/p>/g, "").replace(/\[(?:마무리)?관련글:[^\]]*\]/g, "");
  // ★중복 링크 게이트 — 같은 URL이 2회 이상이면 두 번째부터 문단 제거(엔진 위반 방어)
  {
    const seen = new Set<string>();
    html = html.replace(/<p[^>]*>(?:[^<]|<br\s*\/?>|<b[^>]*>[^<]*<\/b>|<span[^>]*>[^<]*<\/span>)*?(https?:\/\/blog\.naver\.com\/[^\s<]+)[\s\S]*?<\/p>/g, (m, url: string) => {
      const k = url.split("?")[0];
      if (seen.has(k)) return "";
      seen.add(k);
      return m;
    });
  }
  let qNum = 0; // ★FAQ 질문 자동 번호(유저 교본: 1. 2. 3. 진행감)
  html = html.replace(/<(h[2-4])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (raw, tag, attr, inner) => {
    const plain = String(inner).replace(/<[^>]+>/g, "").trim();
    if (/자주 묻는 질문|FAQ/i.test(plain)) return `<${tag}${attr ?? ""}><b>${plain}</b></${tag}>`; // ★다이어트 v3(2026-07-17): 헤더 형광 배경 제거 — 볼드만
    return raw;
  });
  return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (raw, attr, inner) => {
    const plain = String(inner).replace(/<[^>]+>/g, "").trim();
    if (/^-{3,}$/.test(plain)) return '<p style="text-align:center;color:#d5d9df;letter-spacing:2px;margin:8px 0">─────</p>';
    if (/^(?:&gt;|>)\s+/.test(plain)) {
      const q = plain.replace(/^(?:&gt;|>)\s+/, "");
      return `<p style="text-align:left;font-size:17px;font-weight:700;color:#33363d;padding:4px 0">“${q}”</p>`;
    }
    if (/^Q[.．]\s?/.test(plain)) { qNum += 1; return `<p><b style="font-size:16px"><span style="color:#1D75F7">${qNum}.</span> ${plain.replace(/^Q[.．]\s?/, "")}</b></p>`; } // Q. → 파랑 번호(구조 라벨)+볼드
    return raw;
  });
}

// ★나열은 표 박스로(유저 확정: 중앙 정렬 본문에서 리스트가 흐름을 끊음 — 박스에 담아 좌정렬 유지)
function listsToTable(html: string): string {
  // ★유저 확정: 리스트는 리스트로 — 단 ★데이터 클러스터는 표로 승격(2026-07-20 실측: 절감률 구간 5줄이 불릿으로 나감 — "표가 압승").
  //  승격 조건: 3항목+ 전부 '라벨: 값' 형태이고 값의 3분의 2 이상에 숫자(단가·구간·기간) — 행동 절차('정부24 접속: …')는 값에 숫자가 없어 리스트 유지.
  return html.replace(/<(ul|ol)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (raw, tag, _attr, inner) => {
    if (/<(table|img)/i.test(inner)) return raw;
    const items = (inner.match(/<li[\s\S]*?<\/li>/gi) ?? []).map((li: string) => li.replace(/<\/?li[^>]*>/gi, "").trim()).filter(Boolean);
    if (items.length < 2) return raw;
    const kv = items.map((it: string) => /^(?:<b>)?([^<:：]{2,16}?)(?:<\/b>)?\s*[:：]\s*([\s\S]{1,40})$/.exec(it.replace(/<(?!\/?b\b)[^>]+>/g, "").trim()));
    if (items.length >= 3 && kv.every(Boolean)) {
      const numeric = kv.filter((m: RegExpExecArray | null) => /\d/.test(m![2]!.replace(/<[^>]+>/g, ""))).length;
      if (numeric * 3 >= items.length * 2) {
        const rows = kv.map((m: RegExpExecArray | null) => `<tr><td>${m![1]!.trim()}</td><td>${m![2]!.replace(/<[^>]+>/g, "").trim()}</td></tr>`).join("");
        return `<table><tr><th>구분</th><th>내용</th></tr>${rows}</table>`;
      }
    }
    const ol = String(tag).toLowerCase() === "ol";
    return items.map((it: string, i: number) => `<p style="text-align:left;word-break:keep-all">${ol ? `<b>${i + 1}.</b> ` : "• "}${it}</p>`).join(""); // ★좌정렬 풀폭(유저: 넓이 꽉꽉)
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
    .replace(/<table(\s[^>]*)?>/gi, '<table style="border-collapse:collapse;width:100%;table-layout:fixed;margin:8px 0">')
    .replace(/<th(\s[^>]*)?>/gi, '<th style="border:1px solid #ddd;padding:8px 10px;background:#f7f8fa;text-align:left;font-size:14px;word-break:keep-all">')
    .replace(/<td(\s[^>]*)?>/gi, '<td style="border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:14px;word-break:keep-all">');
}

function applySizing(html: string): string {
  return html.replace(/<(p|blockquote|ul|ol)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (raw, tag, attr, inner) => {
    const t = String(tag).toLowerCase();
    const addStyle = (r: string, css: string) => /style="/.test(r) ? r.replace(/style="([^"]*)"/, `style="$1;${css}"`) : r.replace(new RegExp(`^<${t}`), `<${t} style="${css}"`);
    if (t === "blockquote") {
      const len = visLen(inner);
      if (len <= 90) return addStyle(raw, "font-size:17px;font-weight:700"); // ★도입 훅 인용 — 길이 무관 크고 진하게(44자 게이트가 47자 훅을 축소하던 실측)
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
//  다이어트 v3(2026-07-17): 70자 초과=해제(면적 도배), 문장급(15~70자)=0(전부 볼드 강등), 구급(≤14자)=2개까지.
//  형광은 '글에서 가장 중요한 수치·기준 하나'의 자리다 — 흔하면 아무것도 형광이 아니다.
// ★형광 표기 정규화(두더지 종결) — 엔진이 <mark>·<b style>·<span style> 어떤 표기로 형광을 써도 <mark>로 통일.
//  이후 capMarks(총량 게이트) 단일 관문 통과 — 표기 변형으로 게이트를 우회하는 경로 자체를 제거.
function normalizeHighlights(html: string): string {
  return html
    .replace(/<(b|strong|span|em|i)((?:\s[^>]*)?style="[^"]*background(?:-color)?\s*:[^"]*")([^>]*)>([\s\S]*?)<\/\1>/gi, "<mark>$4</mark>")
    .replace(/<mark(\s[^>]*)?><mark(\s[^>]*)?>/gi, "<mark>").replace(/<\/mark>\s*<\/mark>/gi, "</mark>");
}

// ★리스트 이중 불릿·발행물 이모지 소거(실측: '• ✅ 배당' — 불릿 위 체크 이모지 중첩, 💡 안내 이모지) — 📌(포인트 승격 규격)은 유지
function stripListEmoji(html: string): string {
  return html
    .replace(/([•·]\s*)(?:✅|☑️|✔️|❌|⭕️|🔹|🔸|▪️)+\s*/gu, "$1") // 불릿 위 체크 중첩만 제거
    .replace(/(?:✅|☑️|🔔|❗️)\s?/gu, ""); // 2026-07-13 정책 전환 — 💡⚠️✔️는 허용(총량 캡이 도배 방지)
}

// ★흑색 벽 코드 게이트(2026-07-13 — 프롬프트 하한이 3번째 미준수): h2 구간에 강조(<b>·<mark>)가 하나도 없으면
//  첫 문단의 첫 문장을 <b>로 승격(직답 규격상 첫 문장=핵심), 볼드 없는 불릿은 '핵심어 — 설명' 앞부분을 볼드.
function ensureSectionEmphasis(html: string): string {
  let out = html.replace(/<li>([^<]{4,80})<\/li>/g, (m, t: string) => {
    if (/<b>|<mark>/.test(m)) return m;
    const sep = t.match(/^(.{2,18}?)\s+[—:-]\s+(.+)$/);
    if (sep) return `<li><b>${sep[1]}</b> — ${sep[2]}</li>`;
    return [...t].length <= 16 ? `<li><b>${t}</b></li>` : m;
  });
  const parts = out.split(/(?=<h2)/);
  out = parts.map((sec, i) => {
    if (i === 0 || /<b>|<mark>/.test(sec)) return sec;
    return sec.replace(/<p>([^<]{12,120}?[.!?])(\s*[^<]*)<\/p>/, (m, first: string, rest: string) => `<p><b>${first}</b>${rest}</p>`);
  }).join("");
  return out;
}

// ★스켈레톤 게이트 ①(2026-07-13) 폐기 — '오늘의 3줄 요약' 블록 자체가 폐기됐다(2026-08-03 유저 확정).
//  종전엔 마무리 불릿에 명명 소제목이 없으면 이 자리에서 '오늘의 3줄 요약' h2를 자동으로 꽂았다.
//  ★프롬프트에서만 블록을 빼고 이걸 남겨 뒀다면, 프롬프트엔 없는 소제목이 발행 때 다시 꽂혔을 것이다
//   — 같은 규격이 여러 곳에 박혀 있으면 한 곳만 고쳤을 때 조용히 되살아난다. 그래서 같이 지운다.
//  (이 함수를 부르던 곳은 아래 파이프라인 한 곳뿐이었다.)

// ★스켈레톤 게이트 ② — 제목이 순위·비교를 약속했는데 표가 없으면 '라벨: 값' 연속 4줄+ 묶음(첫 1곳)을 표로 승격
export function ensurePayoffTable(html: string, title?: string | null): string {
  if (!title || !/(TOP\s*\d|톱\s*\d|순위|비교|\bvs\b|얼마|차이)/i.test(title) || /<table/i.test(html)) return html;
  const LINE = /<p(?:\s[^>]*)?>\s*(?:<b>)?([^<:：]{2,14}?)(?:<\/b>)?\s*[:：]\s*([^<]{1,40}?)\s*<\/p>/g;
  const CLUSTER = /(?:<p(?:\s[^>]*)?>\s*(?:<b>)?[^<:：]{2,14}(?:<\/b>)?\s*[:：]\s*[^<]{1,40}<\/p>\s*){4,}/;
  const m = CLUSTER.exec(html);
  if (!m) return html;
  const rows = [...m[0].matchAll(LINE)].map((r) => `<tr><td>${r[1].trim()}</td><td>${r[2].trim()}</td></tr>`);
  if (rows.length < 4) return html;
  const table = `<table><tr><th>항목</th><th>내용</th></tr>${rows.join("")}</table>`;
  return html.slice(0, m.index) + table + html.slice(m.index + m[0].length);
}

// ★AI 문체 부호 소거(유저 실측: '7월 21일 — 접수 시작 전에' — em dash는 대표적 AI 문체 신호) — 조립 시 일괄 치환
function sanitizeAiPunct(html: string): string {
  return html
    .replace(/([.!?요다])\s*,\s*-+\s*(?=<|$|\s)/g, "$1 ")   // 기저장 글 잔재 '요., -' 정리
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1~$2")        // 숫자 범위 → 물결
    .replace(/\s*[—–]\s*/g, ", ")                     // em/en dash → 쉼표(기본 치환 — 유저 승인)
    .replace(/([가-힣0-9)\]”"])\s*;\s*/g, "$1, ")     // 한국어 문장 내 세미콜론 → 쉼표
    .replace(/-{3,}/g, "\u0000HR\u0000")                 // 구분선 마커 보호
    .replace(/\s*--\s*/g, ", ")                        // 이중 하이픈
    .replace(/\u0000HR\u0000/g, "---")                  // 구분선 복원
    .replace(/([가-힣.!?%)\]])\s*,?\s*-{2,}(?:\s+-{2,})*\s*(?=<|$)/g, "$1")   // 문장 끝 --- 쓰레기(연속 그룹 포함)
    .replace(/(<br\s*\/?>)\s*-{2,}(?:\s+-{2,})*\s*(?=<)/gi, "$1")             // <br> 뒤 줄로 남은 --- (실측)
    .replace(/[\u201C\u201D]/g, "\"")                 // 스마트 큰따옴표 → 직선(문체 정규화)
    .replace(/[\u2018\u2019]/g, "'");
}

// ★빨강(주의) 총량 게이트 — 글 전체 2곳 초과분은 볼드로 강등(색이 흔하면 아무것도 안 보인다)
//  2026-07-17 다이어트 v3(유저: 겉만 휘황찬란 — 색·형광 과다): 4→2.
function capDanger(html: string): string {
  let n = 0;
  return html.replace(/<span style="color:\s*#F04452[^"]*">([\s\S]*?)<\/span>/gi, (_m, inner) => {
    n += 1;
    return n <= 2 ? `<span style="color:#F04452">${inner}</span>` : `<b>${inner}</b>`;
  });
}

// ★파랑(개념 구절) 총량 게이트(다이어트 v3) — 모델이 쓴 파랑 구절은 글 전체 2곳까지, 초과분은 색만 벗긴다(볼드 유지).
//  시스템이 나중에 입히는 파랑 구조 라벨(Q 번호 등)은 이 캡 이후 단계에서 부착되므로 영향 없음.
function capAccent(html: string): string {
  let n = 0;
  return html.replace(/<span style="color:\s*#1D75F7[^"]*">([\s\S]*?)<\/span>/gi, (_m, inner) => {
    n += 1;
    return n <= 2 ? `<span style="color:#1D75F7">${inner}</span>` : String(inner);
  });
}

// ★FAQ 개수 상한을 코드가 지킨다(2026-08-03 유저 실물: 규격 2개인데 3개, 블록이 283자로 예산의 2.8배).
//  종전엔 skeletonReport가 '3개다'라고 경고만 하고 재생성 프롬프트에 실어 보냈다.
//  재생성 예산을 가드 여럿이 나눠 쓰고 고쳐졌는지 재검사도 안 해서 그대로 발행됐다.
//
// ★★2026-08-04 치명적 버그 수리(유저 실측: 글이 FAQ에서 뚝 끝났다).
//  1차 구현은 '3번째 Q부터 다음 h2 전까지'를 잘랐다. 그런데 FAQ는 보통 마지막 섹션이라
//  다음 h2가 없고(클로징엔 h2가 없다), 그러면 cutTo = html.length가 되어
//  ★클로징이 통째로 같이 삭제됐다. 글이 '자주 묻는 질문' 답변에서 끝나 버린다.
//  ★교훈: '어디까지 지울지'를 문서 끝으로 잡으면 안 된다 — 지울 것의 경계로 잡아야 한다.
//   그래서 이제 Q&A 블록 '자체'만 지운다. 답변은 그 Q 뒤의 <p> 몇 개까지로 한정하고,
//   <p>가 아닌 블록(표·리스트·이미지)을 만나면 거기서 멈춘다 — 그 뒤는 클로징 영역이다.
export function capFaq(html: string): string {
  const QA_MAX = 2;
  // 최상위 블록으로 쪼갠다(태그 단위). 문자열 인덱스로 자르면 경계를 놓친다.
  const blocks = [...html.matchAll(/<(p|h[1-6]|ul|ol|table|blockquote|div)[\s\S]*?<\/\1>/gi)];
  if (blocks.length === 0) return html;
  const isQ = (b: string) => /^<p[^>]*>\s*(?:<[^>]+>\s*)*Q[.．]\s/i.test(b);
  const isP = (b: string) => /^<p[\s>]/i.test(b);

  const qIdx = blocks.map((m, i) => (isQ(m[0]) ? i : -1)).filter((i) => i >= 0);
  if (qIdx.length <= QA_MAX) return html;

  // 지울 블록 인덱스 집합 — 3번째 Q부터, 각 Q와 그 답변(<p> 최대 3개)만.
  const kill = new Set<number>();
  for (const qi of qIdx.slice(QA_MAX)) {
    kill.add(qi);
    for (let j = qi + 1, n = 0; j < blocks.length && n < 3; j++, n++) {
      const b = blocks[j]![0];
      if (isQ(b) || !isP(b)) break; // 다음 Q이거나 <p>가 아니면 답변이 끝난 것 — 그 뒤는 안 건드린다
      kill.add(j);
    }
  }
  if (kill.size === 0) return html;
  // 뒤에서부터 지운다 — 앞을 지우면 인덱스가 밀린다.
  let out = html;
  for (const i of [...kill].sort((a, b) => b - a)) {
    const m = blocks[i]!;
    if (m.index === undefined) continue;
    out = out.slice(0, m.index) + out.slice(m.index + m[0].length);
  }
  return out;
}

// ★리스트 → 표 자동 변환(2026-08-04 유저 확정: "리스트가 많은 부분은 표로").
//  프롬프트로 '3개 이상 나열은 표'라고 여러 번 못 박았는데 계속 '• 항목, 설명' 불릿으로 나왔다.
//  ★모델은 표를 만들기 싫어한다(불릿이 훨씬 쓰기 쉽다). 그러면 코드가 바꿔 준다.
//  변환 조건은 좁게 잡는다 — 모든 리스트를 표로 만들면 리듬이 죽는다:
//   ① li가 3개 이상 ② 각 li가 '항목, 설명' 구조(첫 쉼표로 갈림) ③ 항목 쪽이 짧다(20자 이내)
export function listToTable(html: string): string {
  return html.replace(/<ul(?:\s[^>]*)?>([\s\S]*?)<\/ul>/gi, (raw, inner: string) => {
    const lis = [...String(inner).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1]);
    if (lis.length < 3 || lis.length > 8) return raw;
    const rows: [string, string][] = [];
    for (const li of lis) {
      const plain = li.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (/[□☐]/.test(plain)) return raw; // 체크리스트는 그대로 둔다(저장률 장치)
      const cut = plain.indexOf(",");
      if (cut < 2 || cut > 20) return raw; // '항목, 설명' 구조가 아니면 흐름형 리스트다
      const head = plain.slice(0, cut).trim();
      const body = plain.slice(cut + 1).trim();
      if (!head || body.length < 4) return raw;
      rows.push([head, body]);
    }
    const th = '<th style="border:1px solid #ddd;padding:8px 10px;background:#f7f8fa;text-align:left;font-size:14px;word-break:keep-all">';
    const td = '<td style="border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:14px;word-break:keep-all">';
    const body = rows.map(([h, b]) => `<tr>${td}${h}</td>${td}${b}</td></tr>`).join("");
    return `<table style="width:100%;border-collapse:collapse;margin:8px 0"><tr>${th}항목</th>${th}내용</th></tr>${body}</table>`;
  });
}

function capMarks(html: string): string {
  // ★고아 태그 방어 — <mark> 열림/닫힘 불균형이면 형광 전부 해제(도배보다 무강조가 낫다)
  const opens = (html.match(/<mark(\s[^>]*)?>/g) ?? []).length;
  const closes = (html.match(/<\/mark>/g) ?? []).length;
  if (opens !== closes) return html.replace(/<\/?mark[^>]*>/g, "");
  let sentCount = 0, phraseCount = 0;
  return html.replace(/<mark(?:\s[^>]*)?>([\s\S]*?)<\/mark>/g, (raw, inner) => {
    const plain = String(inner).replace(/<[^>]+>/g, "").trim();
    if (/^[─\-•·\s]*$/.test(plain)) return plain; // 구분선·불릿만 감싼 형광(실측) — 태그 소거
    const len = [...plain].length;
    if (len > 70) return String(inner); // 통문단 형광 — 평문으로(볼드 도배 전이 방지, 실측)
    if (len >= 15) { sentCount += 1; return sentCount <= 2 ? `<b>${inner}</b>` : String(inner); } // ★다이어트 v3(2026-07-17): 문장 형광 0 — 앞 2개는 볼드 강등, 나머지 평문
    phraseCount += 1; return phraseCount <= 2 ? raw : String(inner); // ★다이어트 v3: 구 형광 4→2
  });
}

// ★형광 하한(2026-08-02 유저 확정) — 그동안 형광에는 상한만 있었다(다이어트 v3: 구 형광 2곳).
//  상한만 있으면 '0곳으로 끝나는 글'이 정상처럼 통과한다 — 훑어 읽는 독자가 그 글의 핵심 숫자를 못 건진다.
//  ★상한은 손대지 않는다(도배는 여전히 실패다). 하한 1곳만 새로 둔다.
//  ★무엇이 가장 중요한지는 코드가 판단하지 않는다 — '숫자+단위를 품은 첫 짧은 볼드 구절'이라는
//   기계적 기준만 쓴다(수치는 이 블로그에서 늘 결론을 나르는 자리다). capMarks 뒤·markToBold 앞에서만 돈다.
const KEY_FIGURE_RE = /\d[\d,.]*\s*(?:원|만\s?원|억|%|퍼센트|년|개월|일|배|위|명|건)/;
function ensureKeyFigureMark(html: string): string {
  if (/<mark/i.test(html)) return html; // 이미 형광이 있으면 손대지 않는다(상한 초과 유발 금지)
  let done = false;
  return html.replace(/<b>([\s\S]*?)<\/b>/g, (raw, inner) => {
    if (done) return raw;
    const plain = String(inner).replace(/<[^>]+>/g, "").trim();
    const len = [...plain].length;
    if (len < 2 || len > 20 || !KEY_FIGURE_RE.test(plain)) return raw; // 문장 통째 볼드는 형광 대상이 아니다
    done = true;
    return `<mark>${inner}</mark>`;
  });
}

function markToBold(html: string): string {
  // ★전부 인라인(유저 교본 최종: 단독 줄 강제가 '…경향' 형광 뒤 '이 있어요' 고아 조각을 만들었다) — 문장 흐름 절대 보존
  html = html.replace(/<mark(?:\s[^>]*)?>([\s\S]*?)<\/mark>/g, '<b style="background-color:#fff3a8;">$1</b>');
  return html.replace(/<\/?mark[^>]*>/g, ""); // 잔여 고아 태그 소거(도배 방어)
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
  let body = normalizeTableColumns(ensurePayoffTable(listToTable(capFaq(ensureSectionEmphasis(markToBold(ensureKeyFigureMark(capMarks(capAccent(capDanger(sanitizeAiPunct(stripListEmoji(normalizeHighlights(fixSplitDecimals(fixDoubleClosing(input.bodyHtml))))))))))))), input.title)).replace(SLOT_RE, (_m, kind: string, desc: string) => {
    idx += 1; // ★문서순 인덱스는 종류와 무관하게 증가시킨다(검토 화면 imgs[i]와 짝이 맞아야 한다)
    const url = input.images?.[idx];
    // ★안 채워진 카드·차트는 줄째로 지운다(2026-08-02 유저 실측).
    //  실물: "[이미지 2 — 여기에 삽입] 표현: 비교 | 은행 예금자보호 한도 변경 | 기존 한도=5,000만 원…"
    //  카드·차트는 코드가 자동 생성하는 자리다. 생성이 안 됐다면 사람이 대신 넣을 것이 없다 —
    //  사진처럼 '여기에 삽입하세요' 안내를 남기면 라벨=값 원문이 독자에게 그대로 노출된다.
    //  ★자동 슬롯의 미충족은 '빈자리'가 아니라 '없는 자리'다. 사진(사람이 채움)과 반대로 처리한다.
    if (kind !== "사진" && !url) return "";
    if (!withImages) return `<p>[사진 ${idx + 1}]</p>`; // marker 모드(수동 배치) — 명시적 선택
    if (!url) {
      // ★미충족 → 명시 마커(유저 확정: 에디터에서 이 자리에 이미지를 넣고 마커를 지우는 흐름 — 대괄호 유지로 눈에 띄게)
      return `<p style="text-align:center;background-color:#f5f6f8;padding:10px 8px;font-size:13px;color:#8b95a1">[이미지 ${idx + 1} — 여기에 삽입]<br>표현: ${desc.trim().slice(0, 60)}</p>`;
    }
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
  if (withImages && input.topImageUrl) {
    out = `<p style="text-align:center;"><img src="${input.topImageUrl}" alt="" /></p><p style="text-align:left"><br></p>` + out;
  }
  // ★클로징 경계선+썸네일 폐지(2026-07-20 유저: 태그 밑에 밑줄·썸네일이 고정으로 들어감 — 넣지 마라).
  //  closingImageUrl은 하위 호환용으로 받기만 하고 렌더하지 않는다.
  return trimLineEdges(out);
}

// ★줄 경계 공백 전역 청소(2026-07-20 실측 2차: 신규 발행분에서도 '확인이␣'+개행 — 1차 수정이 '공백+닫는 태그(<b>·형광)+개행'
//  조합과 nbsp를 못 잡았다). 개행(<br>)·문단 경계의 공백을 인라인 태그 너머까지 삼킨다 — 중앙정렬 쏠림 원천 봉쇄.
function trimLineEdges(html: string): string {
  const SP = "(?:&nbsp;|[ \\t\\u00a0])+";
  const CLOSE = "(?:<\\/(?:b|strong|span|mark|u|em|i)>)*";
  const OPEN = "(?:<(?:b|strong|span|mark|u|em|i)(?:\\s[^>]*)?>)*";
  return html
    .replace(new RegExp(`${SP}(${CLOSE})(<br\\s*\\/?>)`, "gi"), "$1$2")
    .replace(new RegExp(`(<br\\s*\\/?>)(${OPEN})${SP}`, "gi"), "$1$2")
    .replace(new RegExp(`${SP}(${CLOSE})(<\\/(?:p|h[1-4]|li|blockquote)>)`, "gi"), "$1$2")
    .replace(new RegExp(`(<(?:p|h[1-4]|li|blockquote)(?:\\s[^>]*)?>)(${OPEN})${SP}`, "gi"), "$1$2");
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
    .replace(/[ \t ]+\n/g, "\n").replace(/\n[ \t ]+/g, "\n") // ★줄꼬리·줄머리 공백 제거(2026-07-20 실측: 중앙정렬 쏠림)
    .replace(/\n{6,}/g, "\n\n\n\n\n") // 상한 4 빈 줄(=개행 5) 캡 — 압축 아님
    .replace(/^[\n\s]+|[\n\s]+$/g, "");
  return text;
}

// 본문 내 사진자리 개수.
export function countPhotoSlots(bodyHtml: string): number {
  return (bodyHtml.match(SLOT_RE) ?? []).length; // 사진+카드 슬롯 총수
}
