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

console.log(fail===0?"\n통과: URL 이중 방어":"\n실패: "+fail);
process.exit(fail?1:0);
