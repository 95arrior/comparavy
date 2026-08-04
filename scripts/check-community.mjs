// 커뮤니티 수확 검증 — 실행: npx tsx scripts/check-community.mjs
// ★설계 근거(6/27·8/4 전수 조사): 케이뱅크 황금캡슐(초대 링크 바이럴)·삼성 온누리상품권의
//  1차 확산지가 커뮤니티였다. 뉴스는 그 뒤였고, 자동완성은 더 뒤였다.
// ★유저 제안은 X(트위터)였으나 한국 생활·경제 이슈는 커뮤니티가 먼저다.
//  게다가 X는 API 유료·스크래핑 차단인데 뽐뿌 RSS는 공개·무료다.
// ★실호출 확인(2026-08-05): rss.php?id=coupon → "[카카오뱅크] AI 퀴즈", "[페이북] 260805 1등뽑기"
import fs from "node:fs";
import { parseCommunityTitle, communityBrief } from "../lib/communityBuzz.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 제목에서 원어 키워드를 뽑는가(합성 금지 원칙):");
{
  const a = parseCommunityTitle("[카카오뱅크] AI 퀴즈");
  ok(a?.brand === "카카오뱅크" && a?.keyword === "카카오뱅크 AI 퀴즈", `실물 파싱: ${a?.keyword}`);
  const b = parseCommunityTitle("[페이북] 260805 1등뽑기");
  ok(b?.keyword === "페이북 1등뽑기", `★날짜 코드를 뺀다(검색어에 안 들어가는 말): ${b?.keyword}`);
  const c = parseCommunityTitle("[삼성전자] 온누리상품권 20% 페이백");
  ok(c?.keyword === "삼성전자 온누리상품권 20% 페이백", `브랜드+이벤트 원어: ${c?.keyword}`);
  ok(parseCommunityTitle("그냥 제목입니다") === null, "대괄호 형식이 아니면 안 쓴다");
  ok(parseCommunityTitle("[a]") === null, "내용이 없으면 안 쓴다");
}

console.log("\n② 걸러야 하는 것(규칙 재현):");
{
  const MONEY = /(포인트|캐시백|적립|상품권|페이백|환급|지원금|바우처|무료|적금|예금|금리|카드|페이|증정|지급|할인쿠폰|이벤트)/;
  const CONSUME = /(퀴즈|정답|룰렛|출석|뽑기|응모|추첨|1등|덧글|댓글이벤트)/;
  const DEAL = /(\d{1,3},\d{3}\s*원|\d+만\s?원대|무배|무료배송|최저가|특가|\(\s*\d[\d,]*\s*\/)/;

  ok(MONEY.test("[삼성전자] 온누리상품권 페이백"), "돈 신호가 있으면 후보");
  ok(!MONEY.test("[공지] 서버 점검 안내"), "돈이 안 걸린 글은 제외");
  // ★유저 지적에서 배운 것: 정답만 보고 3초에 나가는 검색은 체류 0 = 퀵백 감점
  ok(CONSUME.test("[카카오뱅크] AI 퀴즈"), "★퀴즈·정답류는 제외(체류 0 — 관심도가 높아도 우리가 먹을 게 없다)");
  ok(CONSUME.test("[페이북] 1등뽑기"), "★뽑기류도 제외");
  ok(!CONSUME.test("[케이뱅크] 포인트 소멸 안내"), "정보성은 통과");
  // 제품 특가는 쇼핑 블로그의 소재지 우리 것이 아니다
  ok(DEAL.test("[롯데온] 헤어클리닉 3종세트 (49,900원/무배)"), "★제품 특가 제외");
  ok(!DEAL.test("[케이뱅크] 포인트 소멸 안내"), "특가 패턴이 없으면 통과");
}

console.log("\n③ 시간 창 — 뒷북을 구조로 막는가:");
{
  const src = fs.readFileSync(new URL("../lib/communityBuzz.ts", import.meta.url), "utf-8");
  ok(/minutesAgo > windowMin\) continue/.test(src), "★창 밖은 아예 안 본다");
  ok(/harvestCommunity\(windowMin = 240/.test(src), "기본 창 = 수확 간격(4시간)");
  ok(/창을 크론보다 좁게 잡으면 그 사이에 올라온 것을 구조적으로 못 본다/.test(src), "★유저의 60분 지시와 크론 주기의 관계가 적혀 있다");
  ok(/sort\(\(a, b\) => a\.minutesAgo - b\.minutesAgo\)/.test(src), "최신 우선");
}

console.log("\n④ 브리프 — 커뮤니티 글은 신호지 근거가 아니다:");
{
  const b = communityBrief({ keyword: "케이뱅크 포인트", brand: "케이뱅크", board: "쿠폰·이벤트", title: "t", postedAt: "", minutesAgo: 12 });
  ok(/12분 전에 올라온 소식/.test(b), "언제 올라온 글인지 명시");
  ok(/지어내지 마라/.test(b), "★확인 안 된 금액·조건 지어내기 금지");
  ok(/시작 신호일 뿐 근거가 아니다/.test(b), "★커뮤니티 글의 지위를 못 박는다");
  ok(/이미 끝났을 수 있다/.test(b), "★종료 여부 확인 의무(어제 '7월 공고' 교훈)");
}

console.log("\n⑤ 배선:");
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/harvestCommunity\(\)/.test(tt), "★수확 파이프에 배선됐다");
  ok(/source: "rising"/.test(tt), "실시간 종족으로 들어간다");
  ok(/\[community\] 수집 실패/.test(tt), "★원천이 죽으면 로그에 남는다(조용한 0 금지)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 커뮤니티 수확");
process.exit(fail ? 1 : 0);
