// 기업 액션 공시 수확 — 실행: npx tsx scripts/check-corp-action.mjs
// ★2026-08-06 유저가 8/5 인기유입검색어 실물을 줬고, 거기서 두 가지 결함이 드러났다.
import fs from "node:fs";
let fail = 0;
const ok = (c, m, extra = "") => { if (!c) { fail++; console.log(`  !! ${m} ${extra}`); } else console.log(`  OK ${m} ${extra}`); };
const src = fs.readFileSync(new URL("../lib/dartCorpAction.ts", import.meta.url), "utf-8");

console.log("① 목록을 끝까지 읽는가:");
{
  // ★실측(2026-08-06): 8/1~8/5 J유형은 162건 2쪽인데 우리는 1쪽만 읽어 62건(38%)을 못 봤다.
  //  목록 API의 한 쪽은 조용히 잘린다 — total_page를 안 보면 빠진 걸 알 방법이 없다.
  ok(/page_no=\$\{page\}/.test(src), "★쪽 번호를 넘긴다");
  ok(/total_page/.test(src), "★마지막 쪽까지 읽는다");
  ok(/62건\(38%\)을 통째로 못 봤다/.test(src), "왜 고쳤는지가 코드에 남아 있다");
}

console.log("\n② 권리락을 잡는가(검색이 실제로 터지는 시점):");
{
  // ★8/5 유입 1위권 '알테오젠 ▲51'의 신호탄은 7/16 결정 공시가 아니라 8/4 권리락 공시다.
  //  결정 공시는 19일 전이라 그때 쓴 글은 이미 묻혔다.
  //  ★유저 관찰: "글 발행했던 사람들 보니깐 어제가 아닌 그 전날에 한 사람도 있어."
  //   전날 발행이 가능한 이유가 바로 권리락 공시가 실시 하루 전에 뜨기 때문이다.
  ok(/fetchAll\("I"/.test(src), "★I유형(거래소 수시공시)을 다시 본다");
  ok(/권리락/.test(src), "권리락 공시를 고른다");
  ok(/rank: -1/.test(src), "★권리락이 결정 공시보다 앞 순위");
  ok(/2 \* 86400_000/.test(src), "★권리락 창은 짧다(당일·전일 공시)");
  ok(/그때 권리락까지 같이 버려졌다/.test(src), "★왜 한 번 버렸다가 되살렸는지가 적혀 있다");
  ok(/투자 판단을 부추기는 서술 금지/.test(src), "★투자 권유는 여전히 막는다(3원칙)");
  ok(/절대 지어내지 마라/.test(src), "★확인 못 한 날짜는 지어내지 않는다");
}

console.log("\n③ 실호출 — 8/5 아침에 돌렸다면 무엇이 나왔나:");
if (!process.env.DART_API_KEY) {
  try {
    for (const l of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf-8").split("\n")) {
      const m = /^([A-Z_0-9]+)=(.*)$/.exec(l.trim());
      if (m && m[2]) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
    }
  } catch { /* 키 없으면 아래에서 건너뛴다 */ }
}
if (!process.env.DART_API_KEY) {
  console.log("  (DART_API_KEY 없음 — 실호출 검사 건너뜀)");
} else {
  const { fetchCorpActionSeeds } = await import("../lib/dartCorpAction.ts");
  const seeds = await fetchCorpActionSeeds({ now: new Date("2026-08-05T09:00:00+09:00") });
  const kws = seeds.map((s) => s.keyword);
  console.log("  씨앗:", kws.join(" · "));
  // ★유저 화면(8/5 비즈니스·경제 인기유입검색어)에 '알테오젠'이 ▲51로 있었다. 이게 정답지다.
  ok(kws.some((k) => /알테오젠/.test(k)), "★8/5 유입 1위권 '알테오젠'을 그날 아침에 잡는다");
  ok(seeds[0] && /권리락/.test(seeds[0].action), "★권리락이 맨 앞", seeds[0]?.keyword ?? "");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 기업 액션 공시");
process.exit(fail ? 1 : 0);
