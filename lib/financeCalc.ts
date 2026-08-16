// ★검증된 계산 자료(2026-07-17 전략 회의) — 시뮬레이션 숫자는 LLM이 아니라 코드가 계산한다.
//  배경: 경제 글의 경쟁력은 숫자·계산·시뮬레이션인데 LLM은 산수를 틀린다(틀린 금융 숫자 = 신뢰 붕괴 + 법적 리스크).
//  keyword가 금융 계산 주제에 걸리면 코드가 계산한 예시 블록을 유저 프롬프트에 주입하고, 모델은 그 수치를 그대로 옮겨 쓴다.
//  ⚠ 상수는 해마다 바뀐다 — 기준 시점(ASOF)을 항상 함께 표기하고, 제도 개정 시즌마다 갱신한다(개정 캘린더 연동).

// 2026년 기준(실측 확인 2026-07-17): 건보 7.19%·본인 3.595%·장기요양 0.9448%(보건복지부 고시),
//  연금계좌 세액공제 600만/합산 900만·16.5%(총급여 5,500만 이하)/13.2%(국세청), ISA 비과세 500만/서민형 1,000만(2026 상향)·초과분 9.9%, 이자·배당소득세 15.4%.
//  예금자보호 1억(2025-09-01 시행, 금융위 보도자료 확인 2026-07-31) — ★이 값이 레지스트리에 없어서 실제로 5천만 원 오기가 발행됐다.
//  값이 여기 없으면 모델은 학습 시점의 옛 숫자를 쓴다. 새 주제를 다루기 전에 '변하는 값'부터 여기 등재한다.
export const ASOF = "2026년";
export const RATES = {
  healthEmployee: 0.03595, // 직장가입자 본인 부담(총 7.19%의 절반)
  healthTotal: 0.0719,
  ltc: 0.009448, // 장기요양(소득 대비) — 본인 부담분은 건보료에 비례 배분
  pensionCredit: { low: 0.165, high: 0.132, threshold: 55_000_000 }, // 총급여 5,500만 경계
  pensionLimit: { pensionOnly: 6_000_000, withIrp: 9_000_000 },
  isaExempt: { general: 5_000_000, seomin: 10_000_000 },
  isaOverRate: 0.099,
  interestTax: 0.154,
  // 금융회사별 1인당 원금+이자 합산. 예금보험공사 보호권역(은행·저축은행·보험·금융투자)과 상호금융 중앙회가 동시 상향.
  depositProtect: { limit: 100_000_000, prev: 50_000_000, since: "2025년 9월 1일" },
} as const;

const fmtWon = (n: number): string => `${Math.round(n).toLocaleString("ko-KR")}원`;
// ★억 단위를 만으로 쓰지 않는다(2026-07-31 실측: 검토 화면에 "10,000만 원"이 노출됐다).
//  한국어로 1억을 '10,000만 원'이라고 쓰는 사람은 없다. 프롬프트에 들어가면 모델이 그대로 따라 쓴다.
const fmtMan = (n: number): string => {
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000);
    const man = Math.round((n % 100_000_000) / 10_000);
    return man ? `${eok}억 ${man.toLocaleString("ko-KR")}만 원` : `${eok}억 원`;
  }
  return `${(n / 10_000).toLocaleString("ko-KR")}만 원`;
};

/** 연금저축·IRP 납입액의 세액공제 환급액(지방소득세 포함 공제율). 한도 초과분은 공제 제외. */
export function pensionRefund(salary: number, paid: number): number {
  const capped = Math.min(paid, RATES.pensionLimit.withIrp);
  const rate = salary <= RATES.pensionCredit.threshold ? RATES.pensionCredit.low : RATES.pensionCredit.high;
  return capped * rate;
}

/** ISA 만기 수익의 세금: 일반계좌(15.4%) 대비 ISA(비과세 한도 초과분만 9.9%) 절감액. */
export function isaSaving(profit: number, type: "general" | "seomin" = "general"): { normalTax: number; isaTax: number; saving: number } {
  const normalTax = profit * RATES.interestTax;
  const isaTax = Math.max(0, profit - RATES.isaExempt[type]) * RATES.isaOverRate;
  return { normalTax, isaTax, saving: normalTax - isaTax };
}

/** 예·적금 1년 이자: 세전·세금(15.4%)·세후. */
export function afterTaxInterest(principal: number, annualRate: number): { gross: number; tax: number; net: number } {
  const gross = principal * annualRate;
  const tax = gross * RATES.interestTax;
  return { gross, tax, net: gross - tax };
}

/** 직장가입자 월 보험료(본인 부담): 건강보험 + 장기요양. */
export function healthMonthly(monthlySalary: number): { health: number; ltc: number } {
  const health = monthlySalary * RATES.healthEmployee;
  const ltc = health * (RATES.ltc / RATES.healthTotal);
  return { health, ltc };
}

const PENSION_RE = /(연금저축|IRP|아이알피|퇴직연금|세액공제|연말정산)/i;
const ISA_RE = /(ISA|절세\s*계좌|중개형\s*계좌)/i;
const INTEREST_RE = /(예금|적금|파킹|금리|이자)/;
const HEALTH_RE = /(건강보험|건보료)/;
// 특판·저축은행 글은 '한도'가 본문 핵심이라 INTEREST보다 먼저 잡는다(실측: 특판 글이 클릭 1위인데 한도가 틀렸다).
// ★2026-07-31 실측 확대: 검토 화면에 옛 한도(5천만)가 실제로 떴다. 트리거가 좁아 한도 자료가 주입되지 않은 글이었다.
//  탐지(factGate)보다 주입(여기)이 먼저다 — 애초에 정답을 손에 쥐여주면 고칠 일이 안 생긴다.
const DEPOSIT_RE = /(예금|적금|예금자\s*보호|특판|저축\s*은행|상호\s*금융|새마을\s*금고|신협|파킹)/;

/** keyword가 금융 계산 주제면 코드 계산 예시 블록(최대 2개)을, 아니면 null. 생성 프롬프트에 그대로 주입. */
export function financeCalcContext(keyword: string): string | null {
  const blocks: string[] = [];
  if (PENSION_RE.test(keyword)) {
    const a = pensionRefund(48_000_000, 9_000_000);
    const b = pensionRefund(60_000_000, 9_000_000);
    const c = pensionRefund(48_000_000, 6_000_000);
    blocks.push([
      `[연금계좌 세액공제 — 공제율: 총급여 5,500만 원 이하 16.5%, 초과 13.2% / 한도: 연금저축 600만, IRP 합산 900만]`,
      `- 총급여 4,800만 원 + 연금저축 600만·IRP 300만(합 900만) 납입 → 환급 ${fmtWon(a)}`,
      `- 총급여 6,000만 원 + 합 900만 납입 → 환급 ${fmtWon(b)}`,
      `- 총급여 4,800만 원 + 연금저축만 600만 납입 → 환급 ${fmtWon(c)}`,
      `- 단서: 실제 환급액은 결정세액이 그 이상일 때 기준(결정세액이 적으면 그만큼만 환급).`,
    ].join("\n"));
  }
  if (blocks.length < 2 && ISA_RE.test(keyword)) {
    const big = isaSaving(8_000_000, "general");
    const small = isaSaving(3_000_000, "general");
    blocks.push([
      `[ISA 절세 — ${ASOF} 비과세 한도: 일반형 500만, 서민형 1,000만 / 초과분 9.9% 분리과세 / 일반계좌는 15.4%]`,
      `- 만기 수익 800만(일반형): 일반계좌 세금 ${fmtWon(big.normalTax)} vs ISA ${fmtWon(big.isaTax)} → 절감 ${fmtWon(big.saving)}`,
      `- 만기 수익 300만(일반형): 일반계좌 ${fmtWon(small.normalTax)} vs ISA 0원(전액 비과세) → 절감 ${fmtWon(small.saving)}`,
    ].join("\n"));
  }
  if (blocks.length < 2 && DEPOSIT_RE.test(keyword)) {
    const d = RATES.depositProtect;
    blocks.push([
      `[예금자보호 한도 — ${d.since}부터 ${fmtMan(d.limit)}(종전 ${fmtMan(d.prev)}에서 상향)]`,
      `- 기준: 금융회사별로 1인당 원금+이자를 합산해 ${fmtMan(d.limit)}까지. 한 회사에 ${fmtMan(d.limit)}을 넘겨 넣으면 초과분은 보호되지 않는다.`,
      `- 은행·저축은행·보험·금융투자는 예금보험공사가, 상호금융(새마을금고·신협 등)은 각 중앙회가 보호하며 한도는 같다.`,
      `- 비대상: CMA(종금형 제외)·펀드·주식·채권·ELS 등 실적배당 상품은 예금자보호 대상이 아니다.`,
      `- 단서: 종전 ${fmtMan(d.prev)} 기준으로 쓰면 안 된다(${d.since} 이전 자료에는 옛 한도가 그대로 남아 있다).`,
    ].join("\n"));
  }
  if (blocks.length < 2 && INTEREST_RE.test(keyword)) {
    const x = afterTaxInterest(50_000_000, 0.035);
    blocks.push([
      `[예금 이자 세후 — 이자소득세 15.4%]`,
      `- 5,000만 원을 연 3.5%에 1년 → 세전 이자 ${fmtWon(x.gross)}, 세금 ${fmtWon(x.tax)}, 세후 ${fmtWon(x.net)}`,
    ].join("\n"));
  }
  if (blocks.length < 2 && HEALTH_RE.test(keyword)) {
    const a = healthMonthly(3_000_000);
    const b = healthMonthly(4_000_000);
    blocks.push([
      `[직장가입자 월 보험료(본인 부담) — ${ASOF} 건강보험 7.19%(본인 3.595%)·장기요양 0.9448%]`,
      `- 월급 ${fmtMan(3_000_000)}: 건강보험 ${fmtWon(a.health)} + 장기요양 ${fmtWon(a.ltc)}`,
      `- 월급 ${fmtMan(4_000_000)}: 건강보험 ${fmtWon(b.health)} + 장기요양 ${fmtWon(b.ltc)}`,
      `- 단서: 지역가입자는 소득·재산 기준이 달라 이 계산이 그대로 적용되지 않는다.`,
    ].join("\n"));
  }
  if (!blocks.length) return null;
  return [
    `★[검증된 계산 자료 — ${ASOF} 기준, 시스템이 직접 계산한 정확한 값] 본문에 계산 예시·시뮬레이션이 필요하면 아래 수치를 그대로 옮겨 쓴다(직접 산수로 새 숫자를 만들거나 반올림·재계산 금지 — 계산 실수 하나가 글 전체 신뢰를 무너뜨린다). 아래에 없는 가정의 예시가 필요하면 구체 숫자 없이 서술로 쓴다. 각 계산의 '단서'는 예시 근처에 자연스럽게 함께 언급한다.`,
    ...blocks.slice(0, 2),
  ].join("\n");
}
