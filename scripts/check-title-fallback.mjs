import fs from "node:fs";

// ★2026-08-02 유저 화면 실측 — 꾸준한 수요 4장이 전부 템플릿 문장이었다:
//   "고용보험환급, 처음이라면 여기부터 보세요" / "삼성증권IRP, 모르고 넘어가면 나만 손해입니다"
//   "막상 해보면 헷갈리는 연금저축펀드가입" / "부동산컨설팅 하기 전에 놓치기 쉬운 것들"
//
//  ★두 겹의 사고였다:
//   ① max_tokens 2000에 키워드를 한 번에 다 보냈다 → 35~45개에서 JSON이 잘린다.
//      잘림 방어 코드가 '완성된 객체까지는 살린다'라 전량 폴백은 면했지만, 뒤쪽은 템플릿이 됐다.
//   ② ★그 템플릿에 fit=1·ok=true가 붙어 AI가 실제로 지은 제목과 동등하게 경쟁했다.
//      폴백은 마지막 보루여야지 후보가 되면 안 된다.
//   그리고 조용히 폴백해서 로그가 한 줄도 없었다 — 원인 추적이 안 됐다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

const tt = fs.readFileSync(new URL("../lib/topicTitles.ts", import.meta.url), "utf-8");
const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");

// ── ① 토큰 예산 ────────────────────────────────────────────────────────
ok(/max_tokens: 8000/.test(tt), "★토큰 예산 상향(2000이면 40개 언저리에서 잘린다)");
ok(!/max_tokens: 2000/.test(tt), "옛 예산이 남아 있지 않다");

// ── ② 폴백을 표시하는가 ────────────────────────────────────────────────
ok(/templated\?: boolean/.test(tt), "★TitledTopic이 폴백 여부를 들고 다닌다");
ok(/templated: true/.test(tt), "전량 폴백 경로도 표시");
ok(/return \{ title, tag, ok, fit, templated \}/.test(tt), "개별 항목도 표시");
// 키워드 누락으로 강등된 경우도 폴백이다
ok(/templateTitle\(k, i\); templated = true/.test(tt), "★키워드 누락 강등도 폴백으로 표시");

// ── ③ 조용히 폴백하지 않는가 ───────────────────────────────────────────
//  ★오늘 이 로그가 없어서 '배포 타이밍인가' 하고 두 번 헛짚었다.
ok(/응답 부족/.test(tt), "★몇 개가 템플릿이 됐는지 로그로 남긴다");
ok(/arr\.length < keywords\.length/.test(tt), "파싱 개수와 요청 개수를 대조");

// ── ④ 템플릿이 진짜 제목을 이기지 못하는가 ─────────────────────────────
{
  const sel = rt.slice(rt.indexOf("const onFit ="), rt.indexOf("if (debugMode) diag.compSplit"));
  ok(/!t\?\.templated/.test(sel), "★선택에서 폴백을 걸러낸다");
  ok(/real\.length >= PICK/.test(sel), "진짜 제목이 충분하면 템플릿은 아예 안 쓴다");
  ok(/모자라면 뒤에 붙여/.test(sel), "★모자랄 때만 빈자리를 메운다(보드 결품 방지)");
}

// ── ⑤ 폴백 문구 자체는 여전히 규칙을 지키는가(회귀) ────────────────────
{
  const tmpl = tt.slice(tt.indexOf("const TEMPLATES"), tt.indexOf("function templateTitle"));
  for (const banned of ["총정리", "이것만 알면", "전에 확인하면 좋은 것", "꼭 알아야 할 것들"])
    ok(!tmpl.includes(banned), "폴백이 금지 표현을 안 쓴다", banned);
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 제목 폴백(마지막 보루로만)");
process.exit(fail ? 1 : 0);
