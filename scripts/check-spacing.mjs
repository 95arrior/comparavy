// 여백 스케일 v2 검증 — 소제목 앞3/뒤1·문단1·긴블록3·강조2·해시태그(앞2+그룹)·캡4.
import { formatBody, buildPlainText } from "../lib/publishHtml.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};
const SP='<p style="text-align:left"><br></p>';
const esc=SP.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const gap=(html,a,b)=>{const re=new RegExp(a+`((?:${esc})*)`+b);const m=re.exec(html);return m?m[1].split("</p>").length-1:-1;};
const body="<p>문단 하나.</p><p>문단 둘.</p><h2>소제목</h2><p>답 문단.</p><p>이 문단은 아주 길어서 네 줄을 넘기도록 일부러 계속 늘려 쓴 긴 블록의 예시 문장으로 여든여덟자 이상이 되도록 만들어 둔 것입니다 확실히 길죠</p><p>짧은 문단.</p><p><b>핵심 강조 한 줄</b></p><p>마무리.</p>";
const rich=formatBody({title:"t",bodyHtml:body,hashtags:["하나","둘","셋","넷"]});
ok(gap(rich,"문단 하나\\.</p>","<p [^>]*>문단 둘")===1,"문단 사이 1");
ok(gap(rich,"문단 둘\\.</p>","<h2")===3,"소제목 앞 3");
ok(gap(rich,"</h2>","<p [^>]*>답 문단")===1,"소제목 뒤 1");
ok(gap(rich,"확실히 길죠</p>","<p [^>]*>짧은")===3,"긴 블록(4줄+) 아래 3");
ok(gap(rich,"짧은 문단\\.</p>","<p [^>]*font-size:17px")===2,"강조 문장 앞 2");
ok(!/#하나|#둘/.test(rich),"본문에 해시태그 없음(네이버 태그칸 자동 등록과 중복 방지 — 위저드 태그 단계로 이동)");
ok(!new RegExp(`(?:${esc}){5,}`).test(rich),"연속 스페이서 상한 4");
// plain 동일 여백
const plain=buildPlainText({title:"t",bodyHtml:body,hashtags:["하나","둘"]});
ok(!/#하나/.test(plain),"plain에도 해시태그 없음");
ok(/문단 둘\.\n\n\n\n소제목/.test(plain),"plain 소제목 앞 3(빈줄)");
// ★숫자 쉼표 회귀 — 4,500만 원 등이 쉼표에서 쪼개지지 않아야
const numBody="<p>지원 한도는 4,500만 원이고 수수료는 3,900원이며 자산 1,000만 원 이상이면 대상에서 제외되는데 이 조건은 소득 3.5% 기준과 2026. 7. 4. 공고 기준으로 정해졌다는 점을 꼭 확인하세요 반드시요.</p>";
const numRich=formatBody({title:"t",bodyHtml:numBody});
const numParas=[...numRich.matchAll(/<p[^>]*>([^<]*)<\/p>/g)].map(m=>m[1]).filter(t=>t.trim());
const brokenNum=numParas.filter(t=>/\d[,.]$/.test(t.trim()));
ok(brokenNum.length===0, `숫자 쉼표/소수점 분할 0 (깨진 조각 ${brokenNum.length})`);
ok(/4,500만 원/.test(numRich)&&/3,900원/.test(numRich)&&/1,000만 원/.test(numRich), "4,500·3,900·1,000 원형 보존");

console.log(fail===0?"\n통과: 여백 스케일 v2 + 숫자 회귀":"\n실패: "+fail);
process.exit(fail?1:0);
