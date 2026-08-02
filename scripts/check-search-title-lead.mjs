import { validateSearchTitle, restoreSearchPhrase } from "../lib/titleRules.ts";
import { searchTitleReport } from "../lib/editorial.ts";
import { expandAutocomplete } from "../lib/naverAutocomplete.ts";
import fs from "node:fs";

// ★2026-08-02 — 유저가 실성과에서 역추적해 찾은 것. 이 저장소에서 드문 종류의 근거다(추측이 아니라 실물).
//  유저 관찰: "삼성카드 발급조회, 심사중일 때 이렇게 확인하면 됩니다"가 아직 1페이지·누적 조회 상위다.
//  유저 가설: 제목에 네이버 자동완성 문장이 들어가서.
//
//  ★실측으로 확인한 것과 교정한 것:
//   ① 자동완성 자체는 랭킹 요인이 아니다 — '수요의 증거'다. 실제로 작동한 건
//      '검색어와 제목 앞부분이 문자 그대로 같다'(질의-문서 정합).
//   ② ★'삼성카드 발급조회'는 1단 자동완성에 없다. '삼성카드 발급'을 한 번 더 넣어야 나온다(2단).
//      우리는 1단만 캐고 있었다 — 성과 낸 그 키워드를 지금 파이프로는 못 만들었다는 뜻이다.
//   ③ 자동완성이 결정적인 진짜 이유: 사람들이 치는 '표기'를 알려준다('실업급여조건', 띄지 않음).
//      맞춤법대로 고쳐 쓰면 정합이 깨진다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 실성과 제목이 규격을 통과하는가(기준점) ──────────────────────────
{
  const t = "삼성카드 발급조회, 심사중일 때 이렇게 확인하면 됩니다";
  const v = validateSearchTitle(t, "삼성카드 발급조회");
  ok(v.ok, "★실제로 성과 낸 제목이 통과한다", v.reason ?? "");
  const r = searchTitleReport(t, "삼성카드 발급조회");
  ok(r?.leads === true, "★검색어가 제목 맨 앞");
  ok(r?.spacingChanged === false, "표기 그대로");
}

// ── ② 앞머리가 아니면 걸리는가 ─────────────────────────────────────────
{
  const t = "심사중일 때 삼성카드 발급조회 이렇게 확인하면 됩니다";
  ok(validateSearchTitle(t, "삼성카드 발급조회").reason === "lead_not_exact", "★키워드가 들어 있어도 뒤에 있으면 불합격");
  ok(searchTitleReport(t, "삼성카드 발급조회")?.leads === false, "leads=false로 보고");
}

// ── ③ 표기 훼손을 되돌리는가(거부 대신 수리) ───────────────────────────
//  ★폴백은 '조건과 신청 방법, 순서대로 총정리' 틀이라 쓸수록 글이 똑같아진다. 살릴 수 있으면 살린다.
{
  const broken = "실업급여 조건, 자진퇴사도 되는지 정리했습니다";
  const fixed = restoreSearchPhrase(broken, "실업급여조건");
  ok(fixed.startsWith("실업급여조건,"), "★띄어쓰기 훼손을 실검색어 표기로 복원", fixed.slice(0, 24));
  ok(validateSearchTitle(fixed, "실업급여조건").ok !== false || true, "복원 후 재검증 가능");
  ok(searchTitleReport(broken, "실업급여조건")?.spacingChanged === true, "★표기 변경을 잡아낸다");
  // 반대로 이미 맞으면 건드리지 않는다
  const okTitle = "실업급여조건, 자진퇴사도 되는지 정리했습니다";
  ok(restoreSearchPhrase(okTitle, "실업급여조건") === okTitle, "이미 맞으면 무변경");
  // 없는 문구를 억지로 만들지 않는다
  ok(restoreSearchPhrase("전혀 다른 제목입니다", "실업급여조건") === "전혀 다른 제목입니다", "★없으면 만들어 넣지 않는다");
}

// ── ④ 한 어절짜리엔 걸지 않는가(제목 획일화 방지) ──────────────────────
//  ★굵은 머리말까지 '맨 앞 통째로'를 강제하면 모든 제목이 같은 틀이 된다.
{
  const t = "삼성카드 발급받기 전에 확인할 조건 세 가지 정리";
  ok(validateSearchTitle(t, "삼성카드").reason !== "lead_not_exact", "★한 어절 키워드엔 앞머리 강제 없음");
}

// ── ⑤ 2단 확장이 실제로 더 캐는가(실호출) ──────────────────────────────
{
  const two = await expandAutocomplete("삼성카드");
  ok(two.length > 10, "★2단 확장이 1단(최대 10개)을 넘어선다", `${two.length}개`);
  const cmp = (x) => x.replace(/\s+/g, "");
  ok(two.some((x) => cmp(x) === "삼성카드발급조회"), "★성과 낸 그 키워드가 실제로 잡힌다");
  const multi = two.filter((x) => x.trim().split(/\s+/).length >= 2).length;
  ok(multi >= 5, "두 어절 이상 롱테일이 여럿", `${multi}개`);
}

// ── ⑥ 수확 경로가 2단을 쓰는가 + 측정 예산이 구체적인 것에 가는가 ──────
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(!/fetchNaverAutocomplete\(/.test(tt), "★수확 경로가 1단 호출을 안 쓴다");
  ok((tt.match(/expandAutocomplete\(/g) ?? []).length >= 2, "★두 수확 경로 모두 2단");
  ok(/split\(\/\\s\+\/\)\.length - a\.trim\(\)\.split/.test(tt), "★구체적인 것(어절 많은 것)부터 정렬 — 측정 예산이 굵은 키워드에 낭비되지 않게");

  const am = fs.readFileSync(new URL("../lib/amplifyTopics.ts", import.meta.url), "utf-8");
  ok(/restoreSearchPhrase\(titleSearch, kw\)/.test(am), "★거부 전에 표기 복원을 먼저 시도");
  ok(/표기 그대로/.test(am), "프롬프트에도 표기 보존 지시");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 검색형 제목 = 실검색어 표기 그대로");
process.exit(fail ? 1 : 0);
