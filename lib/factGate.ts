// 발행 전 사실 검사 3층 — 생성이 끝난 글을 '다시 읽는' 층.
//  배경(2026-07-31 실측): 자사 사이트 두 곳에서 오류가 나왔는데 성격이 완전히 달랐다.
//   ① 옛 숫자를 그대로 씀(예금자보호 5천만 원) — 정답값 대조로 잡힌다.
//   ② 제도 구조를 잘못 이해(퇴직소득을 종합소득세로 환급받으라고 씀) — 문장이 자연스러워서 숫자 검증으로 안 잡힌다.
//  ★②를 같은 모델에게 자기 글을 검수시켜 잡으려는 시도는 실패한다. 쓸 때 한 오해는 읽을 때도 그대로 한다.
//   그래서 판단 기준은 프롬프트가 아니라 코드가 갖는다(CLAUDE.md: 프롬프트는 방향, 코드는 한계선).
//  ★게이트 중앙화: 새 검사 규칙은 이 파일에만 추가한다. 호출부(생성·재작성·자동발행)에 복붙하면 반드시 빠지는 경로가 생긴다.
//  ★정답값은 여기서 만들지 않는다 — lib/financeCalc의 RATES 하나만 본다(값이 두 곳에 있으면 반드시 갈라진다).

import { ASOF, RATES } from "@/lib/financeCalc";

export type FactLayer = "value" | "structure" | "missing";
export type FactSeverity = "block" | "warn";

export interface FactIssue {
  layer: FactLayer;
  severity: FactSeverity; // block(거의 확실한 오류) | warn(맥락 따라)
  matched: string; // 걸린 표현(누락층은 빠진 항목 이름)
  title: string; // 한 줄 요약
  reason: string; // 왜 문제인지
  fix: string; // 어떻게 고치는지
  count: number;
}

/** 발행 판정. 구조 오류는 문단을 통째로 다시 써야 해서 값 오류보다 무겁다. */
export type FactVerdict = "publish" | "fix" | "rewrite";

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ");
}

const won = (n: number): string => `${Math.round(n / 10_000).toLocaleString("ko-KR")}만 원`;

function countMatches(s: string, re: RegExp): number {
  return (s.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) ?? []).length;
}

/**
 * a가 나온 자리 앞뒤 window자 안에 b가 같이 있는지 본다(문장 경계로는 못 자른다 — 한 문단에 걸쳐 틀리는 게 흔하다).
 * except가 그 창 안에 있으면 건너뛴다: "퇴직소득은 종합소득세 대상이 아니다"는 정답인데 같은 두 단어가 붙어 있다.
 */
function nearby(plain: string, a: RegExp, b: RegExp, except: RegExp | null, window = 90): string[] {
  const re = new RegExp(a.source, a.flags.includes("g") ? a.flags : a.flags + "g");
  const hits: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain)) !== null) {
    if (m.index === re.lastIndex) re.lastIndex += 1; // 0길이 매칭 무한루프 방지
    const ctx = plain.slice(Math.max(0, m.index - window), m.index + m[0].length + window);
    if (!b.test(ctx)) continue;
    if (except && except.test(ctx)) continue; // 올바르게 부정한 문장은 통과
    hits.push(ctx.replace(/\s+/g, " ").trim());
  }
  return hits;
}

// ────────────────────────────────────────────────────────────────────────────
// 1층. 변하는 값 — 옛 숫자가 그대로 남아 있는지. 정답은 financeCalc이 갖는다.
// ────────────────────────────────────────────────────────────────────────────

interface ValueRule {
  anchor: RegExp; // 주제어
  stale: RegExp; // 그 근처에 있으면 안 되는 옛 값
  except?: RegExp; // "종전 5천만 원에서 상향" 같은 정당한 인용
  severity: FactSeverity;
  title: string;
  reason: string;
  fix: string;
}

const VALUE_RULES: ValueRule[] = [
  {
    anchor: /예금자?\s*보호|예금\s*보호|보호\s*한도/,
    stale: /5,?000\s*만|5천\s*만|50,000,000|5,?000만원/,
    except: /종전|기존|이전(?:에|까지)|→|에서\s*1억|상향|까지였/,
    severity: "block",
    title: "예금자보호 한도가 옛 값(5천만 원)입니다",
    reason: `${RATES.depositProtect.since}부터 ${won(RATES.depositProtect.limit)}으로 상향됐습니다. 2025년 9월 이전 자료에는 옛 한도가 그대로 남아 있어 모델이 자주 옛 값을 씁니다.`,
    fix: `금융회사별 1인당 원금+이자 합산 ${won(RATES.depositProtect.limit)}으로 고칩니다. 옛 값을 언급하려면 "종전 ${won(RATES.depositProtect.prev)}에서 상향" 형태로만 씁니다.`,
  },
  {
    anchor: /연금\s*저축|IRP|세액\s*공제/i,
    stale: /400\s*만|700\s*만/,
    except: /종전|기존|이전(?:에|까지)|상향|까지였/,
    severity: "warn",
    title: "연금계좌 세액공제 한도가 옛 값일 수 있습니다",
    reason: `${ASOF} 기준 한도는 연금저축 ${won(RATES.pensionLimit.pensionOnly)}, IRP 합산 ${won(RATES.pensionLimit.withIrp)}입니다.`,
    fix: `한도 숫자를 ${won(RATES.pensionLimit.pensionOnly)}/${won(RATES.pensionLimit.withIrp)}로 맞추거나, 한도와 무관한 금액이면 문맥을 분명히 합니다.`,
  },
  {
    anchor: /ISA|절세\s*계좌/i,
    stale: /200\s*만|400\s*만/,
    except: /종전|기존|이전(?:에|까지)|상향|까지였/,
    severity: "warn",
    title: "ISA 비과세 한도가 옛 값일 수 있습니다",
    reason: `${ASOF} 기준 비과세 한도는 일반형 ${won(RATES.isaExempt.general)}, 서민형 ${won(RATES.isaExempt.seomin)}입니다.`,
    fix: `비과세 한도를 ${won(RATES.isaExempt.general)}/${won(RATES.isaExempt.seomin)}으로 고칩니다.`,
  },
  {
    anchor: /건강\s*보험료?율|건보료?율|장기\s*요양/,
    stale: /6\.\d{1,2}\s*%|7\.0\d\s*%/,
    severity: "warn",
    title: "건강보험료율이 옛 값일 수 있습니다",
    reason: `${ASOF} 기준 건강보험료율은 ${(RATES.healthTotal * 100).toFixed(2)}%(본인 부담 ${(RATES.healthEmployee * 100).toFixed(3)}%), 장기요양은 소득 대비 ${(RATES.ltc * 100).toFixed(4)}%입니다.`,
    fix: "요율을 현행 값으로 고치고, 기준 연도를 함께 표기합니다.",
  },
];

// 시점 표현은 값이 아니라 '아직 안 됐다'는 단정이라 따로 본다 — 이미 시행됐는데 예정으로 쓰면 글 전체가 낡아 보인다.
const PENDING_RE = /(\d{4}\s*년[^.\n]{0,20}?)(?:부터\s*)?시행\s*(?:될\s*)?예정|도입\s*예정|시행\s*예정/g;

// ────────────────────────────────────────────────────────────────────────────
// 2층. 절차·관할 구조 — 숫자는 맞는데 제도를 잘못 이해한 경우. 자동 검증이 가장 안 되는 층.
// ────────────────────────────────────────────────────────────────────────────

interface StructureRule {
  a: RegExp;
  b: RegExp;
  except?: RegExp;
  severity: FactSeverity;
  title: string;
  reason: string;
  fix: string;
}

const STRUCTURE_RULES: StructureRule[] = [
  {
    // 실측 사고: "퇴직소득세를 종합소득세로 환급받으세요" — 분류과세를 종합과세로 처리했다.
    a: /퇴직\s*(?:소득|급여|금)/,
    b: /종합\s*소득세|종합\s*과세|합산\s*(?:신고|과세)|5월에?\s*신고/,
    except: /대상이?\s*아니|해당(?:하지|되지)\s*않|포함되지\s*않|제외|분류\s*과세|별도로\s*과세/,
    severity: "block",
    title: "퇴직소득을 종합소득세로 처리했습니다",
    reason: "퇴직소득은 분류과세라 종합소득세 신고·합산 대상이 아닙니다. 회사가 원천징수로 정산을 끝냅니다. 문장이 자연스러워서 읽는 사람이 그대로 따라 하기 쉬운, 가장 위험한 형태의 오류입니다.",
    fix: "해당 문단을 통째로 다시 씁니다. '퇴직소득은 분류과세로 종합소득세 대상이 아니다'를 명시하고, 환급 경로는 퇴직소득세 정산·경정청구로 바로잡습니다.",
  },
  {
    // 실측 위험: cma계좌개설 글이 클릭 상위인데, CMA를 예금자보호 대상으로 쓰면 원금 손실 오해가 된다.
    a: /CMA/i,
    b: /예금자?\s*보호|원금\s*(?:이|은|을)?\s*보장/,
    except: /대상이?\s*아니|되지\s*않|안\s*됩니다|제외|비대상|보호받지\s*못|종금형/,
    severity: "block",
    title: "CMA를 예금자보호 대상으로 썼습니다",
    reason: "CMA는 종금형을 제외하면 예금자보호 대상이 아닙니다. 보호된다고 오해하면 독자가 실제 손실을 볼 수 있는 항목입니다.",
    fix: "'CMA는 예금자보호 대상이 아니다(종금형 CMA만 예외)'로 고치고, 보호 여부를 상품별로 구분하는 표를 넣습니다.",
  },
  {
    a: /건강\s*보험|국민\s*연금|고용\s*보험|산재\s*보험|4대\s*보험|실업\s*급여/,
    b: /국세청|홈택스|세무서/,
    except: /아니|따로|별도|공단|고용\s*센터|근로\s*복지/,
    severity: "warn",
    title: "공단 소관 업무를 국세청으로 안내했을 수 있습니다",
    reason: "건강보험·국민연금은 각 공단, 고용보험·실업급여는 고용센터 소관입니다. 관할을 잘못 쓰면 독자가 엉뚱한 곳에 가서 기한을 놓칩니다.",
    fix: "신청·신고처를 공단/고용센터/국세청으로 나눠 명시합니다. 4대보험 보험료 징수와 세금 신고를 한 창구로 묶지 않습니다.",
  },
  {
    a: /기한|기간|마감|신청\s*일/,
    b: /무조건\s*(?:안|불가|못)|절대\s*(?:안|불가|못)|영영|되돌릴\s*수\s*없/,
    except: /경정\s*청구|소급|구제|예외|추후\s*신청|사후/,
    severity: "warn",
    title: "기한 초과를 예외 없이 단정했습니다",
    reason: "대부분의 제도에 경정청구·소급 신청·구제 절차가 있습니다. 예외를 빼면 독자가 받을 수 있는 돈을 포기합니다.",
    fix: "기한을 넘겼을 때의 구제 경로(경정청구 5년 등)를 한 줄 덧붙입니다.",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// 3층. 누락 — 모델은 그럴듯한 것만 쓰고 빠진 걸 스스로 못 찾는다. 목록을 늘리는 것이 유일한 방법이다.
//  ★유저가 실물로 잡은 누락은 반드시 여기에 등재한다(잡힌 결함 = 영구 회귀 테스트).
// ────────────────────────────────────────────────────────────────────────────

interface TopicMusts {
  when: RegExp; // 키워드 또는 본문이 이 주제면
  musts: { name: string; has: RegExp }[];
}

const TOPIC_MUSTS: TopicMusts[] = [
  {
    when: /퇴사|퇴직|이직|권고\s*사직/,
    musts: [
      { name: "건강보험 임의계속가입", has: /임의\s*계속\s*가입/ },
      { name: "연차사용촉진제도", has: /연차\s*(?:사용)?\s*촉진|미사용\s*연차\s*수당/ },
      { name: "퇴직금 IRP 이체 과세이연", has: /과세\s*이연|IRP(?:로|에)?\s*이체/i },
      { name: "퇴직소득 분류과세", has: /분류\s*과세/ },
    ],
  },
  {
    when: /예금|적금|특판|저축\s*은행|파킹/,
    musts: [
      { name: "현행 예금자보호 한도", has: /1\s*억|100,000,000/ },
      { name: "보호 대상·비대상 구분", has: /대상이?\s*아니|비대상|보호되지\s*않|제외/ },
      { name: "금융회사별 합산 기준", has: /금융\s*(?:회사|기관)\s*별|1인당|합산/ },
    ],
  },
  {
    when: /CMA|증권\s*계좌|주식\s*계좌/i,
    musts: [{ name: "CMA 예금자보호 비대상", has: /예금자?\s*보호[^.\n]{0,30}(?:아니|않|제외|비대상)|비대상/ }],
  },
  {
    when: /연금\s*저축|IRP|퇴직\s*연금/i,
    musts: [
      { name: "세액공제 한도", has: /600\s*만|900\s*만|한도/ },
      { name: "중도해지 기타소득세", has: /기타\s*소득세|중도\s*해지/ },
    ],
  },
  {
    when: /지원금|정책\s*자금|보조금|바우처/,
    musts: [
      { name: "신청 기간", has: /신청\s*(?:기간|기한)|접수\s*기간|까지\s*신청/ },
      { name: "예산 소진 시 마감", has: /소진|조기\s*마감|예산\s*(?:한도|범위)/ },
      { name: "중복 수급 제한", has: /중복\s*(?:수급|지원|신청)?\s*(?:제한|불가|안\s*됩)/ },
    ],
  },
];

/**
 * 본문(HTML/평문)을 3층으로 검사한다. keyword는 주제 판정용 — 본문에도 주제어가 있으면 같이 잡는다.
 * 자동 차단이 아니라 '무엇을 어떻게 고칠지'까지 돌려주는 것이 목적(과잉차단 방지 — complianceFilter와 같은 원칙).
 */
export function scanFacts(text: string, keyword: string): FactIssue[] {
  if (!text) return [];
  const plain = stripHtml(text);
  const issues: FactIssue[] = [];

  // 1층 — 값
  for (const rule of VALUE_RULES) {
    const hits = nearby(plain, rule.anchor, rule.stale, rule.except ?? null);
    if (hits.length) {
      issues.push({ layer: "value", severity: rule.severity, matched: hits[0], title: rule.title, reason: rule.reason, fix: rule.fix, count: hits.length });
    }
  }
  const pending = plain.match(PENDING_RE);
  if (pending?.length) {
    issues.push({
      layer: "value",
      severity: "warn",
      matched: pending[0].replace(/\s+/g, " ").trim(),
      title: "'시행 예정' 표현이 있습니다",
      reason: "모델은 학습 시점 기준으로 '예정'을 씁니다. 이미 시행됐을 가능성이 높고, 시행된 제도를 예정으로 쓰면 글 전체가 낡아 보입니다.",
      fix: "시행 여부를 확인해 현재 시점 기준으로 단정합니다. 확인이 안 되면 그 문장을 뺍니다.",
      count: pending.length,
    });
  }

  // 2층 — 구조
  for (const rule of STRUCTURE_RULES) {
    const hits = nearby(plain, rule.a, rule.b, rule.except ?? null);
    if (hits.length) {
      issues.push({ layer: "structure", severity: rule.severity, matched: hits[0], title: rule.title, reason: rule.reason, fix: rule.fix, count: hits.length });
    }
  }

  // 3층 — 누락. 주제 판정은 키워드가 기준이다. 본문에 한 번 스친 단어로 필수항목을 요구하면
  //  경고가 쏟아져서 아무도 안 읽는다(과탐이 게이트를 죽인다) — 본문 기준은 3회 이상 다룬 주제만.
  for (const topic of TOPIC_MUSTS) {
    if (!topic.when.test(keyword) && countMatches(plain, topic.when) < 3) continue;
    for (const must of topic.musts) {
      if (must.has.test(plain)) continue;
      issues.push({
        layer: "missing",
        severity: "warn",
        matched: must.name,
        title: `필수 항목이 빠졌습니다 — ${must.name}`,
        reason: "이 주제에서 독자가 모르면 손해를 보는 항목입니다. 누락은 오류보다 잡기 어렵고, 모델은 빠진 걸 스스로 찾지 못합니다.",
        fix: `본문에 '${must.name}'을 한 단락 또는 표 항목으로 추가합니다.`,
        count: 1,
      });
    }
  }

  const rank: Record<FactLayer, number> = { structure: 0, value: 1, missing: 2 };
  return issues.sort((a, b) => (a.severity === b.severity ? rank[a.layer] - rank[b.layer] : a.severity === "block" ? -1 : 1));
}

/** 발행 판정 — 구조 오류(block)는 문단 재작성, 그 외 block/warn은 수정 후 발행. */
export function factVerdict(issues: FactIssue[]): FactVerdict {
  if (issues.some((i) => i.layer === "structure" && i.severity === "block")) return "rewrite";
  if (issues.length) return "fix";
  return "publish";
}
