// 개정안 항목 4·5 검증(로컬).
import { buildUserPrompt } from "../lib/articlePrompt.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};

// 항목5: 근거 한 줄 — sourceHint 있을 때만 주입
console.log("항목5 근거 한 줄(조건부):");
const inp={keyword:"고유가 지원금",angle:"제목",type:"info",tone:"friendly",maxWords:1500,vertical:"online"};
const withSrc=buildUserPrompt({...inp, sourceHint:"행정안전부 발표"});
const noSrc=buildUserPrompt({...inp});
ok(/근거 한 줄/.test(withSrc)&&/행정안전부 발표/.test(withSrc), "출처 있으면 근거 지침 주입");
ok(!/근거 한 줄/.test(noSrc), "출처 없으면 근거 지침 없음(지어내기 방지)");

// 항목4: 섹션 밀도 — h2 구간마다 시각요소(사진/카드/ul) ≥1
console.log("\n항목4 섹션 시각 밀도:");
function sectionDensity(html){
  const parts = html.split(/<h2[^>]*>/i).slice(1); // 각 섹션
  return parts.map(sec=>({ hasVisual: /\[사진:|<ul|<p>[^<]{1,22}[:：]\s*\S/i.test(sec) })); // 슬롯 또는 데이터 줄(라벨:값)
}
const good="<h2>대상</h2><p>가.</p><p>대상: 전 국민 70%</p><h2>방법</h2><p>나.</p><ul><li>x</li></ul>";
const bad="<h2>대상</h2><p>가.</p><p>나.</p><h2>방법</h2><p>다.</p>";
ok(sectionDensity(good).every(s=>s.hasVisual), "각 섹션 시각요소 있으면 통과");
ok(sectionDensity(bad).some(s=>!s.hasVisual), "시각요소 없는 섹션 탐지");

console.log(fail===0?"\n통과: 항목 4·5 구조 정상":`\n실패: ${fail}건`);
process.exit(fail===0?0:1);
