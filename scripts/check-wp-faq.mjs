import { stripExistingFaq } from "../lib/wordpress.ts";

// ★FAQ 중복 회귀(2026-08-01 실측) — pigtong.com '조선관련주' 글에 FAQ가 두 번 나왔다.
//  본문에 <p><strong>Q. 질문</strong><br />답</p>로 들어 있고, 발행 시 구조화 FAQ 섹션을 또 붙였다.
//  지우는 코드(stripExistingFaq)가 옛 형식(<h2>자주 묻는 질문</h2> + <h3>질문</h3>)만 찾고 있었다.
//  프롬프트가 "질문 문단은 'Q. '로 시작"으로 바뀐 걸 지우는 쪽이 안 따라간 것 — 두 곳이 갈라지면 반드시 이렇게 된다.
let fail = 0;
const ok = (c, label, extra = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", label, extra); };

const FAQ = [
  { question: "조선관련주 ETF도 있나요?", answer: "국내 상장 ETF 중 조선·중공업 테마 상품이 있어요." },
  { question: "수주 발표가 나면 바로 사야 하나요?", answer: "수주 뉴스는 주가에 선반영되는 경우가 많아요." },
];

// 실제 발행 글에서 그대로 가져온 형태
const body = [
  "<p>조선관련주는 크게 조선소 본체와 기자재로 나뉘어요.</p>",
  "<p>가장 많이 물어보는 것부터요.</p>",
  "<p><strong>Q. 조선관련주 ETF도 있나요?</strong><br />\n국내 상장 ETF 중 조선업 비중이 높은 테마 ETF가 있어요.</p>",
  "<p><strong>Q. 수주 발표가 나면 바로 사야 하나요?</strong><br />\n수주 뉴스는 이미 주가에 선반영되는 경우가 많아요.</p>",
].join("\n");

// 발행 파이프라인이 하는 일: 본문의 평문 FAQ를 지우고 → 구조화 FAQ 섹션을 붙인다.
const stripped = stripExistingFaq(body, FAQ);
const faqSection = `<section itemscope itemtype="https://schema.org/FAQPage">\n<h2>자주 묻는 질문</h2>\n${FAQ.map((f) => `<h3>${f.question}</h3><p>${f.answer}</p>`).join("\n")}\n</section>`;
const html = stripped + faqSection;

// 질문이 각각 딱 한 번만 나와야 한다
for (const f of FAQ) {
  const n = html.split(f.question).length - 1;
  ok(n === 1, `'${f.question.slice(0, 18)}…' 정확히 1회`, `→ ${n}회`);
}
ok(!/Q\s*[.:)]\s*조선관련주 ETF/.test(html), "★본문의 'Q.' 문단이 제거됨");
ok(/자주 묻는 질문/.test(html), "구조화 FAQ 섹션은 남음");
ok(!/가장 많이 물어보는/.test(html), "FAQ 도입 문단도 같이 정리됨");
ok(/조선관련주는 크게 조선소 본체/.test(html), "★본문은 훼손되지 않음");

console.log(fail ? `\n실패 ${fail}건` : "\n통과: WP FAQ 중복");
process.exit(fail ? 1 : 0);
