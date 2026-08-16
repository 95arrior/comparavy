// ★주말 수요 측정(2026-07-31) — 네이버 블로그 조회수가 평일 100~180 / 주말 100 미만인 원인을 가른다.
//  가르려는 것: '시장(검색 수요) 자체가 주말에 주는가' vs '수요는 그대로인데 우리가 주말에 지는가'.
//  전자면 주제의 성질이라 고칠 대상이 아니고(글감 각도로만 대응), 후자면 발행·노출 문제라 고칠 수 있다.
//  ★대조군을 함께 잰다 — 주말에 오르는 게 확실한 키워드가 실제로 오르는지 확인해야
//   '금융은 주말에 준다'는 결과가 측정 고장이 아님을 알 수 있다.
//  데이터랩 검색어트렌드 API를 일 단위로 직접 호출한다(lib/naverDatalab의 fetchTrend는 월 단위 전용).
//  실행: node --env-file=.env --import tsx scripts/measure-weekend-demand.mjs
import { hasDatalabEnv } from "../lib/naverDatalab.ts";

const ENDPOINT = "https://openapi.naver.com/v1/datalab/search";
const DAYS = 90;

if (!hasDatalabEnv()) { console.log("데이터랩 키 없음 — 중단"); process.exit(1); }

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const end = new Date();
const start = new Date(end);
start.setDate(start.getDate() - DAYS);

async function trend(keywords) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_DATALAB_CLIENT_ID ?? "",
      "X-Naver-Client-Secret": process.env.NAVER_DATALAB_SECRET ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: ymd(start), endDate: ymd(end), timeUnit: "date",
      keywordGroups: keywords.map((k) => ({ groupName: k, keywords: [k] })),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  return (JSON.parse(text).results ?? []);
}

// 주말/평일 평균비. 데이터랩 ratio는 요청 내 상대값이라 같은 키워드 안에서 비교하는 건 안전하다.
function split(data) {
  const wd = [], we = [];
  for (const d of data) {
    const day = new Date(`${d.period}T00:00:00+09:00`).getDay(); // 0=일 6=토
    (day === 0 || day === 6 ? we : wd).push(d.ratio);
  }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const w = avg(wd), e = avg(we);
  return { wd: w, we: e, ratio: w ? e / w : 0, n: data.length };
}

async function report(label, keywords) {
  const results = await trend(keywords);
  console.log(`\n■ ${label}`);
  console.log("  주말/평일   평일평균  주말평균  키워드");
  const out = [];
  for (const r of results) {
    const s = split(r.data ?? []);
    out.push({ kw: r.title, ...s });
    const pct = `${Math.round(s.ratio * 100)}%`;
    console.log(`  ${pct.padStart(7)}   ${s.wd.toFixed(1).padStart(7)}  ${s.we.toFixed(1).padStart(7)}   ${r.title}`);
  }
  const mean = out.length ? out.reduce((a, b) => a + b.ratio, 0) / out.length : 0;
  console.log(`  → 평균 주말/평일 ${Math.round(mean * 100)}%`);
  return mean;
}

// 우리가 실제로 노출을 받고 있는 검색어(서치콘솔 실측) + 발행 주제
const finance = await report("금융 — 우리 주제", ["정기예금 특판", "CMA 계좌개설", "IRP 이전", "저평가 우량주", "연말정산"]);
await new Promise((r) => setTimeout(r, 400));
// ★대조군 — 주말에 오르는 것이 확실한 여가 키워드. 여기서 100%를 크게 넘지 않으면 측정이 고장난 것이다.
const leisure = await report("여가 — 대조군(측정 검증용)", ["캠핑", "맛집", "영화 예매", "당일치기 여행", "홈파티"]);
await new Promise((r) => setTimeout(r, 400));
// 금융 안에서도 '주말에 따져보는' 각도가 다른지 — 대책 설계용
const compare = await report("금융 — 비교·계획 각도", ["재테크 방법", "노후 준비", "가계부 쓰는 법", "적금 추천", "카드 혜택"]);

await new Promise((r) => setTimeout(r, 400));
// ★같은 요청 안에 섞어야 절대량 비교가 성립한다 — 데이터랩 ratio는 요청마다 최댓값을 100으로 정규화한다.
//  비율이 좋아도 파이가 작으면 조회수는 안 늘어난다. '주말 절대 수요'가 큰 주제를 고르기 위한 축 통일.
console.log("\n■ 동일 축 비교 — 주말 절대 수요(한 요청 안에서만 유효)");
{
  const mixed = await trend(["연말정산", "적금 추천", "정기예금 특판", "노후 준비", "저평가 우량주"]);
  const rows = mixed.map((r) => ({ kw: r.title, ...split(r.data ?? []) })).sort((a, b) => b.we - a.we);
  console.log("  주말수요  평일수요  주말/평일  키워드");
  for (const r of rows) console.log(`  ${r.we.toFixed(1).padStart(7)}  ${r.wd.toFixed(1).padStart(7)}  ${(`${Math.round(r.ratio * 100)}%`).padStart(8)}   ${r.kw}`);
}

console.log("\n■ 판정");
console.log(`  대조군(여가) ${Math.round(leisure * 100)}% — 100%를 크게 넘어야 측정이 정상`);
console.log(`  우리 주제    ${Math.round(finance * 100)}%`);
console.log(`  비교·계획    ${Math.round(compare * 100)}%`);
console.log("\n※ 데이터랩은 검색 '수요'다. 우리 블로그 조회수와 다르며, 수요가 그대로인데 조회수만 빠지면 그건 우리 문제다.");
