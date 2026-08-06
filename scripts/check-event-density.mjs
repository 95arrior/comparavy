// 사건 밀도 계측 — 실행: npx tsx scripts/check-event-density.mjs
// ★2026-08-07 유저 확정: "사건 3편 + 꾸준한 수요 1편, 사건 크기는 며칠 재보고 정하자."
//  이 계측은 그 '며칠'을 만드는 장치다. 발행 파이프는 아직 아무것도 안 바꾼다.
import fs from "node:fs";
import { EVENT_PROBES, measureProbe } from "../lib/eventDensity.ts";

let fail = 0;
const ok = (c, m, extra = "") => { if (!c) { fail++; console.log(`  !! ${m} ${extra}`); } else console.log(`  OK ${m} ${extra}`); };

console.log("① 계측이 발행 파이프와 분리돼 있는가:");
{
  // ★계측은 기록만 한다 — 글감 경로에 끼어드는 순간 '재보고 정한다'가 아니라 '이미 바꿨다'가 된다.
  const cron = fs.readFileSync(new URL("../app/api/cron/event-density/route.ts", import.meta.url), "utf-8");
  ok(!/topic|card|pool_|keyword_pool/i.test(cron), "★크론이 글감 테이블을 건드리지 않는다");
  ok(/event_density/.test(cron), "전용 테이블에만 쓴다");
  ok(/측정 실패는 기록하지 않는다/.test(cron), "★실패를 0으로 적지 않는다(분포가 거짓말하게 된다)");
}

console.log("\n② 소재가 '경제 전반'(유저 확정)을 덮는가:");
{
  const groups = new Set(EVENT_PROBES.map((p) => p.group));
  for (const g of ["부동산", "증시", "금리환율", "세제", "지원금"]) ok(groups.has(g), `소재 그룹: ${g}`);
  ok(EVENT_PROBES.length >= 12, `온도계 ${EVENT_PROBES.length}개`);
}

console.log("\n③ 배선:");
{
  const vc = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf-8"));
  const entry = (vc.crons ?? []).find((c) => c.path === "/api/cron/event-density");
  ok(!!entry, "★크론에 등록됨", entry?.schedule ?? "");
  // ★분포로 컷을 정하려면 하루 안의 리듬(장중·저녁·새벽)이 보여야 한다 — 하루 1회로는 못 본다
  ok(entry && /\*\/3/.test(entry.schedule), "3시간 간격(하루 리듬이 보이는 밀도)");
  const mig = fs.readFileSync(new URL("../supabase/migrations/0067_event_density.sql", import.meta.url), "utf-8");
  ok(/uniq_6h/.test(mig) && /outlets_6h/.test(mig), "★크기와 함께 '매체 수·중복 제거'를 기록(재전송 거품 방지)");
  const health = fs.readFileSync(new URL("../app/api/health/event-density/route.ts", import.meta.url), "utf-8");
  ok(/확정은 유저가 한다/.test(health), "★컷 확정은 코드가 단정하지 않는다");
}

console.log("\n④ 실호출(키 있을 때만):");
{
  if (!process.env.NAVER_DATALAB_CLIENT_ID) {
    try {
      for (const l of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf-8").split("\n")) {
        const m = /^([A-Z_0-9]+)=(.*)$/.exec(l.trim());
        if (m && m[2]) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
      }
    } catch { /* 키 없으면 건너뜀 */ }
  }
  if (!process.env.NAVER_DATALAB_CLIENT_ID) {
    console.log("  (키 없음 — 실호출 건너뜀)");
  } else {
    const r = await measureProbe("부동산 대책", "부동산");
    ok(r !== null, "측정이 값을 돌려준다");
    if (r) {
      ok(r.uniq6h <= r.cnt6h, "★중복 제거 수 ≤ 원본 수", `${r.uniq6h}/${r.cnt6h}`);
      ok(r.outlets6h <= r.cnt6h, "매체 수 ≤ 기사 수");
      ok(r.topTitles.every((t) => !/<b>|&quot;/.test(t)), "★제목에 태그·엔티티가 남지 않는다");
    }
  }
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 사건 밀도 계측");
process.exit(fail ? 1 : 0);
