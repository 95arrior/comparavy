import { readSignals, pickTitleType, fitScore, TITLE_TYPES } from "../lib/titleTypes.ts";
import { validateHomefeedTitle, staleMonthIn } from "../lib/titleRules.ts";
import { coreKeywordOf } from "../lib/editorial.ts";
import fs from "node:fs";

// ★홈판 제목 유형 회귀(2026-08-02 유저 확정: "그 글에 핏한 걸 선택해서 작성").
//  기존은 날짜 해시 추첨이라 마감 없는 글감에 위협형이, 비교축 없는 글감에 비교형이 걸릴 수 있었다.
//  이 테스트가 지키는 것: ①신호에 맞는 유형이 뽑히는가 ②지어낸 경험이 유형으로 열리지 않는가
//  ③홈판 제목 규격이 검색 제목 규격에 잡아먹히지 않는가(느낌표 허용·길이 여유).
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 신호 → 유형 적합도 ────────────────────────────────────────────────
const 케이스 = [
  { text: "근로장려금 신청 마감 8월 31일까지, 놓치면 올해는 못 받는다", want: "threat", why: "실제 마감이 있다" },
  { text: "숨은 보험금 조회하면 평균 12만원 환급 지원금", want: "gain", why: "받을 수 있는 돈" },
  { text: "30대 평균 저축액 통계청 중위값 비율", want: "curious", why: "자기 위치 확인 통계" },
  { text: "연금저축과 IRP 중 어느 쪽을 먼저 채워야 유리한지 비교", want: "compare", why: "비교 축이 둘" },
  { text: "적금 이자가 손해인 경우, 다들 잘못 알고 있는 통념", want: "twist", why: "통념 파괴" },
  { text: "전기요금 할인 신청 방법과 조회 절차 순서 준비물", want: "action", why: "절차형" },
];
for (const c of 케이스) {
  const got = pickTitleType(readSignals(c.text)).key;
  ok(got === c.want, `${c.want} 선택`, `→ ${c.why} (실제: ${got})`);
}

// ── ② 경험형은 실경험 없이는 절대 안 열린다 (지어낸 경험 = 계정 사망) ──
{
  const 실경험없음 = readSignals("연말정산 환급 후기 경험담 직접 해보니", { userExperience: false });
  ok(fitScore("experience", 실경험없음) < 0, "★실경험 없으면 경험형은 후보에서 제외");
  ok(pickTitleType(실경험없음).key !== "experience", "★경험형이 뽑히지 않는다");
  const 실경험있음 = readSignals("연말정산 환급", { userExperience: true });
  ok(pickTitleType(실경험있음).key === "experience", "실경험이 있으면 경험형이 최우선");
}

// ── ②-2 기한 없는 위협은 공포 조장이다 ─────────────────────────────────
{
  const 기한없음 = readSignals("노후 준비 안 하면 생기는 일");
  ok(fitScore("threat", 기한없음) < 0, "★실제 기한 없으면 위협형 제외(공포 조장 방지)");
}

// ── ③ 홈판 제목 규격 ───────────────────────────────────────────────────
const 통과 = [
  "안 찾아간 돈 평균 12만 원, 조회는 3분이면 끝납니다",
  "전기요금 이번 달 왜 이렇게 나왔을까? 바뀐 게 하나 있습니다",
  "적금 이자, 사실 4분의 1은 세금으로 사라집니다!",
];
for (const t of 통과) ok(validateHomefeedTitle(t, t.slice(0, 4)).ok, "홈판 규격 통과", `→ ${t}`);

const 실격 = [
  ["전기요금 폭탄!!! 지금 확인하세요!!!", "전기요금", "excl_overuse"],
  ["짧은 제목", "제목", "len"],
  ["[속보] 전기요금 인상 확정 소식을 지금 바로 확인해 보세요", "전기요금", "bad_chars"],
];
for (const [t, kw, why] of 실격) {
  const v = validateHomefeedTitle(t, kw);
  ok(!v.ok && String(v.reason).startsWith(why.split("_")[0]), `홈판 규격 실격(${why})`, `→ ${t} (사유: ${v.reason})`);
}

// ★앵커≠검색키워드 회귀(2026-08-02 실측) — 홈판 카드의 keyword는 '주제 앵커(소재)'다.
//  처음엔 검색 제목처럼 '키워드가 제목에 있어야' 한다고 걸었다가 좋은 제목이 대량으로 죽었다.
//  아래 두 건은 실제로 탈락했던 실물이다 — 다시 막히면 안 된다.
const 앵커실측 = [
  ["7월 미환급금", "이번 달 월급 들어오기 전에, 안 찾아간 내 돈 먼저 확인하세요"],
  ["월급날 자동이체 함정", "월급 들어오자마자 적금 넣는 게 손해일 수 있는 이유"],
];
for (const [kw, t] of 앵커실측) {
  ok(validateHomefeedTitle(t, kw).ok, "★앵커가 제목에 없어도 통과(홈판은 키워드 판정 게임이 아니다)", `→ 앵커="${kw}"`);
}

// ★앵커 핵심어 추출 — 키워드 하한이 세는 대상(앵커 문구 통째로 5회는 부자연스럽다)
{
  const 케이스 = [
    ["7월 미환급금", "미환급금"],
    ["월급날 자동이체 함정", "자동이체"],
    ["30대 평균 저축액", "저축액"],   // ★숫자 시작 토큰(30대)은 핵심어가 아니다
    ["아파트경매", "아파트경매"],
  ];
  for (const [kw, want] of 케이스) {
    const got = coreKeywordOf(kw);
    ok(got === want, `앵커 핵심어 "${kw}" → ${want}`, got === want ? "" : `(실제: ${got})`);
  }
}

// ★지난 달 시의성 회귀(2026-08-02 실측: 8월 2일에 홈판 4장이 전부 7월 소재였다).
//  원인은 프롬프트에 오늘 날짜가 없던 것 — kstDay를 캐시 키에만 쓰고 프롬프트엔 안 넘겼다.
{
  const 팔월 = new Date("2026-08-02T03:00:00+09:00");
  ok(staleMonthIn("7월에 무이자 할부 쓰면 오히려 비용이 더 드는 경우", 팔월) === 7, "★실측 사고 문구(7월에 …)를 차단");
  ok(staleMonthIn("7월분 건보료 정산", 팔월) === 7, "조사가 붙어도 차단(7월분)");
  ok(staleMonthIn("9월 재산세 2기, 미리 준비할 것", 팔월) === null, "다가올 달은 통과(선행 발행 전략)");
  ok(staleMonthIn("최대 12개월 무이자", 팔월) === null, "기간 표현(12개월)은 오탐 아님");
  ok(staleMonthIn("8월 전기요금 고지서", 팔월) === null, "이번 달은 통과");
  const hb2 = fs.readFileSync(new URL("../lib/homefeedBet.ts", import.meta.url), "utf-8");
  ok(/오늘은 \$\{todayKst\}/.test(hb2), "★홈판 프롬프트에 오늘 날짜가 주입됨");
  ok(/staleMonthIn/.test(hb2), "★지난 달 코드 게이트가 배선됨");
  ok(/소재 중복 — 제외/.test(hb2), "★같은 날 소재 중복 카드 제거가 배선됨");
}

// ★검색 제목 규격이 홈판을 잡아먹지 않는지 — 느낌표는 검색에선 금지, 홈판에선 허용이어야 한다
{
  const tr = fs.readFileSync(new URL("../lib/titleRules.ts", import.meta.url), "utf-8");
  ok(/validateHomefeedTitle/.test(tr), "홈판 전용 게이트가 별도로 존재");
  const hb = fs.readFileSync(new URL("../lib/homefeedBet.ts", import.meta.url), "utf-8");
  ok(/validateHomefeedTitle/.test(hb), "★홈판 카드 경로에 게이트가 배선됨");
  ok(/titleTypeDirective/.test(hb), "★제목 유형 지시가 프롬프트에 주입됨");
  ok(!/ⓐ공감 프레임/.test(hb), "★옛 4종 결 예시가 제거됨(예시를 남기면 모델이 베낀다)");
  const tr2 = fs.readFileSync(new URL("../lib/titleRules.ts", import.meta.url), "utf-8");
  ok(!/keyword_missing/.test(tr2), "★홈판 게이트에서 키워드 강제가 철회됨(실측으로 좋은 제목이 죽었다)");
}

// ★유형 7종이 전부 살아 있는지(하나라도 죽으면 로테이션이 좁아진다)
ok(TITLE_TYPES.length === 7, `유형 7종 유지 (현재 ${TITLE_TYPES.length})`);
for (const t of TITLE_TYPES) ok(Boolean(t.payoff), `${t.name}에 본문 이행 의무가 정의됨`);

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 홈판 제목 유형");
process.exit(fail ? 1 : 0);
