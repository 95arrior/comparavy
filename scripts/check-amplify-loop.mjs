// 수익 증폭 검증 — 성립 기준·가중 상한/하한·급등·공격 잠금.
import fs from "node:fs";
import { bumpMixWeight, isSpike, attackEligible } from "../lib/checkin.ts";
import { MIX_WEIGHT_CAP, MIX_WEIGHT_FLOOR } from "../lib/scoreWeights.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};

console.log("① 가중 학습 — 상한·하한(독점 금지·다양성 하한):");
let w={};
for(let i=0;i<20;i++) w=bumpMixWeight(w,"review"); // 20번 연속 신호
ok(w.review===MIX_WEIGHT_CAP, `20연속 상향해도 상한 ${MIX_WEIGHT_CAP} 캡(실제 ${w.review})`);
w=bumpMixWeight({info:0.2},"review");
ok(w.info===MIX_WEIGHT_FLOOR, `저장값이 바닥 밑이어도 하한 ${MIX_WEIGHT_FLOOR} 복원`);

console.log("\n② 급등 감지(유저 입력만·오탐 방지):");
const days=(vals)=>vals.map((v,i)=>({day:`d${i}`,visitors:v,revenue:null}));
ok(isSpike(100, days([20,25,30,22,28]))===true, "평균 25 → 100 = 급등");
ok(isSpike(40, days([20,25,30,22,28]))===false, "2배 미만은 조용");
ok(isSpike(100, days([20,25]))===false, "표본 3일 미만 = 판정 안 함");
ok(isSpike(25, days([5,5,5,5]))===false, "절대 최소(30) 미만은 소표본 노이즈로 무시");

console.log("\n③ 공격 모드 잠금(초보 비노출 = 조건 미달):");
ok(attackEligible(30,true,21)===true, "발행확인 30+승인+일3편 페이스 = 해제");
ok(attackEligible(29,true,21)===false, "29편 = 잠김");
ok(attackEligible(30,false,21)===false, "미승인 = 잠김");
ok(attackEligible(30,true,14)===false, "페이스 미달 = 잠김");

console.log("\n④ 시리즈 성립 기준(강제 금지 — 파서 규칙 재현):");
const parse=(sr)=>{ if(!sr||!sr.title||!Array.isArray(sr.arc)) return null; const arc=sr.arc.map(e=>({role:String(e?.role??"").trim(),angle:String(e?.angle??"").trim()})).filter(e=>e.role&&e.angle); if(arc.length<3||arc.length>4) return null; return {title:sr.title,arc}; };
ok(parse({title:"지원금 완전 정복",arc:[{role:"개요",angle:"a"},{role:"자격",angle:"b"},{role:"신청",angle:"c"}]})!==null, "3화 아크 = 시리즈 성립");
ok(parse({title:"x",arc:[{role:"개요",angle:"a"},{role:"자격",angle:"b"}]})===null, "2화 = 단발(억지 시리즈 금지)");
ok(parse(null)===null && parse({title:"x",arc:"no"})===null, "미설계 = 단발");
ok(parse({title:"x",arc:[{role:"a",angle:"1"},{role:"b",angle:"2"},{role:"c",angle:"3"},{role:"d",angle:"4"},{role:"e",angle:"5"}]})===null, "5화+ = 반려(3~4화만)");

// ── ★캐시 버전(2026-08-04 유저 실측) ───────────────────────────────────
//  증식 규칙(제목 공식·꼬리 게이트)을 바꿨는데 amp 캐시 버전을 안 올려서 옛 카드가 그대로 서빙됐다.
//  증식이 안 도니 진단(amp-funnel)도 영영 "기록 없음"이었다.
//  ★규칙을 바꾸면 캐시 버전을 같이 올린다 — 같은 날 홈판(homebet v3)에서 이미 겪은 일이다.
{
  const chk = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };
  const tr = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  const m = tr.match(/amp:v(\d+):/);
  chk(!!m, "★증식 캐시 키에 버전 자리가 있다", m ? `amp:v${m[1]}` : "없음");
  chk(!!m && Number(m[1]) >= 6, "★제목 규격 개정에 맞춰 버전이 올라갔다", m ? `v${m[1]}` : "");
}

console.log(fail===0?"\n통과: 증폭 루프 코어":"\n실패: "+fail);
process.exit(fail?1:0);
