// 서스펜스 개행 검증 — 마킹 여백 변환·상한 3·안전망 압축 예외.
//   npx tsx scripts/check-suspense.mjs
import { formatBody, buildPlainText, applySuspenseBreaks, countSuspenseMarks } from "../lib/publishHtml.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};

// 5개 마킹 → 첫 3만 여백(spacer), 나머지 드롭
console.log("① 상한 3 + 초과 드롭:");
const body5 = "<p>질문 하나?</p><p>[간격]</p><p>답 하나.</p><p>[간격]</p><p>둘.</p><p>[간격]</p><p>셋.</p><p>[간격]</p><p>넷.</p><p>[간격]</p><p>다섯.</p>";
ok(countSuspenseMarks(body5)===5, "원본 마킹 5개");
const rich = formatBody({title:"t", bodyHtml: body5});
const SPRE='(?:<p style="text-align:left"><br></p>)';
const gapAfter=(label)=>{const m=new RegExp(label+"</p>("+SPRE+"*)").exec(rich);return m?(m[1].match(/<\/p>/g)??[]).length:-1;};
ok(gapAfter("질문 하나\\?")===3, `1번째 마킹 = 서스펜스 3칸(${gapAfter("질문 하나\\?")}) — 여백 다이어트로 일반 2칸, 서스펜스=+1`);
ok(gapAfter("셋\\.")<=1, `4번째 마킹 드롭(상한3) → 일반 여백(${gapAfter("셋\\.")}칸)`);
ok(!/\[간격\]/.test(rich), "발행본에 [간격] 토큰 잔존 0");

// 안전망 v2: 압축 반전 — 상한 4 캡만. 마킹 서스펜스 유지.
console.log("\n② 여백 캡4(압축 아님) + 서스펜스(plain):");
const plainBody = "<p>질문?</p><p>[간격]</p><p>답이에요.</p><p>일반 서술 1.</p><p>일반 서술 2.</p>";
const plain = buildPlainText({title:"t", bodyHtml: plainBody});
ok(/질문\?\n\n\n/.test(plain), "마킹된 서스펜스 개행 여백 유지(2칸+)");
ok(!/\n{6,}/.test(plain), "연속 빈 줄 상한 4 캡(개행 5 이하)");
ok(!/\[간격\]/.test(plain), "plain에 [간격] 잔존 0");

// 마킹 없는 글은 여백 안 생김
console.log("\n③ 마킹 없으면 여백 없음:");
const noMark = formatBody({title:"t", bodyHtml:"<p>보통 문단.</p><p>다음 문단.</p>"});
ok(!/(?:<p style="text-align:left"><br><\/p>){3,}/.test(noMark), "마킹 없는 글은 서스펜스 여백(3칸+) 0 — 일반 2칸은 여백 다이어트 규격");

console.log(fail===0?"\n통과: 서스펜스 개행 구조 정상":`\n실패: ${fail}건`);
process.exit(fail===0?0:1);
