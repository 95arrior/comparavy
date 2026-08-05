// 정부 보도자료 수확 검증 — 실행: npx tsx scripts/check-gov-press.mjs
// ★설계 근거(6/27·8/4 전수 조사): 상위 유입의 절반 이상이 '날짜가 미리 적혀 있던 것'이었다.
//  고정 캘린더는 손으로 넣은 것만 있다 — 보도자료는 '새 마감일'을 매일 물어온다.
// ★실측(2026-08-05): 국세청 "8.31.(월)까지 법인세 중간예납 신고·납부 하세요" (8/4 공표 = T-27일 선점 창)
// ★실측: 부처 RSS는 전멸 — korea.kr/rss/*.xml 404, /etc/rss.do는 메인 리다이렉트, 개별 부처도 404/빈 껍데기.
//  그래서 정책브리핑 목록 HTML을 판다. 구조가 바뀌면 깨지므로 실패는 반드시 로그로 남긴다.
import fs from "node:fs";
import { pressKeywordOf, extractDeadline, pressBrief } from "../lib/govPress.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 공문 말투 → 검색어(합성 금지: 제목에 있는 말만 쓴다):");
{
  // ★실물 — 이게 이 원천의 존재 이유다
  const a = pressKeywordOf("8.31.(월)까지 법인세 중간예납 신고&middot;납부 하세요");
  ok(a?.keyword === "법인세 중간예납", `★국세청 실물: ${a?.keyword}`);
  // ★실호출에서 잡은 결함: 닻 어절의 조사가 안 떨어지고 부사가 붙었다("주택공급은 전혀")
  const b = pressKeywordOf("[설명] 용산어린이정원 내 주택공급은 전혀 확정된 바 없습니다.");
  ok(b?.keyword === "용산어린이정원 주택공급", `★닻의 조사를 털고 부사에서 끊는다: ${b?.keyword}`);
  const c = pressKeywordOf("2026년 근로장려금 정기신청 9.30.까지 접수합니다");
  ok(c?.keyword === "근로장려금 정기신청", `★장려금: ${c?.keyword}`);
  // 돈이 안 걸린 건 아예 안 뽑는다
  ok(pressKeywordOf("폴리텍대학, 역대 최대 규모 '교수 120명' 초빙") === null, "돈 신호가 없으면 글감이 아니다");
  ok(pressKeywordOf("제1차 한-싱가포르 과학기술공동위원회 개최") === null, "행사·외교는 우리 소재가 아니다");
}

console.log("\n② 마감일 — 이게 선점 창을 여는 열쇠다:");
{
  ok(extractDeadline("8.31.(월)까지 법인세 중간예납", 2026, 8) === "2026-08-31", "★'까지'가 붙은 날짜를 마감으로 읽는다");
  ok(extractDeadline("9.30.까지 접수합니다", 2026, 8) === "2026-09-30", "월이 넘어가도 읽는다");
  // ★행사일을 마감으로 오인하면 안 된다 — '까지'가 없으면 마감이 아니다
  ok(extractDeadline("8.20. 설명회 개최", 2026, 8) === null, "★'까지'가 없으면 마감이 아니다(행사일)");
  // 12월 배포 → 1월 마감은 내년
  ok(extractDeadline("1.31.까지 신고", 2026, 12) === "2027-01-31", "★해를 넘기는 마감을 내년으로 읽는다");
}

console.log("\n③ 브리프 — 보도자료는 1차 자료다(커뮤니티와 다른 점):");
{
  const d = pressBrief({ keyword: "법인세 중간예납", ministry: "국세청", date: "2026-08-04", deadline: "2026-08-31", isClarification: false, rawTitle: "8.31.까지 법인세 중간예납", docUrl: "https://x" });
  ok(/1차 자료다/.test(d), "★부처 원문임을 명시(뉴스 인용이 아니다)");
  ok(/마감일이 2026-08-31이다/.test(d), "★마감일을 브리프에 박는다");
  ok(/그날 쓰면 늦는다/.test(d), "★임무가 '미리 색인'임을 못 박는다");
  ok(/공문 말투는 아무도 안 읽는다/.test(d), "★보도자료 문장 베끼기 금지");
  ok(/지어내지 마라/.test(d), "★원문에 없는 금액·기간 지어내기 금지");
  ok(/투자 판단을 부추기는 서술 금지/.test(d), "투자권유 선 유지");

  const e = pressBrief({ keyword: "용산어린이정원 주택공급", ministry: "국토교통부", date: "2026-08-04", deadline: null, isClarification: true, rawTitle: "[설명] …확정된 바 없습니다", docUrl: "https://x" });
  ok(/소문이 실제로 돌고 있다는 뜻/.test(e), "★해명 자료 = 지금 그 소문이 도는 중이라는 신호");
  ok(/무엇이 확정이고 무엇이 아직 아닌지/.test(e), "★해명 건은 '갈라주기'가 글의 값이다");
}

console.log("\n④ 수확 규칙:");
{
  const src = fs.readFileSync(new URL("../lib/govPress.ts", import.meta.url), "utf-8");
  ok(/if \(!raws\.length\) throw new Error\("GOVPRESS_PARSE_EMPTY"\)/.test(src), "★파싱이 0이면 던진다(HTML 구조 변경을 조용히 넘기지 않는다)");
  ok(/maxAgeDays \?\? 3/.test(src), "오래된 보도자료는 이미 뒷북");
  ok(/재정경제부/.test(src) && /산업통상부/.test(src), "★2026년 부처명 기준(기재부→재정경제부, 산자부→산업통상부)");
  ok(/fetchNaverAutocomplete/.test(src) && /verified: true/.test(src), "★자동완성으로 진짜 검색어인지 확정");
  ok(/\(c\.deadline \? done : spare\)\.push\(c\)/.test(src), "★마감이 박힌 건은 자동완성이 없어도 살린다(마감이 다가오면 그때 검색이 생긴다)");
  ok(/부처 RSS는 전멸이다/.test(src), "★RSS 전멸 실측이 코드에 기록돼 있다(다음에 또 시도하지 않게)");
}

console.log("\n⑤ 배선:");
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/harvestGovPress\(\)/.test(tt), "★수확 파이프가 부른다");
  ok(/source: "gov"/.test(tt) && /\| "gov"/.test(tt), "★gov 원천으로 들어간다(자기 칸을 갖는다)");
  ok(/\[gov-press\] 수집 실패/.test(tt), "★원천이 죽으면 로그에 남는다");
  ok(/expires_at: g\.deadline \?/.test(tt), "★마감일이 글감의 수명이다(마감 지난 글감이 보드에 남으면 안 된다)");

  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok(/gov: "정부발표"/.test(rt), "★서버 칸 이름");
  const home = fs.readFileSync(new URL("../components/dashboard/Home.tsx", import.meta.url), "utf-8");
  ok(/"정부발표"/.test(home), "★화면에 정부발표 칸이 있다");
  // ★유저 요구의 핵심: 빈 칸이 보여야 '이슈가 없구나' 또는 '우리가 놓쳤구나'를 알 수 있다
  // ★SLOT_LABEL 블록만 본다 — 파일 전체를 훑으면 상관없는 문구까지 칸으로 오인한다
  const block = /const SLOT_LABEL[^=]*=\s*\{([\s\S]*?)\};/.exec(rt)?.[1] ?? "";
  const labels = [...block.matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]);
  ok(labels.length >= 10, `서버 칸 ${labels.length}개를 읽었다`);
  const missing = labels.filter((l) => !home.includes(`"${l}"`));
  ok(missing.length === 0, `★화면 칸이 서버 칸을 다 덮는다(빠지면 '없다'조차 안 보인다). 누락: ${missing.join(", ") || "없음"}`);
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 정부 보도자료 수확");
process.exit(fail ? 1 : 0);
