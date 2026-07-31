import { scanFacts, factVerdict, applyFactFix } from "../lib/factGate.ts";

// ★실측 케이스(2026-07-31) — 자사 사이트에서 실제로 발행된 오류 2건이 원점이다.
//  ① 워드프레스: 예금자보호 한도를 5천만 원으로 씀(옛 숫자)
//  ② 네이버: 퇴직소득세를 종합소득세로 환급받으라고 씀(제도 구조 오해 — 문장이 자연스러워 더 위험)
//  ★오검출 케이스(no)를 같은 수만큼 둔다. 과탐이 나면 아무도 게이트를 안 본다.
let fail = 0;

const has = (issues, layer, sev) => issues.some((i) => i.layer === layer && (!sev || i.severity === sev));

// [1층·2층] 잡아야 하는 것 / 잡으면 안 되는 것
const cases = [
  // 실측 ①
  ["정기예금 특판", "저축은행 특판 예금은 예금자보호 한도인 5,000만 원까지 안전하게 보호됩니다.", "value", true],
  // 실측 ②
  ["irp 이전", "퇴직소득세를 더 냈다면 5월 종합소득세 신고 때 합산해서 환급받을 수 있습니다.", "structure", true],
  // 클릭 상위 글의 위험 — CMA를 보호 대상으로 씀
  ["cma 계좌개설", "CMA 계좌는 예금자보호가 되기 때문에 원금 걱정 없이 넣어두셔도 됩니다.", "structure", true],
  // 관할 오류
  ["퇴사 후 건강보험", "퇴사하면 건강보험 임의계속가입을 국세청 홈택스에서 신청하시면 됩니다.", "structure", true],
  // 기한 단정
  ["연말정산 누락", "신청 기한을 넘기면 무조건 안 되니 반드시 기간 안에 처리하세요.", "structure", true],

  // ── 오검출 방지 ──
  // 옛 값을 '종전'으로 정당하게 인용
  ["정기예금 특판", "예금자보호 한도는 종전 5,000만 원에서 1억 원으로 상향됐습니다.", "value", false],
  // 분류과세를 올바르게 서술
  ["irp 이전", "퇴직소득은 분류과세라 종합소득세 신고 대상이 아닙니다. 회사가 원천징수로 정산을 끝냅니다.", "structure", false],
  // CMA를 올바르게 서술
  ["cma 계좌개설", "CMA는 종금형을 제외하면 예금자보호 대상이 아닙니다.", "structure", false],
  // 공단 소관을 올바르게 안내
  ["퇴사 후 건강보험", "건강보험 임의계속가입은 건강보험공단에 신청합니다. 세금 관련은 국세청 홈택스에서 따로 처리합니다.", "structure", false],
  // 기한 초과에 구제 경로를 붙임
  ["연말정산 누락", "신청 기한을 넘겼더라도 경정청구로 5년 안에 돌려받을 수 있습니다.", "structure", false],
];

for (const [kw, body, layer, expect] of cases) {
  const issues = scanFacts(body, kw);
  const got = has(issues, layer);
  const ok = got === expect;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", `| ${layer.padEnd(9)} |`, (expect ? "잡아야" : "통과해야").padEnd(5), "|", body.slice(0, 34));
}

// [시행 예정] 이미 시행된 제도를 예정으로 쓰는 버릇
{
  const issues = scanFacts("이 제도는 2025년부터 시행 예정입니다.", "예금자보호");
  const ok = issues.some((i) => i.title.includes("시행 예정"));
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| value     | '시행 예정' 표현 검출");
}

// [3층 누락] 주제별 필수 언급
{
  const thin = "저축은행 특판 상품 금리를 비교해 봤습니다. 금리가 높은 순서로 정리했습니다.";
  const missing = scanFacts(thin, "정기예금 특판").filter((i) => i.layer === "missing").map((i) => i.matched);
  const ok = missing.length === 3; // 한도·비대상 구분·합산 기준
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| missing   | 예금 주제 필수 3항목 누락 →", missing.join(", ") || "없음");

  const full = "저축은행 특판입니다. 예금자보호 한도는 1억 원이고, 금융회사별로 1인당 원금과 이자를 합산합니다. 펀드·주식은 보호 대상이 아니니 제외하고 보셔야 합니다.";
  const none = scanFacts(full, "정기예금 특판").filter((i) => i.layer === "missing");
  const ok2 = none.length === 0;
  if (!ok2) fail++;
  console.log(ok2 ? "OK " : "FAIL", "| missing   | 다 갖춘 글은 통과 →", none.map((i) => i.matched).join(", ") || "경고 없음");
}

// ★[과탐 방지] 주식 글의 올바른 고지가 예금 주제로 오인되면 안 된다(2026-07-31 — 자체 초안에서 발견).
//  '예금자보호'에 '예금'이 들어 있어, "주식은 예금자보호 대상이 아니다"라는 필수 고지가
//  예금 주제로 읽혀 '합산 기준'·'현행 한도'를 요구했다. 올바르게 쓸수록 경고가 늘면 게이트는 죽는다.
{
  const stock = "저평가 우량주를 고르는 기준입니다. 주식과 펀드는 예금자보호 대상이 아닙니다. 예금이나 적금과 달리 원금이 보장되지 않습니다.";
  const wrong = scanFacts(stock, "저평가 우량주 찾는 법").filter((i) => i.layer === "missing");
  const ok = wrong.length === 0;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| missing   | 주식 글의 예금자보호 고지를 예금 주제로 오인 안 함 →", wrong.map((i) => i.matched).join(", ") || "경고 없음");
  // 진짜 예금 글은 여전히 잡혀야 한다(구멍 방지)
  const dep = scanFacts("저축은행 특판 금리를 비교했습니다.", "정기예금 특판").filter((i) => i.layer === "missing");
  const ok2 = dep.length === 3;
  if (!ok2) fail++;
  console.log(ok2 ? "OK " : "FAIL", "| missing   | 진짜 예금 글은 여전히 필수 3항목 요구 →", dep.length + "건");
}

// [과탐 방지] 본문에 스친 단어 하나로 필수항목을 요구하면 안 된다
{
  const aside = "퇴사 후 생활비 이야기입니다. 남은 돈은 적금에 넣어두었습니다.";
  const issues = scanFacts(aside, "퇴사 후 생활비").filter((i) => i.layer === "missing" && i.matched.includes("합산"));
  const ok = issues.length === 0;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| missing   | 스친 단어로 예금 필수항목 요구 안 함");
}

// ★[과탐 방지] 문단 경계를 넘어 짝이 지어지면 안 된다(2026-07-31 — 특판 초안에서 발견).
//  글 끝에 항상 붙는 '함께 보면 좋은 글'·'참고 자료' 영역 때문에 재발이 확실한 유형이었다.
{
  const tail = `<p>보호 주체는 각 중앙회의 예금자보호기금입니다.</p><h3>계산</h3><p>5,000만 원을 연 3.5%로 1년 예치하면 세후 이자는 1,480,500원입니다.</p>`;
  const a = scanFacts(tail, "정기예금 특판").filter((i) => i.layer === "value");
  const okA = a.length === 0;
  if (!okA) fail++;
  console.log(okA ? "OK " : "FAIL", "| value     | 다른 문단의 계산 예시 5,000만을 한도 오기로 안 봄");

  const links = `<p>보호 한도를 확인하세요.</p><ul><li>CMA 통장과 파킹통장 이자 차이</li></ul><p>참고 — 예금자보호법 개정 보도자료</p>`;
  const b = scanFacts(links, "정기예금 특판").filter((i) => i.layer === "structure");
  const okB = b.length === 0;
  if (!okB) fail++;
  console.log(okB ? "OK " : "FAIL", "| structure | 관련 글 목록의 CMA를 본문 오류로 안 봄");

  // 같은 문장 안의 진짜 오류는 여전히 잡혀야 한다(구멍 방지 짝)
  const real = scanFacts(`<p>CMA 계좌도 예금자보호가 되니 안심하세요.</p>`, "cma 계좌개설").filter((i) => i.layer === "structure");
  const okC = real.length === 1;
  if (!okC) fail++;
  console.log(okC ? "OK " : "FAIL", "| structure | 같은 문장 안의 진짜 오류는 여전히 검출 →", real.length + "건");
}

// ★[바꾸기] 1층 값 오류 한 번에 고치기(2026-07-31 유저 요청: "아싸리 고쳐서 나오면 좋겠다").
//  ★같은 숫자가 계산 예시에 있으면 절대 건드리면 안 된다 — 주제 블록 안에서만 치환한다.
{
  const html = `<p>예금자보호 한도인 5,000만 원까지 보호됩니다.</p><p>5,000만 원을 연 3.5%로 예치하면 세후 이자는 1,480,500원입니다.</p>`;
  const [iss] = scanFacts(html, "정기예금 금리").filter((i) => i.layer === "value");
  const fixed = iss ? applyFactFix(html, iss) : html;
  const okA = fixed.includes("한도인 1억 원까지");
  if (!okA) fail++;
  console.log(okA ? "OK " : "FAIL", "| 바꾸기    | 한도 문장만 1억 원으로 치환");
  const okB = fixed.includes("5,000만 원을 연 3.5%");
  if (!okB) fail++;
  console.log(okB ? "OK " : "FAIL", "| 바꾸기    | 다른 문단의 계산 예시는 건드리지 않음");
  const okC = !/1억 원\s*원/.test(fixed);
  if (!okC) fail++;
  console.log(okC ? "OK " : "FAIL", "| 바꾸기    | 조사 중복('1억 원 원') 없음");
  const okD = scanFacts(fixed, "정기예금 금리").filter((i) => i.layer === "value").length === 0;
  if (!okD) fail++;
  console.log(okD ? "OK " : "FAIL", "| 바꾸기    | 고친 뒤 경고가 사라짐");
  // 2층·3층에는 치환 재료가 붙지 않는다 — 기계가 고칠 수 있는 종류가 아니다
  const struct = scanFacts("<p>퇴직소득세는 5월 종합소득세 신고로 환급받으세요.</p>", "irp 이전").filter((i) => i.layer === "structure");
  const okE = struct.length > 0 && struct.every((i) => !i.replace);
  if (!okE) fail++;
  console.log(okE ? "OK " : "FAIL", "| 바꾸기    | 구조 오류엔 버튼이 안 붙음");
}

// [판정] 구조 오류는 문단 재작성
{
  const rewrite = factVerdict(scanFacts("퇴직소득세는 5월 종합소득세 신고로 환급받으세요.", "irp 이전")) === "rewrite";
  const publish = factVerdict(scanFacts("금리를 비교해 정리했습니다.", "회사채 금리")) === "publish";
  const ok = rewrite && publish;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| verdict   | 구조 오류=rewrite / 무결=publish");
}

process.exit(fail ? 1 : 0);
