// 홈 상단 상태 모델 v2 — 시나리오 (a)~(d) 검증.
import { courseInfo, progressPercent, pickNextTopic, todayKeywords, findTodayDraftByKeyword } from "../lib/course.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};
const now=new Date(); const today=now.toISOString();

console.log("(a) 생성만 하고 이탈 → 미완료 + draft 카드:");
let info=courseInfo([{status:"draft",created_at:today,keyword:"고유가 지원금"}]);
ok(!info.publishedToday&&info.hasDraftToday,"publishedToday=false, hasDraftToday=true(쓰다 만 글 카드)");
ok(progressPercent(info)===0,`링 진행 0%(day1 미발행 — 오늘 몫 미채움, 실제 ${progressPercent(info)}%)`);

console.log("\n(b) 발행했어요 → 완료 + 진행 반영:");
info=courseInfo([{status:"published",created_at:today,keyword:"고유가 지원금"}]);
ok(info.publishedToday,"publishedToday=true(완료 카피+다음 글감)");
ok(progressPercent(info)===5,`링 진행 5%(발행해야 오늘 몫, 실제 ${progressPercent(info)}%)`);

console.log("\n(c) 한 편 더 → 다른 글감:");
const topics=[{keyword:"고유가 지원금"},{keyword:"육아휴직 조건"},{keyword:"은행금리비교"}];
const used=todayKeywords([{status:"published",created_at:today,keyword:"고유가 지원금"}]);
const next=pickNextTopic(topics,used);
ok(next?.keyword==="육아휴직 조건","오늘 발행분 제외 다음 글감(트렌드 우선 순서)");
ok(pickNextTopic(topics,["고유가 지원금","육아휴직 조건","은행금리비교"])===null,"전부 소진 시 null(재생성 강제 안 함)");

console.log("\n(d) 같은 글감 재클릭 → draft 재진입(이중 차감 없음):");
const arts=[{status:"draft",created_at:today,keyword:"육아휴직 조건"}];
ok(findTodayDraftByKeyword(arts,"육아휴직 조건")!==null,"같은 글감 오늘 draft → 재진입 객체 반환(생성 경로 차단)");
ok(findTodayDraftByKeyword(arts,"육아 휴직 조건")!==null,"공백 차이도 같은 글감으로 인식");
ok(findTodayDraftByKeyword(arts,"은행금리비교")===null,"다른 글감은 정상 생성 경로");
ok(findTodayDraftByKeyword([{status:"published",created_at:today,keyword:"육아휴직 조건"}],"육아휴직 조건")===null,"published는 재진입 대상 아님(draft만)");

console.log(fail===0?"\n통과: 상태 모델 v2 4시나리오":"\n실패: "+fail);
process.exit(fail?1:0);
