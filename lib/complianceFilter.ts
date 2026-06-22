// 업종별 광고규제 표현 탐지 + 대체 제안.
// 자동 차단이 아니라, 발행 전 사용자에게 '경고 + 대안'을 보여주고 사용자가 판단하게 하는 용도(과잉차단 방지).
// 법적 엄격도: 의료법(최엄격) > 학원법 / 변호사·세무사법 > 표시광고법(일반).
// ⚠ 정확성이 중요. 미탐이 치명적인 의료는 폭넓게 잡되, 맥락에 따라 갈리는 표현은 severity를 medium으로 낮춰 과탐 짜증을 줄인다.

export type Severity = "high" | "medium";

export interface Violation {
  matched: string; // 실제 매칭된 표현
  type: string; // 분류(절대표현/최상급/비교비방/유인/후기/거짓전문/결과보장 등)
  law: string; // 근거 법
  reason: string; // 왜 문제인지
  severity: Severity; // high(거의 확실한 위반) | medium(맥락 따라)
  suggestion?: string; // 대체 표현(있을 때만 '바꾸기' 버튼)
  note?: string; // 보조 안내(주로 medium)
  count: number; // 글 안에서 몇 번 나왔는지
}

interface Rule {
  test: RegExp;
  type: string;
  law: string;
  reason: string;
  severity: Severity;
  suggestion?: string;
  note?: string;
}

const MEDICAL_LAW = "의료법(의료광고)";
const MEDIUM_NOTE = "효과를 단정하는 맥락이면 위반 소지가 큽니다. 단순 정보 설명 맥락이면 괜찮을 수 있어요.";

const MEDICAL_RULES: Rule[] = [
  // ① 절대·단정 (high — 거의 확실한 위반)
  { test: /100\s*%|백퍼|백프로/g, type: "절대표현", law: MEDICAL_LAW, reason: "치료효과를 100%로 단정하는 표현은 의료광고 금지 대상입니다.", severity: "high" },
  { test: /완치/g, type: "절대표현", law: MEDICAL_LAW, reason: "‘완치’ 등 치료를 보장·단정하는 표현은 금지됩니다.", severity: "high", suggestion: "증상 개선" },
  { test: /영구적?/g, type: "절대표현", law: MEDICAL_LAW, reason: "효과가 영구적이라는 단정은 금지됩니다.", severity: "high" },
  { test: /부작용\s*(없는|없이|제로|0\s*%)/g, type: "절대표현", law: MEDICAL_LAW, reason: "부작용이 전혀 없다는 단정은 금지됩니다.", severity: "high", suggestion: "부작용이 적은" },
  // ② 최상급·유일성 (high)
  { test: /최고의?|최상의?|유일한|제일의?|베스트|국내\s*최초|세계\s*최초|업계\s*1\s*위/g, type: "최상급", law: MEDICAL_LAW, reason: "객관적으로 증명되지 않은 최상급·유일성 표현은 금지됩니다.", severity: "high", suggestion: "체계적인" },
  { test: /1\s*등/g, type: "최상급", law: MEDICAL_LAW, reason: "객관적 근거 없는 ‘1등’ 표현은 금지됩니다.", severity: "high" },
  // ②-보조 (medium — 맥락 따라)
  { test: /안전하(?:게|다)|안전한/g, type: "단정표현", law: MEDICAL_LAW, reason: "안전성을 단정하면 위반 소지가 있습니다.", severity: "medium", note: MEDIUM_NOTE },
  { test: /보장/g, type: "단정표현", law: MEDICAL_LAW, reason: "효과·결과를 보장한다는 의미면 위반 소지가 있습니다.", severity: "medium", note: MEDIUM_NOTE },
  { test: /확실(?:한|히|하게|하다)/g, type: "단정표현", law: MEDICAL_LAW, reason: "효과를 확실하다고 단정하면 위반 소지가 있습니다.", severity: "medium", note: MEDIUM_NOTE },
  // ③ 비교·비방 (high)
  { test: /타\s*병원\s*보다?|다른\s*(?:병원|곳)\s*보다|보다\s*우수|보다\s*뛰어/g, type: "비교·비방", law: MEDICAL_LAW, reason: "다른 의료기관과 비교·우위 주장은 금지됩니다. 자기 진료만 객관적으로 서술하세요.", severity: "high" },
  { test: /실패한\s*수술\s*(?:복구|재수술)/g, type: "비교·비방", law: MEDICAL_LAW, reason: "타 기관의 실패를 전제로 한 표현은 비방광고 소지가 있습니다.", severity: "high" },
  { test: /수술\s*없이|무절개/g, type: "비교·비방", law: MEDICAL_LAW, reason: "다른 치료법을 비교·비하하는 맥락이면 주의가 필요합니다.", severity: "medium", note: MEDIUM_NOTE },
  // ④ 사행성·유인 (high)
  { test: /오늘만|선착순|친구\s*데려오면|반값|무료\s*(?:이벤트|시술|검사)/g, type: "유인", law: MEDICAL_LAW, reason: "환자 유인·알선성 표현은 금지됩니다. 비급여 항목은 기간·대상·금액을 명확히 안내하세요.", severity: "high" },
  // ⑤ 치료경험담·후기 (high — 적발 1위 유형)
  { test: /(?:환자|치료|시술|수술)?\s*후기|체험담|경험담/g, type: "후기", law: MEDICAL_LAW, reason: "치료경험담·후기 형식은 의료법상 금지(적발 1위 유형)입니다. 후기 대신 일반 정보로 바꾸세요.", severity: "high" },
  // ⑥ 거짓·과장 전문성 (medium) — bare '전문'은 제외(전문의·전문병원·전문진료 등 합법어 충돌 방지)
  { test: /명의|권위자|최고\s*전문가|1\s*인자/g, type: "거짓전문", law: MEDICAL_LAW, reason: "객관적 근거 없는 ‘명의·권위자’ 등 표현은 과장광고 소지가 있습니다.", severity: "medium", note: MEDIUM_NOTE },
];

const ACADEMY_LAW = "학원법(거짓·과장광고)";
const ACADEMY_RULES: Rule[] = [
  { test: /합격\s*보장|성적\s*보장|점수\s*보장|환급\s*보장/g, type: "결과보장", law: ACADEMY_LAW, reason: "합격·성적 등 결과를 보장하는 표현은 금지됩니다.", severity: "high" },
  { test: /무조건|100\s*%|반드시\s*(?:합격|성공)/g, type: "결과보장", law: ACADEMY_LAW, reason: "결과를 단정·보장하는 표현은 금지됩니다.", severity: "high" },
  { test: /최고의?|1\s*등|유일한|제일의?/g, type: "최상급", law: ACADEMY_LAW, reason: "객관적 근거 없는 최상급 표현은 과장광고 소지가 있습니다.", severity: "high", suggestion: "체계적인" },
];

const PRO_LAW = "변호사법·세무사법 등(과장광고)";
const PRO_RULES: Rule[] = [
  { test: /반드시\s*승소|승소\s*보장|성공\s*보장|100\s*%\s*환급|환급\s*보장/g, type: "결과보장", law: PRO_LAW, reason: "승소·환급 등 결과를 보장하는 표현은 금지됩니다.", severity: "high" },
  { test: /최고의?|1\s*위|1\s*등|유일한|제일의?/g, type: "최상급", law: PRO_LAW, reason: "객관적 근거 없는 최상급 표현은 과장광고 소지가 있습니다.", severity: "high", suggestion: "전문적인" },
];

const GENERAL_LAW = "표시광고법(부당광고)";
const GENERAL_RULES: Rule[] = [
  { test: /업계\s*최고|국내\s*최고|최고의?|유일한|1\s*등|1\s*위/g, type: "최상급", law: GENERAL_LAW, reason: "객관적 근거 없는 최상급 표현은 부당광고가 될 수 있어요.", severity: "medium", note: "수상·통계 등 근거가 있으면 괜찮지만, 없으면 완화하는 게 안전해요.", suggestion: "앞선" },
];

const RULES: Record<string, Rule[]> = {
  medical: MEDICAL_RULES,
  academy: ACADEMY_RULES,
  professional: PRO_RULES,
  b2b: GENERAL_RULES,
  general: GENERAL_RULES,
  online: GENERAL_RULES, // 수익형 — 표시광고법(최상급 과장)만 가볍게
  hobby: [], // 취미·기록 — 광고규제 대상 아님
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ");
}

/**
 * 텍스트(평문/HTML)를 업종 규칙으로 스캔한다. 같은 표현은 합쳐 count로 집계하고, high가 먼저 오도록 정렬한다.
 * 알 수 없는 vertical(또는 general)은 표시광고법 기준(최상급만 가볍게)으로 폴백.
 */
export function scanCompliance(text: string, vertical: string): Violation[] {
  if (!text) return [];
  const rules = RULES[vertical] ?? RULES.general;
  const plain = stripHtml(text);
  const found = new Map<string, Violation>();
  for (const rule of rules) {
    const flags = rule.test.flags.includes("g") ? rule.test.flags : rule.test.flags + "g";
    const re = new RegExp(rule.test.source, flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(plain)) !== null) {
      const matched = m[0].trim();
      if (!matched) { re.lastIndex += 1; continue; }
      const key = `${rule.type}|${matched}`;
      const ex = found.get(key);
      if (ex) ex.count += 1;
      else found.set(key, { matched, type: rule.type, law: rule.law, reason: rule.reason, severity: rule.severity, suggestion: rule.suggestion, note: rule.note, count: 1 });
      if (m.index === re.lastIndex) re.lastIndex += 1; // 0길이 매칭 무한루프 방지
    }
  }
  return [...found.values()].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}

/** 본문/제목 문자열에서 위반 표현을 대체 표현으로 전부 치환한다('바꾸기' 버튼용). */
export function applySuggestion(text: string, matched: string, suggestion: string): string {
  return text.split(matched).join(suggestion);
}
