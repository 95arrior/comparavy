// URL 정화 검증 — 실측 사고(gov.kr/portal/rcvfvrSvc) 포함, 지어낸 경로 0 보장.
import { sanitizeUrls, extractUrls } from "../lib/linkWhitelist.ts";
import { formatBody } from "../lib/publishHtml.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};

console.log("① 사전 도메인 딥 경로 → 루트 축약:");
let r=sanitizeUrls("<p>신청은 gov.kr/portal/rcvfvrSvc 에서 하세요.</p>");
ok(r.html.includes("https://www.gov.kr")&&!r.html.includes("rcvfvrSvc"),`실측 사고 케이스 → 루트 (${r.replaced}건 치환)`);
r=sanitizeUrls("<p>https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui 에서 조회</p>");
ok(r.html.includes("https://hometax.go.kr")&&!r.html.includes("websquare"),"홈택스 딥 경로 → 루트");

console.log("\n② 사전 밖 도메인 → 검색 유도 치환:");
r=sanitizeUrls("<p>자세한 건 fakegov.co.kr/apply/2026 을 참고하세요.</p>");
ok(!/fakegov\.co\.kr\//.test(r.html)&&r.html.includes("공식 사이트에서 검색"),"미검증 도메인 경로 제거+검색 유도");
ok(r.fabricated.length===1,"fabricated 로그 1건");

console.log("\n③ 정상 보존:");
r=sanitizeUrls("<p>정부24에서 보조금24를 검색하세요. https://www.gov.kr 참고.</p>");
ok(r.html.includes("https://www.gov.kr")&&r.replaced===0,"화이트리스트 루트는 무치환");
r=sanitizeUrls('<p><img src="https://abc.supabase.co/storage/x.png" /></p>');
ok(r.html.includes("supabase.co/storage/x.png"),"업로드 이미지 src 보존");
r=sanitizeUrls('<p><img src="https://cdn.example.com/a.png" alt="" /></p>');
ok(r.html.includes('src="https://cdn.example.com/a.png"')&&r.replaced===0,"외부 CDN img src도 구조적 보호(마스킹)");
ok(sanitizeUrls("<p>URL 없는 보통 문단이에요.</p>").replaced===0,"URL 없으면 무변화");

console.log("\n④ 복사 게이트 소급(formatBody):");
const rich=formatBody({title:"t",bodyHtml:"<p>신청: gov.kr/portal/rcvfvrSvc 그리고 unknownsite.kr/deep/path 참고.</p>"});
ok(!/rcvfvrSvc|deep\/path/.test(rich),"기존 초안도 복사 시점 정화");
ok(extractUrls("<p>gov.kr/a nts.go.kr</p>").length===2,"extractUrls 스캔 동작");


// ★지어낸 도메인이 본문에 남지 않는다(2026-07-31 실측: 자본시장연구원 도메인을 'cmri.re.kr'로 지어내 실었다.
//  실제는 kcmi.re.kr). 종전 치환은 `${도메인} 공식 사이트에서 검색`이라 가짜 주소가 그대로 노출됐고,
//  읽는 사람은 없는 페이지를 찾아 헤맸다. 링크를 죽이는 것만으로는 부족하고 '주소 텍스트'를 지워야 한다.
console.log("\n지어낸 도메인 제거:");
{
  const cases = [
    ["뒤에 안내가 이어질 때", `<p>자본시장연구원(KCMI), cmri.re.kr 공식 사이트에서 확인하세요.</p>`],
    ["괄호 안에 있을 때", `<p>자본시장연구원 공식 사이트(cmri.re.kr)에서 볼 수 있어요.</p>`],
    ["문장 중간 http 주소", `<p>자세한 내용은 https://cmri.re.kr 에서 확인하세요.</p>`],
  ];
  for (const [label, html] of cases) {
    const r = sanitizeUrls(html);
    const txt = r.html.replace(/<[^>]+>/g, "");
    ok(!/cmri/i.test(txt), `${label} — 가짜 도메인 텍스트 제거`);
    ok(!/검색\s*공식/.test(txt), `${label} — 문구 중복·비문 없음`);
    ok(r.fabricated.length === 1, `${label} — 지어낸 주소로 기록`);
  }
  // ★서브도메인 독립 서비스가 상위 기관에 삼켜지면 안 된다(dart.fss.or.kr → fss.or.kr 오치환)
  ok(/dart\.fss\.or\.kr/.test(sanitizeUrls(`<p>dart.fss.or.kr 참고</p>`).html), "전자공시가 금감원으로 치환되지 않음");
  ok(/kdic\.or\.kr/.test(sanitizeUrls(`<p>kdic.or.kr 확인</p>`).html), "신규 등재 기관(예금보험공사) 통과");
}

console.log(fail===0?"\n통과: URL 이중 방어":"\n실패: "+fail);
process.exit(fail?1:0);
