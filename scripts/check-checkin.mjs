import { totalRevenue, avgPerPost, monthPace } from "../lib/checkin.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};
const ym=(d)=>{const n=new Date();n.setDate(n.getDate()-d);return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;};
const rows=[{day:ym(3),visitors:10,revenue:300},{day:ym(2),visitors:20,revenue:500},{day:ym(1),visitors:15,revenue:400}];
ok(totalRevenue(rows)===1200,"누적=1200");
ok(avgPerPost(rows,4)===300,"글당 평균=누적/발행수(1200/4)");
ok(avgPerPost(rows,0)===null,"발행 0이면 미표시(null)");
ok(avgPerPost([{day:ym(1),visitors:5,revenue:null}],3)===null,"수익 입력 0건이면 미표시");
const p=monthPace(rows); // 이번 달 3일 입력이면 계산(월초엔 일부가 저번 달일 수 있어 null 허용)
ok(p===null||p>0,"페이스: 실데이터 기반 양수 또는 미표시(3일 미만·월경계)");
ok(monthPace([{day:ym(1),visitors:1,revenue:100}])===null,"입력 3일 미만 → 페이스 미표시(과장 방지)");
// 소진 예측
const { depletionForecast } = await import("../lib/checkin.ts");
const mk=(n,daysAgo)=>Array.from({length:n},(_,i)=>({status:"draft",created_at:new Date(Date.now()-daysAgo*86400000-i*3600000).toISOString()}));
const f1=depletionForecast(30,10,mk(7,1)); // 3편 남음, 최근 7일 7편(1일 1편)
if(!(f1&&f1.postsLeft===3&&f1.daysLeft===3&&/요일$/.test(f1.weekday))){console.log("!! 예측 3편/3일 실패",f1);process.exit(1);}
if(depletionForecast(30,10,[])!==null){console.log("!! 페이스 없음인데 예측 생성");process.exit(1);}
if(depletionForecast(0,10,mk(7,1))!==null){console.log("!! 0크레딧 예측");process.exit(1);}
if(depletionForecast(1000,10,mk(1,1))!==null){console.log("!! 14일 초과인데 배너");process.exit(1);}
console.log("소진 예측 4케이스 OK");
console.log(fail===0?"\n통과: 체크인 계산+소진 예측":"\n실패: "+fail);
process.exit(fail?1:0);
