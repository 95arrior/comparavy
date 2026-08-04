// 문서수 백필 검증 — 실행: npx tsx scripts/check-doc-backfill.mjs
// ★백필의 목적은 두 개다: ①미측정을 줄여 밴드 상한이 실제로 작동하게 ②'상한을 얼마로 둘까'의 근거표를 만들기.
import fs from "node:fs";
import { bucketByDocMax, nextTargets, shouldAbort, ABORT_AFTER_FAILS, DOC_BUCKETS } from "../lib/docBackfill.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 측정 순서 = 서빙 순서(덜 쓰인 것 → 검색량 높은 것):");
{
  const rows = [
    { keyword: "많이쓴것", times_assigned: 5, monthly_searches: 9000 },
    { keyword: "안쓴것-저볼륨", times_assigned: 0, monthly_searches: 200 },
    { keyword: "안쓴것-고볼륨", times_assigned: 0, monthly_searches: 1800 },
  ];
  ok(nextTargets(rows, 3).map((r) => r.keyword).join(",") === "안쓴것-고볼륨,안쓴것-저볼륨,많이쓴것", "topics의 fetchPool과 같은 정렬");
}

console.log("\n② 같은 키워드가 여러 sub에 있어도 한 번만 잰다(문서수는 sub와 무관):");
{
  const dup = [
    { keyword: "패시브인컴", times_assigned: 0, monthly_searches: 810 },  // sub=재테크
    { keyword: "패시브인컴", times_assigned: 0, monthly_searches: 480 },  // sub=부업
    { keyword: "패시브인컴", times_assigned: 0, monthly_searches: 340 },  // sub=블로그수익
    { keyword: "무담보사채", times_assigned: 0, monthly_searches: 1790 },
  ];
  const t = nextTargets(dup, 10);
  ok(t.length === 2, "★8행이 있어도 API 호출은 키워드 수만큼(쿼터 절약)");
  ok(t[0].keyword === "무담보사채", "합친 뒤에도 정렬은 유지");
}

console.log("\n③ 상한별 생존 근거표 — 감이 아니라 분포로 상한을 정한다:");
{
  const measured = [300, 900, 2500, 4800, 9000, 29000, 120000];
  const b = bucketByDocMax(measured);
  ok(b["~1,000"] === 2 && b["~3,000"] === 3 && b["~5,000"] === 4 && b["~10,000"] === 5, "상한 후보별 누적 생존 수");
  ok(b["그 이상"] === 1, "최상단 버킷 위(3만+)도 따로 센다");
  ok(DOC_BUCKETS.includes(1000) && DOC_BUCKETS.includes(5000), "밴드 사다리 상한(신생 1,000·성장 5,000)이 버킷에 있다");
}

console.log("\n④ 죽은 API 앞에서 헛돌지 않는다:");
{
  ok(!shouldAbort(ABORT_AFTER_FAILS - 1), "간헐적 실패로는 멈추지 않는다");
  ok(shouldAbort(ABORT_AFTER_FAILS), "★연속 실패가 쌓이면 중단(쿼터·권한 문제를 0으로 위장하지 않는다)");
}

console.log("\n⑤ 배선·계측 원칙:");
{
  const rt = fs.readFileSync(new URL("../app/api/cron/doc-backfill/route.ts", import.meta.url), "utf-8");
  ok(/count:\s*"exact",\s*head:\s*true/.test(rt), "★재고는 count 쿼리로 센다(행을 끌어와 세면 max_rows 1,000에서 거짓말)");
  ok(/return error \? -1/.test(rt), "★쿼리 실패는 0이 아니라 -1로 남긴다");
  ok(/is\("blog_total", null\)/.test(rt), "미측정만 대상으로 삼는다");
  ok(/\.eq\("keyword", keyword\)/.test(rt), "키워드 단위 갱신 — 한 번 재면 전 sub가 채워진다");
  ok(/dry/.test(rt), "dry 모드(쓰기 없이 분포만) 지원");
  const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf-8"));
  ok(vercel.crons.some((c) => c.path === "/api/cron/doc-backfill"), "★vercel.json에 등록됨(만들어놓고 안 걸면 아무 일도 안 일어난다)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 문서수 백필");
process.exit(fail ? 1 : 0);
