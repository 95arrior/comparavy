// 편집력 레이어 검증 — 경험 가드·브리프 확장(빈 생략)·판단 톤·해석 게이트·금융 룰셋.
import { hasFabricatedExperience, lacksInterpretation } from "../lib/editorial.ts";
import { scanCompliance } from "../lib/complianceFilter.ts";
import { repeatsTitle } from "../lib/thumbCopyBreak.ts";
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

console.log("\n③-2 감정 과잉 어휘(2026-07-17 PTRP — 텍스트 카드에서 감정 과잉=역효과 실측):");
for(const b of ["환급액 역대급이에요","이자 미쳤다","연금 수령액 실화?","보험료 인상에 난리","레전드 절세법"]) ok(containsBanned(b),`차단: "${b}"`);
for(const g of ["그냥 두면 새는 돈","월 5천 원 차이가 나는 이유","지금 갈아타도 될까?"]) ok(!containsBanned(g),`허용(손실·숫자·질문 프레임): "${g}"`);

console.log("\n③-3 썸네일 역할 분리(2026-07-17 유저 확정 — 제목 반복=실격, 앵커는 숫자·연도만):");
const TITLE = "에이전트H란 무엇인가요? 2027년 국민 1인 1 AI 에이전트 시대 완전 정리";
const KW = "에이전트H";
for(const bad of ["에이전트H 2027년","에이전트H 모르면 손해본다","AI 에이전트 시대","에이전트H 한 번 켜보면"]) ok(repeatsTitle(bad, TITLE, KW), `제목 반복 검출: "${bad}"`);
for(const good of ["검색 끝.","내 비서가 생깁니다","이젠 시켜만 하세요","2027년, 준비되셨나요"]) ok(!repeatsTitle(good, TITLE, KW), `개념 훅 통과: "${good}"`);

console.log("\n④ 해석 문단 게이트(2026-07-17 — 정보 나열체는 AI 요약 종결형):");
const newsOnly="<p>ISA 납입 한도가 연 2천만 원으로 정해져 있습니다.</p><p>비과세 한도는 일반형 200만 원입니다.</p><p>가입 기간은 3년 이상입니다.</p><p>금융위원회가 개정안을 발표했습니다.</p>";
const withInterp="<p>ISA 납입 한도가 연 2천만 원입니다.</p><p>맞벌이라면 부부 각자 계좌로 한도가 두 배가 된다는 뜻이라, 내 경우 어느 쪽 소득에 몰지가 달라져요.</p><p>서민형 요건에 해당된다면 비과세가 400만 원까지 늘어나 체감 차이가 커요.</p><p>3년을 못 채우고 깨면 혜택을 놓치면 손해예요.</p>";
ok(lacksInterpretation(newsOnly),"제도 나열만 있는 글 검출");
ok(!lacksInterpretation(withInterp),"해석 짝 있는 글 통과");

console.log("\n⑤ 금융 룰셋(online — 투자권유 오인):");
const fin=(t)=>scanCompliance(t,"online");
ok(fin("이 상품은 원금이 보장됩니다.").some(v=>v.type==="결과보장"&&v.severity==="high"),"원금 보장 검출(high)");
ok(fin("연 10% 확정 수익을 노려보세요.").some(v=>v.type==="결과보장"),"확정 수익 검출");
ok(fin("늦기 전에 무조건 가입하세요.").some(v=>v.type==="권유단정"&&v.severity==="high"),"무조건 가입 검출(high)");
ok(fin("ISA에 가입하세요.").some(v=>v.type==="권유단정"&&v.severity==="medium"),"명령형 가입 권유 검출(medium)");
ok(fin("이런 조건이면 유리한 편이에요. 본인 상황 확인 후 판단해 보세요.").length===0,"완화 화법 통과");
ok(fin("원금 손실 가능성이 있는 상품이에요.").every(v=>v.type!=="결과보장"),"손실 고지 문장 오탐 없음");

console.log(fail===0?"\n통과: 편집력 가드·브리프 정상":"\n실패: "+fail);
process.exit(fail?1:0);
