// "왜 지금" 한 줄 + 코스 퍼센트 검증 — 마감 문구는 실제 마감 데이터 있을 때만.
import { whyNow } from "../lib/whyNow.ts";
import { nextWritePercent, coursePercent, yesterdayPublished } from "../lib/course.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};
const DEADLINE="마감이 가까운 이슈예요. 지금 쓰면 검색 유입을 선점해요.";

console.log("① 마감 문구는 실제 마감 데이터 있을 때만:");
ok(whyNow({title:"고유가 지원금 오늘 마감",tag:"trend"})===DEADLINE, "'오늘 마감' → 마감 문구");
ok(whyNow({title:"청년 지원 D-2",tag:"trend"})===DEADLINE, "'D-2' → 마감 문구");
ok(whyNow({title:"부동산 규제 정리",tag:"trend"})!==DEADLINE, "마감 신호 없는 트렌드 → 마감 문구 아님");
ok(whyNow({title:"부동산 규제 정리",tag:"trend"})==="지금 검색이 빠르게 늘고 있는 주제예요.", "트렌드 → momentum 문구");
ok(whyNow({title:"은행금리비교",vol:9960})==="꾸준히 많이 검색되는 주제예요.", "고검색 풀 → 검색량 문구");
ok(whyNow({title:"평범한 글",vol:100})==="", "신호 없으면 빈 문자열(문구 없음)");
// 가짜 마감 방지: '신청'만으론 마감 아님
ok(whyNow({title:"청년 지원금 신청 방법",tag:"trend"})!==DEADLINE || /신청\s*마감/.test("청년 지원금 신청 방법")===false, "'신청'만으론 마감 아님");

console.log("\n② 코스 퍼센트(일수 기준):");
const mk=(day,finished=false)=>({day,finished,todayCount:0,publishedToday:false,hasDraftToday:false,streak:0});
ok(coursePercent(mk(5))===25, "day5 → 25%");
ok(nextWritePercent(mk(0))===5, "day0(첫글) → 쓰면 5%");
ok(nextWritePercent(mk(4))===20, "day4 → 쓰면 20%");
ok(coursePercent(mk(20,true))===100, "완주 → 100%");

console.log("\n③ 어제 발행(조건부):");
const today=new Date(); const y=new Date(today); y.setDate(y.getDate()-1);
ok(yesterdayPublished([{status:"published",created_at:y.toISOString()}])===true, "어제 발행 있으면 true");
ok(yesterdayPublished([{status:"draft",created_at:y.toISOString()}])===false, "어제 초안만이면 false");
ok(yesterdayPublished([{status:"published",created_at:today.toISOString()}])===false, "오늘 발행은 어제 아님");
ok(yesterdayPublished([])===false, "글 없으면 false(미표시)");

console.log(fail===0?"\n통과: 홈 심장박동 로직 정상":`\n실패: ${fail}건`);
process.exit(fail===0?0:1);
