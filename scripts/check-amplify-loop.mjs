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

// ── ★JSON 파싱 실패로 증식이 통째로 0장이던 것(2026-08-04 유저 진단으로 검거) ──
//  amp-funnel 실측: "중단: 예외 — Expected ',' or '}' after property value at position 1018"
//  흐름: 씨앗 22 → 요청 5 → 브리프 0 → 모델 반환 0 → 카드 0.
//  ★원인 둘: ① max_tokens 1100 고정이라 출력이 잘렸다(항목당 250~320토큰인데 5개면 넘는다)
//            ② 배열을 통째로 파싱해서 마지막 하나가 잘리면 앞의 멀쩡한 항목까지 전부 버렸다.
//  ★이게 오늘 하루 헛돈 뿌리다 — 증식이 0장이라 폴백(씨앗 원문)이 조용히 돌고 있었다.
{
  const chk = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };
  const src = fs.readFileSync(new URL("../lib/amplifyTopics.ts", import.meta.url), "utf-8");

  chk(/max_tokens: Math\.min\(8000, 600 \+ want \* 340\)/.test(src), "★토큰 상한이 요청 개수에 비례한다(1100 고정이 잘림의 원인이었다)");
  chk(/const parseLoose/.test(src), "★부분 복구 파서가 있다");
  chk(/중단: JSON 복구도 실패/.test(src), "★복구도 실패하면 그 사실을 진단에 남긴다");
  chk(/출력이 잘렸다 — 복구로/.test(src), "★잘림을 로그로 남긴다(다음에 상한을 다시 볼 근거)");

  // ★복구 파서 자체를 실물 형태로 검증 — 로직을 그대로 옮겨 확인한다(원본은 모듈 내부 함수)
  const parseLoose = (raw) => {
    try { return JSON.parse(raw); } catch { /* 항목 단위 복구 */ }
    const items = []; let depth = 0, start = -1;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"') { i++; while (i < raw.length && !(raw[i] === '"' && raw[i - 1] !== "\\")) i++; continue; }
      if (ch === "{") { if (depth === 0) start = i; depth++; }
      else if (ch === "}") { depth--; if (depth === 0 && start >= 0) { try { items.push(JSON.parse(raw.slice(start, i + 1))); } catch { /* 이 항목만 버린다 */ } start = -1; } }
    }
    return items;
  };
  const one = (i) => `{"seedIndex":${i},"keyword":"키워드${i}","titleClick":"제목 ${i}"}`;
  chk(parseLoose(`[${[1, 2, 3, 4, 5].map(one).join(",")}]`).length === 5, "정상 배열은 그대로 5개");
  chk(parseLoose(`[${[1, 2, 3, 4].map(one).join(",")},{"seedIndex":5,"keyword":"키`).length === 4, "★잘려도 앞의 4개를 살린다(종전엔 0개)");
  chk(parseLoose(`[${one(1)},{"seedIndex":2,,},${one(3)}]`).length === 2, "★중간 항목이 깨져도 나머지를 살린다");
  chk(parseLoose(`[{"seedIndex":1,"keyword":"a{b}c"}]`).length === 1, "★문자열 안 중괄호에 속지 않는다");
}

console.log(fail===0?"\n통과: 증폭 루프 코어":"\n실패: "+fail);
process.exit(fail?1:0);
