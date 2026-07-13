// [species-c] 리치 조립기 — 플레인 v2 본문 → 네이버 스마트에디터 생존 HTML(중앙정렬·강약 3단·색 역할·형광펜 자동).
// 서식 문법은 기존 lib/publishHtml.ts에서 실증된 규격(인라인 스타일·중앙정렬·빈 줄 스페이서)을 독립 복제 — 동기화하지 않음.
import { DISCLOSURE_TEXT, MARKER_LINK_1, MARKER_LINK_2, MARKER_PRODUCT_IMG, MARKER_REVIEW_CARD } from "./config";

const INK = "#191F28";
const SUB = "#8B95A1";
const BLUE = "#1D75F7";
const RED = "#F04452";
const HIGHLIGHT = "#FFF3A0";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const P = (inner: string, extra = "") => `<p style="text-align:center;line-height:1.8;${extra}">${inner}</p>`;
const BLANK = `<p style="text-align:center;"><br></p>`; // 스마트에디터 생존형 빈 줄(본편 실증 규격)
const size = (px: number, inner: string, color = INK) => `<span style="font-size:${px}px;color:${color};">${inner}</span>`;

const MARKERS = [MARKER_PRODUCT_IMG, MARKER_REVIEW_CARD, MARKER_LINK_1, MARKER_LINK_2];

function isSubheading(line: string, idx: number): boolean {
  if (idx < 2) return false; // 대가성·도입 대사 제외
  const plain = line.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").trim();
  if ([...plain].length > 30) return false;
  if (/\?$/.test(plain)) return true; // 질문형 소제목(v2 절반 이상)
  return !/[.다요]$/.test(plain) && [...plain].length <= 22 && !plain.startsWith('"');
}

/** ==하이라이트== → 형광펜(자동 — 수동 형광펜 단계 대체), 남은 텍스트는 이스케이프 */
function inline(line: string, px: number, color = INK): string {
  const parts = line.split(/==([^=\n]{2,80})==/g);
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const seg = esc(parts[i] ?? "");
    if (!seg) continue;
    out += i % 2 === 1 ? `<b><span style="font-size:${px}px;color:${INK};background-color:${HIGHLIGHT};">${seg}</span></b>` : size(px, seg, color);
  }
  return out;
}

/** 플레인 v2 본문 → 리치 HTML. 마커는 눈에 띄는 회색 박스로 유지(에디터에서 교체 지점). */
export function buildRichBody(body: string): string {
  const paras = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const html: string[] = [];
  paras.forEach((para, idx) => {
    const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      // 1) 대가성 첫 줄 — 작은 보조색(규정 문구는 존재가 중요, 크기는 겸손하게)
      if (line === DISCLOSURE_TEXT) { // 유저 확정: 쉼표에서 내려쓰기 2줄 + 11px 고정
        const [a, b] = line.split(/(?<=,)\s*/);
        html.push(P(size(11, esc(a ?? line), SUB) + "<br>" + size(11, esc(b ?? ""), SUB)));
        html.push(BLANK); continue;
      }
      // 2) 마커 — 교체 지점 박스(발행 시 지우고 교체)
      if (MARKERS.includes(line)) {
        html.push(BLANK);
        html.push(`<p style="text-align:center;background-color:#F2F4F6;border-radius:8px;padding:10px 8px;"><span style="font-size:13px;color:${SUB};">${esc(line)} — 이 줄을 지우고 ${line.includes("링크") ? "발급 링크 삽입" : "이미지 업로드"}</span></p>`);
        html.push(BLANK);
        continue;
      }
      // 2.5) 발급 링크 단독 줄 — 파랑 표시(에디터에서 엔터 시 링크 카드 변환)
      if (/^https:\/\//.test(line)) { html.push(BLANK); html.push(P(size(15, esc(line), BLUE))); html.push(BLANK); continue; }
      // 3) 도입 속마음 대사 — 크게(첫인상)
      if (idx <= 2 && /^["“]/.test(line)) { html.push(P(`<b>${inline(line, 19)}</b>`)); html.push(BLANK); continue; }
      // 4) 판정 헤더 — 색 역할(추천=파랑, 아쉬움=빨강)
      if (/^이런 분께 (추천|맞)/.test(line)) { html.push(BLANK); html.push(P(`<b>${size(17, esc(line), BLUE)}</b>`)); continue; }
      if (/^(이런 분껜|이런 분은)/.test(line) || /아쉬워요\s*$/.test(line)) { html.push(BLANK); html.push(P(`<b>${size(17, esc(line), RED)}</b>`)); continue; }
      // 5) 소제목(질문 훅) — 크게+볼드, 앞 여백 2
      if (isSubheading(line, idx)) { html.push(BLANK, BLANK); html.push(P(`<b>${inline(line, 19)}</b>`)); html.push(BLANK); continue; }
      // 6) 본문 — 16px 중앙, 하이라이트 자동 형광펜
      html.push(P(inline(line, 16)));
      html.push(BLANK);
    }
  });
  // 마지막 빈 줄 정리
  while (html[html.length - 1] === BLANK) html.pop();
  return html.join("");
}
