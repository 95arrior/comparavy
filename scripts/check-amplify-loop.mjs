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
  chk(!!m && Number(m[1]) >= 7, "★규칙이 바뀌면 버전을 올린다(실시간 우선·씨앗 키워드)", m ? `v${m[1]}` : "");
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

  // ★2026-08-04 2차(브리프 15 → 파싱 8, 전날 9 — 늘 절반): 추정치가 절반이라 조용히 잘리고 있었다.
  //  한 항목은 한글 500자 안팎(제목 2·페르소나·훅·썸네일 2·판결·컷리스트·분기축·시리즈 아크) = 550~650토큰.
  //  ★한 번에 15개를 시키지 않고 조각으로 나눠 동시에 부른다 — 조각마다 예산이 넉넉하고, 하나가 실패해도 나머지는 산다.
  chk(/const CHUNK = \d+/.test(src) && /chunks\.map\(\(c, i\) => callChunk/.test(src), "★조각으로 나눠 동시 호출한다");
  // ★실시간 씨앗이 정원 경쟁에서 지면 '지금 뜨는' 열이 뉴스 롱테일로만 찬다(2026-08-05 실측: 씨앗 4개 → 카드 0장)
  chk(/rotated0\.filter\(isLive\)/.test(src), "★실시간(rising) 씨앗을 증식 정원 맨 앞에 세운다");
  chk(/live: liveIn/.test(src), "★몇 개가 들어갔는지 진단에 남긴다(0이면 열이 롱테일로만 찬다는 뜻)");
  chk(/PER_ITEM_TOKENS = 6\d\d/.test(src), "★항목당 토큰 추정이 실측 기반(550~650)으로 올라갔다");
  chk(/max_tokens: maxTokens/.test(src) && /800 \+ chunk\.length \* PER_ITEM_TOKENS/.test(src), "★토큰 상한이 조각 크기에 비례한다");
  chk(/it\.seedIndex = offset \+/.test(src), "★조각 번호를 전체 번호로 되돌린다(안 하면 2번 조각 카드가 1번 씨앗에 붙는 혈통 사고)");
  chk(/stopReason: res\.stop_reason/.test(src) && /truncated: results\.filter/.test(src), "★잘림을 stop_reason으로 계측한다('8개만 줬다'와 '잘려서 8개'를 구분)");
  chk(/const parseLoose/.test(src), "★부분 복구 파서가 있다(마지막 방어선은 유지)");
  chk(/중단: 모델 응답 0개/.test(src), "★0개로 끝나면 그 사실과 stop_reason을 진단에 남긴다");
  chk(/★출력 잘림/.test(src), "★잘림을 로그로 남긴다(다음에 상한을 다시 볼 근거)");

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


// ★2026-08-05 유저 진단에서 잡은 3건 — 전부 '본문이 거짓말하게 만드는' 자리였다.
console.log("\n증식이 지어내는 것 차단:");
{
  const src = fs.readFileSync(new URL("../lib/amplifyTopics.ts", import.meta.url), "utf-8");
  // ① 시의성 코어 오독: "확인하면"의 '인하'가 매치돼, 최저임금 인상 기사에 '인하'를 살리라고 지시했다
  const coreOf = (t) => /(?<![가-힣])(확대|개편|신설|인상|인하|동결|마감|출시|시행|개정|폐지|신청|변경|이번|2026)/.exec(t)?.[1] ?? "";
  ok(coreOf("최저임금 월급, 지금 확인하면 되는 것") === "", "★'확인하면'에서 '인하'를 읽지 않는다");
  ok(coreOf("전기요금 인하 확정") === "인하", "진짜 인하는 잡는다");
  ok(coreOf("내년 최저임금 인상률") === "인상", "인상도 잡는다");
  ok(/\(\?<!\[가-힣\]\)/.test(src), "★한글엔 단어 경계가 없어 '앞 글자가 한글이면 단어 안'으로 본다");

  // ② 지어낸 숫자: verdict "1,000시간 기준 220만 원대 예상", branchAxis "신한→30분 / 타행→1~2일"
  ok(/자료에 없는 숫자를 넣지 마라/.test(src), "★verdict에 자료 밖 숫자 금지");
  ok(/'예상·추정·대략'을 붙여도 지어낸 숫자는 지어낸 숫자다/.test(src), "★수식어로 빠져나가지 못하게 못 박는다");
  ok(/분기의 '결과값'도 자료에 있는 것만/.test(src), "★branchAxis 결과값도 근거 있는 것만");

  // ③ 검색어가 아닌 말투: '국민행복카드 바우처 신청 방법 알려주세요'
  const SPEECH = /(알려주세요|알려줘|해주세요|해줘|주세요|인가요|일까요|할까요|되나요|있나요|맞나요|뭔가요|어때요|어떻게요)\s*$/;
  ok(SPEECH.test("국민행복카드 바우처 신청 방법 알려주세요"), "★요청 종결형을 잡는다");
  ok(!SPEECH.test("국민행복카드 바우처 신청 방법"), "멀쩡한 키워드는 통과");
  ok(/drop\.speech\+\+/.test(src) && /아무도 검색창에 '알려주세요'라고 치지 않는다/.test(src), "★버리고 이유를 남긴다");
  // ★이런 키워드는 문서 0편으로 나와 '선점 최적'처럼 보인다 — 그게 제일 위험하다
  ok(/문서 수가 0으로 나와 '선점 최적'처럼 보이는데/.test(src), "★왜 위험한지가 코드에 적혀 있다");
}

console.log(fail===0?"\n통과: 증폭 루프 코어":"\n실패: "+fail);
process.exit(fail?1:0);
