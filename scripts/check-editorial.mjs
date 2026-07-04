// 편집력 레이어 검증 — 경험 가드·브리프 확장(빈 생략)·판단 톤.
import { hasFabricatedExperience } from "../lib/editorial.ts";
import { briefToDirective } from "../lib/amplifyTopics.ts";
import { containsBanned } from "../lib/hookPatterns.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};

console.log("① 경험 조작 가드:");
const bad=["<p>제가 직접 써보니 확실히 편했어요.</p>","<p>사용해 보니까 배터리가 오래가요.</p>","<p>직접 신청해 보니 10분이면 끝나요.</p>","<p>제품을 받아 보니 마감이 좋았습니다.</p>"];
const good=["<p>조건만 보면 1인 가구는 A가 유리해요 — 한도가 더 높거든요.</p>","<p>저라면 B부터 확인합니다. 마감이 먼저 오니까요.</p>","<p>후기들을 종합하면 소음 평가가 갈려요.</p>","<p>직접 방문 접수도 가능해요.</p>"];
for(const b of bad) ok(hasFabricatedExperience(b), `위반 검출: "${b.slice(3,20)}…"`);
for(const g of good) ok(!hasFabricatedExperience(g), `정상 통과: "${g.slice(3,20)}…"`);

console.log("\n② 브리프 확장(빈 필드 생략):");
const base={intent:"정보 정리",opening:"결론 선공개",flow:"단계별 순서",closing:"핵심 요약",tone:"친근한 조언형",reader:"직장인",hook:"훅",coreWord:"마감"};
const full=briefToDirective({...base,verdict:"오늘 6시 전 카드사 앱 신청이 결론",cutList:["전문직 특화 — 대상 좁음"],branchAxis:"가구형태: 1인→13만 / 맞벌이→+1"});
ok(/판결\(verdict\)/.test(full)&&/덜어냄\(cut\)/.test(full)&&/상황 분기/.test(full),"채우면 3블록 주입");
const empty=briefToDirective({...base,verdict:"",cutList:[],branchAxis:""});
ok(!/판결|덜어냄|상황 분기/.test(empty),"비면 3블록 전부 생략(억지 채움 없음)");

console.log("\n③ 판단 문장 톤(보장어 0):");
const verdicts=["오늘 6시 전 카드사 앱 신청이 결론","조건만 보면 1인 가구는 A가 유리해요","저라면 마감 먼저인 B부터 확인합니다"];
for(const v of verdicts) ok(!containsBanned(v)&&!hasFabricatedExperience(`<p>${v}</p>`),`"${v.slice(0,18)}…" 보장·경험 없음`);
ok(containsBanned("무조건 100% 받는 방법"),"보장어는 기존 필터가 차단");

console.log(fail===0?"\n통과: 편집력 가드·브리프 정상":"\n실패: "+fail);
process.exit(fail?1:0);
