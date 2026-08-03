import { isOverusedTitleShape, titleShapeClashes } from "../lib/editorial.ts";
import fs from "node:fs";
import { validateTitleTail } from "../lib/titleRules.ts";

// ★제목 뼈대 수렴 회귀(2026-08-01 유저 실측) — WP 31편 중 7편이 '~ 전 확인할 N가지'였다.
//  2026-07-16에 '~하는 법/정리: 부제' 콜론형 수렴을 한 번 잡았는데 다른 형태로 재발했다.
//  로테이션만으로는 못 막는다 — 한 형식 안에서 예시 뼈대를 그대로 베끼기 때문이다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// 실제 발행된 제목들(pigtong.com에서 그대로 가져옴)
const 수렴 = [
  "중국주식 시작 전 확인할 5가지",
  "미국금리 확인 전 알아야 할 5가지",
  "저축은행 종류 선택 전 확인할 5가지",
  "금융기관 이용 전 확인할 5가지",
  "온투업 투자 전 확인할 5가지",
  "앱테크 시작 전 확인할 5가지 기준",
  "모의주식 시작 전 확인할 5가지",
  "퇴직연금 세액공제 챙기기 전 확인할 4가지",
];
const 정상 = [
  "조선관련주, 지금 사도 되는 걸까요?",
  "2차전지주, 지금 들어가도 되는지 판단하는 법",
  "로또 당첨되면 세금 얼마나 내나요?",
  "연말정산 환급금, 언제 어디서 얼마나 받나요?",
  "CMA통장 추천: 유형별로 골라야 이자가 다릅니다",
  "코인 종류 정리: 비트코인부터 RWA·스테이블코인까지 한눈에",
];
for (const t of 수렴) ok(isOverusedTitleShape(t), "과다 뼈대 검출", `→ ${t}`);
for (const t of 정상) ok(!isOverusedTitleShape(t), "정상 제목은 통과", `→ ${t}`);

// 옛 수렴(2026-07-16)도 계속 막혀 있어야 한다
ok(isOverusedTitleShape("정기예금특판 고르는 법: 신협 금리 정리"), "옛 콜론형 수렴도 검출");

// 문형 충돌 판정
ok(titleShapeClashes("베트남주식 투자 전 확인할 5가지", 수렴.slice(0, 3)), "★같은 문형이 여럿이면 충돌 판정");
ok(!titleShapeClashes("조선관련주, 지금 사도 되는 걸까요?", 수렴), "다른 문형은 충돌 아님");

// ★프롬프트에서 예시 뼈대가 제거됐는지(예시를 남기면 모델이 그대로 베낀다)
{
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(!/예: '정기예금특판 가입 전 확인할 5가지'/.test(ap), "★수렴을 부른 예시가 프롬프트에서 제거됨");
  ok(/금지 뼈대/.test(ap), "금지 뼈대가 프롬프트에 명시됨");
  ok(/이미 이 블로그에 있는 최근 제목들이다/.test(ap), "최근 제목을 보여주고 피하게 함");
  const wp = fs.readFileSync(new URL("../app/api/cron/wp-autopublish/route.ts", import.meta.url), "utf-8");
  ok(/isOverusedTitleShape/.test(wp), "★자동발행 경로에 코드 게이트가 붙음");
}

// ── ★제목 공식(2026-08-03 유저 제공 상위 경제 블로그 제목 44개 실측) ──────
//  발견: 상위 제목은 훅의 '자리'가 아니라 '구조'가 다르다.
//   [수식절] + [검색 키워드 명사구] + [여운 꼬리] — 키워드를 훼손하지 않으면서 클릭 이유를 만든다.
//  그리고 종전 프롬프트엔 자기모순이 있었다: '이것만 알면'을 금지해놓고 예시가 그걸 쓰고 있었다.
//  모델은 규칙보다 예시를 따른다 — 보드에 뜬 '패시브인컴 만드는 기초, 어디서부터 시작할까'가 그 자식이다.
{
  const tt = fs.readFileSync(new URL("../lib/topicTitles.ts", import.meta.url), "utf-8");

  ok(/제목 구조 = \[수식절\]/.test(tt), "★제목 공식이 프롬프트에 명시됨");
  ok(/완결하지 마라/.test(tt), "★답까지 주지 말고 궁금한 채로 끊으라고 지시함");
  ok(/전언형/.test(tt), "★전언형 어미(사적 경험 없이 후킹하는 우회로)가 명시됨");
  ok(/사적 경험 서술 금지/.test(tt), "★사적 경험 날조는 여전히 금지");

  // ★자기모순 회귀 — 금지어가 예시 안에 살아 있으면 안 된다.
  //  예시 블록만 잘라서 검사한다(금지 목록 자체에는 그 단어가 당연히 등장하므로).
  const examples = [...tt.matchAll(/"예\).*?\\n"/g)].map((m) => m[0]).join(" ");
  ok(examples.length > 0, "예시 블록을 찾았다", `${examples.length}자`);
  for (const banned of ["이것만 알면", "총정리", "알아야 할 것", "어디서부터 시작"]) {
    ok(!examples.includes(banned), `★예시가 금지 표현을 쓰지 않는다`, banned);
  }

  // ★실격 예로 박아둔 것들 — 우리 보드에 실제로 떴던 제목이다. 목록에서 사라지면 재발을 못 잡는다.
  ok(/패시브인컴 만드는 기초/.test(tt), "실측 실격 사례가 프롬프트에 박혀 있다");

  // ★폴백도 공식을 지키는가 — 폴백이 규격을 어기면 규칙이 가장 자주 깨지는 곳이 우리 코드가 된다.
  const block = (tt.match(/const TEMPLATES = \[[\s\S]*?\];/) ?? [""])[0];
  ok(/다는/.test(block), "★폴백 템플릿도 전언형 공식을 쓴다");
  for (const banned of ["여기부터 보세요", "놓치기 쉬운 것들"]) {
    ok(!block.includes(banned), "★폴백에서 밋밋한 안내형이 제거됨", banned);
  }
}


// ── ★제목 경로가 넷이다(2026-08-03 유저 실측에서 검거) ─────────────────
//  카드 제목에만 공식을 넣었는데 '실제 발행되는 제목'은 generateArticle이 따로 만들고 있었다.
//  그 지시가 "핵심 키워드를 앞쪽에, 검색 의도에 맞게"뿐이라 이런 게 나왔다:
//   '신생아 전세대출 조건, 따로 사는 무주택 부부도 공제받는 방법'
//   — 수식절 없음·답까지 줌·'방법'으로 닫힘. 상위 44개와 정반대다.
//  ★공식을 한 곳에 두고 세 경로가 같이 읽게 한다 — 따로 두면 반드시 드리프트한다.
{
  const tt = fs.readFileSync(new URL("../lib/titleTypes.ts", import.meta.url), "utf-8");
  ok(/export const PUBLISH_TITLE_FORMULA/.test(tt), "★발행 제목 공식이 단일 진실원으로 있다");
  ok(/실격 예: '신생아 전세대출 조건/.test(tt), "★유저가 잡은 실물이 실격 예로 박혀 있다");
  ok(/하는 방법', '~ 정리'/.test(tt) || /완결 금지/.test(tt), "★'방법·정리'로 닫는 것을 금지한다");

  // ★가장 중요한 경로 — 실제로 발행되는 제목
  const ga = fs.readFileSync(new URL("../lib/generateArticle.ts", import.meta.url), "utf-8");
  ok(/PUBLISH_TITLE_FORMULA/.test(ga), "★발행 제목 생성이 공식을 읽는다(여기가 진짜 제목이다)");
  ok(!/핵심 키워드를 앞쪽에 자연스럽게, 검색 의도에 맞게" \}/.test(ga), "★공식 없던 옛 지시가 제거됨");

  // ★트렌드 레인 — 카드 제목 경로 중 유일하게 빠져 있던 곳
  const at = fs.readFileSync(new URL("../lib/amplifyTopics.ts", import.meta.url), "utf-8");
  ok(/PUBLISH_TITLE_FORMULA/.test(at), "★트렌드 레인 제목도 같은 공식을 읽는다");
  ok(/titleSearch는 아래 별도 규격/.test(at), "★titleSearch는 일부러 완결형이라는 단서를 남긴다(오적용 방지)");
}


// ── ★꼬리 게이트(2026-08-04 유저: "빡세게 잡아주세요. 계속 실패가 나오면 안 됩니다") ──
//  프롬프트로만 두니 '~정리'·'~방법'·'~기초'·'~내용'이 반복해서 통과했다(유저가 네 번 잡아냈다).
//  ★꼬리는 판정이 확실하다. 수식절 유무는 오탐 위험이 커서 프롬프트에 남기고 꼬리만 코드로 막는다.
{
  // ★유저가 실제로 잡아낸 것들 — 전부 막혀야 한다
  const 실격 = [
    ["연말정산기간 전에 챙길 공제항목 정리", "정리"],
    ["신생아 전세대출 조건, 따로 사는 무주택 부부도 공제받는 방법", "방법"],
    ["개인신용정보서 열람, 대출 전 확인하는 법", "확인하는 법"],
    ["수익률 놓치고 시작하는 사람 많다는 적립식투자 기초", "기초"],
    ["분기마다 뒤늦게 챙긴다는 세무조정료 내용", "내용"],
    ["청년 ISA 2026년 신설...비과세 한도와 가입 조건 정리", "말줄임표+정리"],
    ["무직자주택담보대출, 모르고 넘어가면 손해인 기준 정리", "정리"],
    ["대출 거절되고 나서야 열어본 개인신용정보서, 이렇게 읽으면 됩니다", "됩니다"],
  ];
  for (const [t, why] of 실격) {
    const r = validateTitleTail(t);
    ok(!r.ok, `★실격: ${why}`, t.slice(0, 26));
  }

  // ★오탐 방어가 더 중요하다 — 유저가 준 상위 44개 중 대표를 반드시 통과시켜야 한다.
  //  여기서 하나라도 막히면 이 게이트는 못 쓴다(멀쩡한 제목이 템플릿으로 강등된다).
  const 통과 = [
    "은근히 상대적 박탈감 느낀다는 40대 순자산 현실",
    "월 실수령 350만원인데 재테크 못하는 사람 특징",
    "로또 20억원 당첨되도 못가는 우리나라 공식 1등 부자 동네",
    "생각보다 격차 커서 씁쓸한 대한민국 17개 지역별 순자산 순위",
    "생각없이 재건축 빌라에 2억 넘게 쓴 신혼부부의 후회",
    "회사 8년 다녔는데 연금저축펀드 아직 모르는 동생한테 추천해준 ETF",
    "한달 생활비 450만원이라 허덕이기 싫어 만든 재테크 습관",
    "48일만에 무너진 달러 환율 1460원, 지금 줍줍해도 될까?",
    "20억 자가에 사는데도 하우스푸어라고 씁쓸하다는 중산층 기준",
    "이번 달 넘기면 10% 깎인다는, 근로장려금 기한 후 신청 현실",
    "실적 좋아도 빠지는 투자자 많다는 반도체대장주 선정 기준",
    "은근히 복잡한 현금화 수수료가 진짜 손실인 이유",
  ];
  for (const t of 통과) {
    const r = validateTitleTail(t);
    ok(r.ok, "★통과해야 하는 상위 제목", `${t.slice(0, 24)}${r.ok ? "" : " ← " + r.reason}`);
  }

  // ★폴백 템플릿도 자기 게이트를 통과해야 한다 — 규격 미달 제목을 폴백으로 떨어뜨리는데
  //  그 폴백이 또 미달이면 무한히 미달이다(규칙이 가장 자주 깨지는 곳이 우리 코드가 된다).
  const tt = fs.readFileSync(new URL("../lib/topicTitles.ts", import.meta.url), "utf-8");
  const tpl = (tt.match(/const TEMPLATES = \[([\s\S]*?)\];/) ?? ["", ""])[1];
  for (const m of tpl.matchAll(/`([^`]+)`/g)) {
    const sample = m[1].replace(/\$\{k\}/g, "연말정산기간");
    ok(validateTitleTail(sample).ok, "★폴백 템플릿이 게이트를 통과한다", sample);
  }

  // ★배선 — 만들어놓고 안 부르면 아무 일도 안 일어난다
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/validateTitleTail\(String\(\(a as \{ title\?: string \}\)\.title/.test(gr), "★발행 제목이 게이트를 지난다(되돌릴 수 없는 자리)");
  ok(/validateTitleTail\(title\)/.test(tt), "★검색 카드 제목도 게이트를 지난다");

  // ★트렌드 레인 — 유저 화면에서 유일하게 새던 경로(말줄임표·'정리'가 그대로 통과했다)
  const at = fs.readFileSync(new URL("../lib/amplifyTopics.ts", import.meta.url), "utf-8");
  ok(/validateTitleTail\(titleClick\)/.test(at), "★트렌드 카드 제목도 게이트를 지난다");
  ok(/title-tail:trend/.test(at), "★버릴 때 로그를 남긴다(조용히 사라지면 원인을 못 찾는다)");
  // ★씨앗 제목은 뉴스 헤드라인이라 '…'이 흔하다 — 버리기 전에 우리 문장부호로 고쳐 살린다
  ok(/const repaired = titleClick\.replace/.test(at), "★말줄임표는 고쳐서 살려 본 뒤 그래도 미달이면 버린다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 제목 뼈대");
process.exit(fail ? 1 : 0);
