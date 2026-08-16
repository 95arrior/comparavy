// 프롬프트 배선 — 실행: npx tsx scripts/check-prompt-wiring.mjs
// ★2026-08-05 실측 사고: 볼드·인용구 규칙을 워드프레스 전용 블록(GOOGLE_GUIDE_2026)에 넣었다.
//  네이버 경로는 NAVER_GUIDE를 쓰므로 그 규칙이 전혀 안 걸렸다 —
//  ★코드에는 있는데 글에는 없는 상태였고, 유저 화면으로만 드러났다.
//  이 파일은 '규칙이 실제로 모델에 전달되는가'를 문자열로 확인한다(파일에 있는지가 아니라).
import { buildSystemPrompt, buildUserPrompt } from "../lib/articlePrompt.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

const sysN = buildSystemPrompt("general");                 // 네이버(기본)
const sysW = buildSystemPrompt("general", "wordpress");    // 워드프레스
const usr = buildUserPrompt({ keyword: "테스트 키워드", title: "제목", type: "general", tone: "friendly", channel: "naver", maxWords: 4000 });

console.log("① 이미지 주문서 3종(네이버·WP 공통이어야):");
for (const k of ["[브랜드: 대상", "[표: 제목", "[인물: 누구", "출처표기"]) {
  ok(sysN.includes(k), `네이버 시스템 프롬프트에 '${k}'`);
}

console.log("\n② 본문 규칙(양 채널 공통이어야):");
{
  // ★여기가 어긋나 있었다 — WP 블록에만 있어서 네이버 글이 규칙 없이 나갔다
  for (const k of ["한 문단에 최대 1개", "인용구(blockquote)는 세 가지", "가상의 인물을 만들지 마라"]) {
    ok(sysN.includes(k), `네이버에 '${k}'`);
    ok(sysW.includes(k), `워드프레스에도 '${k}'`);
  }
  ok(sysN.includes("40~60% 지점"), "이탈 구간 이미지 집중");
  ok(sysN.includes("텍스트만 6문단 이상 이어지면 실격"), "시각 브레이크 리듬");
}

console.log("\n③ 분량(유저 프롬프트 담당):");
{
  ok(usr.includes("하드 상한 3,200자"), "하드 상한이 실린다");
  ok(usr.includes("1,600") && usr.includes("2,400"), "네이버 목표 구간이 실린다");
  ok(usr.includes("상한이 올랐다고 채우라는 뜻이 아니다"), "★'오바 금지' 단서(유저 조건)");
}

console.log("\n④ 채널 배타는 유지되는가:");
{
  // ★공통 규칙을 옮기다 채널 배타까지 무너뜨리면 안 된다 — 그건 다른 사고다
  ok(sysN.includes("═══ 네이버 블로그 모드") && !sysN.includes("═══ 구글/워드프레스 모드"), "네이버는 네이버 규격만");
  ok(sysW.includes("═══ 구글/워드프레스 모드") && !sysW.includes("═══ 네이버 블로그 모드"), "워드프레스는 WP 규격만");
}

console.log("\n⑤ 가독성 규격(2026-08-06 유저 화면):");
{
  // ★유저: "너무 검적색 일반 두께로 쭉 길게 쓰니깐 가독성이 떨어져 / 한 문단이 13줄이예요"
  //  타겟이 40~70대라 '어디가 중요한지'가 안 보이면 그냥 나간다.
  for (const k of ["강조를 반드시 넣는다(하한)", "무엇을 강조할지", "한 문장은 90자 안으로"]) {
    ok(sysN.includes(k), `네이버에 '${k}'`);
    ok(sysW.includes(k), `워드프레스에도 '${k}'`);
  }
  ok(sysN.includes("한 문장 142자 = 8줄"), "★실측 실격 예가 프롬프트에 박혀 있다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 프롬프트 배선");
process.exit(fail ? 1 : 0);
