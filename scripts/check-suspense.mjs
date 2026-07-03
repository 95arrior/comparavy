// 서스펜스 개행 검증 — 마킹 여백 변환·상한 3·안전망 압축 예외.
//   npx tsx scripts/check-suspense.mjs
import { formatBody, buildPlainText, applySuspenseBreaks, countSuspenseMarks } from "../lib/publishHtml.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};

// 5개 마킹 → 첫 3만 여백(spacer), 나머지 드롭
console.log("① 상한 3 + 초과 드롭:");
const body5 = "<p>질문 하나?</p><p>[간격]</p><p>답 하나.</p><p>[간격]</p><p>둘.</p><p>[간격]</p><p>셋.</p><p>[간격]</p><p>넷.</p><p>[간격]</p><p>다섯.</p>";
ok(countSuspenseMarks(body5)===5, "원본 마킹 5개");
const rich = formatBody({title:"t", bodyHtml: body5});
const spacers = (rich.match(/<p style="text-align:left"><br><\/p><p style="text-align:left"><br><\/p>/g)??[]).length;
ok(spacers===3, `여백 spacer 3개만 (실제 ${spacers})`);
ok(!/\[간격\]/.test(rich), "발행본에 [간격] 토큰 잔존 0");

// 안전망: 마킹은 살고, 비마킹 과잉 빈줄은 압축
console.log("\n② 안전망 압축 예외(plain):");
const plainBody = "<p>질문?</p><p>[간격]</p><p>답이에요.</p><p>일반 서술 1.</p><p></p><p></p><p></p><p>일반 서술 2.</p>";
const plain = buildPlainText({title:"t", bodyHtml: plainBody});
// 마킹 여백: '질문?' 다음에 빈 줄 2칸(=\n\n\n 이상) 있어야
const hasSuspenseGap = /질문\?\n\n\n/.test(plain);
ok(hasSuspenseGap, "마킹된 서스펜스 개행은 여백 유지");
// 비마킹 3연속 빈 문단은 압축(일반서술1 다음 과잉 빈줄이 2줄 이하로)
const between = plain.split("일반 서술 1.")[1]?.split("일반 서술 2.")[0] ?? "";
ok((between.match(/\n/g)??[]).length <= 3, `비마킹 과잉 빈줄 압축됨 (개행 ${(between.match(/\n/g)??[]).length})`);
ok(!/\[간격\]/.test(plain), "plain에 [간격] 잔존 0");

// 마킹 없는 글은 여백 안 생김
console.log("\n③ 마킹 없으면 여백 없음:");
const noMark = formatBody({title:"t", bodyHtml:"<p>보통 문단.</p><p>다음 문단.</p>"});
ok(!/<br><\/p><p style="text-align:left"><br>/.test(noMark), "마킹 없는 글은 서스펜스 여백 0");

console.log(fail===0?"\n통과: 서스펜스 개행 구조 정상":`\n실패: ${fail}건`);
process.exit(fail===0?0:1);
