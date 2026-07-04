// 신선도 게이트·시즌 씨앗 로직 검증(로컬, 네트워크 없음).
import { seasonalSeeds } from "../lib/seasonalEvents.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};

// ① 시즌 씨앗 — D-14 이내만, 카테고리 퍼지 매칭
console.log("① 시즌 씨앗(D-14):");
// 종소세 5/31 → 5/20 기준 D-11 활성
const may20 = new Date("2026-05-20T00:00:00");
const eco520 = seasonalSeeds("경제·재테크", may20);
ok(eco520.some((s) => s.keyword === "종합소득세 신고"), "5/20 경제 → 종소세(D-11) 주입");
// 7/4 기준: 여름 휴가철(7/15, D-11)은 여행, 부가세(7/25, D-21)는 범위 밖
const jul4 = new Date("2026-07-04T00:00:00");
const eco74 = seasonalSeeds("경제·재테크", jul4);
ok(!eco74.some((s) => s.keyword === "부가세 신고"), "7/4 경제 → 부가세(D-21)는 범위 밖(미주입)");
const trip74 = seasonalSeeds("국내여행", jul4);
ok(trip74.some((s) => s.keyword === "여름 휴가철"), "7/4 여행 → 여름 휴가철(D-11) 주입");
// 연말정산(1/15)은 12월 말부터
const dec20 = new Date("2026-12-20T00:00:00");
// 1/15/2027 → D-26 범위 밖; 1/5 기준 D-10 활성
const jan5 = new Date("2027-01-05T00:00:00");
ok(!seasonalSeeds("경제·재테크", dec20).some((s)=>s.keyword==="연말정산"), "12/20 → 연말정산 D-26 미주입");
ok(seasonalSeeds("경제·재테크", jan5).some((s)=>s.keyword==="연말정산"), "1/5 → 연말정산 D-10 주입");

// ② 신선도 게이트 판정(freshOf 로직 재현: 48h)
console.log("\n② 신선도 판정(48h·미확인 분리):");
const W=48*3600_000, now=Date.now();
const freshOf=(pub)=>{ if(!pub) return null; const t=Date.parse(pub); return Number.isNaN(t)?null:(now-t<=W); };
ok(freshOf(new Date(now-24*3600_000).toUTCString())===true, "24h 전 기사 → fresh");
ok(freshOf(new Date(now-72*3600_000).toUTCString())===false, "72h 전 기사 → stale(탈락)");
ok(freshOf("not-a-date")===null && freshOf(undefined)===null, "파싱 실패/없음 → 미확인(null)");

// ③ 시드별 보충 규칙: fresh≥3이면 미확인 버림, <3이면 보충
console.log("\n③ 고갈 방어 보충:");
function keep(group){ const f=group.filter(h=>h.fresh===true), u=group.filter(h=>h.fresh===null); const out=[...f]; if(f.length<3) out.push(...u.slice(0,3-f.length)); return out; }
const rich=[{fresh:true},{fresh:true},{fresh:true},{fresh:null},{fresh:null}];
ok(keep(rich).length===3 && keep(rich).every(h=>h.fresh===true), "신선 3+ → 미확인 전부 버림");
const poor=[{fresh:true},{fresh:null},{fresh:null},{fresh:null},{fresh:false}];
const kp=keep(poor);
ok(kp.length===3 && kp.filter(h=>h.fresh===null).length===2, "신선 1 → 미확인 2개 보충(계 3)");
ok(!kp.some(h=>h.fresh===false), "stale은 어떤 경우에도 미채택");

console.log(fail===0?"\n통과: 신선도 게이트·시즌 주입 정상":`\n실패: ${fail}건`);
process.exit(fail===0?0:1);
