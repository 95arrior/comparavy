import { ECON_EVENTS, upcomingEcon, econSeeds, ECON_LEAD_DAYS } from "../lib/econCalendar.ts";
import fs from "node:fs";

// ★경제 지표 발표 캘린더 회귀(2026-08-02 유저: "한 시간도 괜찮아요, 선점하는 거").
//  발표일은 몇 달 전에 공표된다 — 언제 터질지 100% 아는 유일한 재료다.
//  ★이 테스트의 존재 이유: 날짜가 틀리면 선점이 아니라 헛발질이다. 그리고 틀려도 아무도 모른다
//   (글은 나가고 발표는 다른 날 나고, 조회수만 조용히 0이 된다). 그래서 실값을 고정한다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 공식 공표값 고정 ────────────────────────────────────────────────
//  출처: 한국은행 통화정책방향 결정회의 일정 / 국가데이터처 '2026년 물가·고용 보도계획'
const 금통위 = ECON_EVENTS.filter((e) => e.kind === "rate").map((e) => e.date);
ok(금통위.length === 8, `금통위 연 8회 (현재 ${금통위.length})`);
ok(금통위[0] === "2026-01-15", "금통위 첫 회의 2026-01-15");
ok(금통위.includes("2026-07-16"), "금통위 2026-07-16 (통방 보도자료로 교차 확인)");
ok(금통위.includes("2026-08-27"), "금통위 2026-08-27");
ok(금통위.includes("2026-11-26"), "금통위 마지막 2026-11-26");
// 금통위는 1·2·4·5·7·8·10·11월에만 열린다(3·6·9·12월은 금융안정회의)
{
  const months = new Set(금통위.map((d) => Number(d.slice(5, 7))));
  ok([...months].sort((a, b) => a - b).join(",") === "1,2,4,5,7,8,10,11", "금통위 개최 월 = 1·2·4·5·7·8·10·11");
}

const cpi = ECON_EVENTS.filter((e) => e.kind === "cpi").map((e) => e.date);
ok(cpi.includes("2026-08-04"), "7월 소비자물가동향 공표 2026-08-04");
ok(cpi.includes("2026-09-02"), "8월 소비자물가동향 공표 2026-09-02");
ok(cpi.includes("2026-12-31"), "12월·연간 소비자물가동향 2026-12-31");

const jobs = ECON_EVENTS.filter((e) => e.kind === "jobs").map((e) => e.date);
ok(jobs.includes("2026-08-12"), "7월 고용동향 공표 2026-08-12");
ok(jobs.includes("2026-09-09"), "8월 고용동향 공표 2026-09-09");

// 날짜 형식·중복 방어
ok(ECON_EVENTS.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date)), "모든 날짜가 YYYY-MM-DD");
ok(new Set(ECON_EVENTS.map((e) => `${e.kind}:${e.date}`)).size === ECON_EVENTS.length, "같은 지표의 날짜 중복 없음");

// ── ② 선점 창은 D-0~D-2만 ─────────────────────────────────────────────
{
  const at = (ymd) => upcomingEcon(new Date(`${ymd}T09:00:00+09:00`));
  ok(ECON_LEAD_DAYS === 2, "선점 창 2일(발표 전 이틀 ~ 당일)");
  ok(at("2026-08-02").some((e) => e.kind === "cpi" && e.dday === 2), "★D-2에 물가 발표가 창에 들어온다");
  ok(at("2026-08-04").some((e) => e.dday === 0), "D-0(발표 당일)도 창 안");
  ok(at("2026-08-05").every((e) => e.kind !== "cpi"), "★발표 다음 날은 빠진다(이미 남들이 다 썼다)");
  ok(at("2026-08-20").length === 0, "발표가 먼 날은 창이 비어 있다");
  ok(at("2026-08-27").some((e) => e.kind === "rate" && e.dday === 0), "금통위 당일이 창에 잡힌다");
}

// ── ③ 발표 전/후로 각도가 갈린다 ──────────────────────────────────────
{
  const 전 = econSeeds("경제·재테크", new Date("2026-08-26T09:00:00+09:00"))[0];
  const 후 = econSeeds("경제·재테크", new Date("2026-08-27T09:00:00+09:00"))[0];
  ok(전 && 후 && 전.title !== 후.title, "★발표 전과 당일의 제목·각도가 다르다");
  ok(전 && /예측|단정/.test(전.newsContext), "발표 전 글은 결과 예측을 금지한다");
  ok(후 && /실제 발표된|실제 수치/.test(후.newsContext), "발표 당일 글은 실제 발표값만 쓰게 한다");
  ok(전 && /지어내지 마라/.test(전.newsContext), "지어낸 수치 금지가 브리프에 있다");
}

// ── ④ 경제 카테고리에만 ───────────────────────────────────────────────
{
  const now = new Date("2026-08-02T09:00:00+09:00");
  ok(econSeeds("경제·재테크", now).length > 0, "경제 카테고리엔 주입된다");
  ok(econSeeds("요리", now).length === 0, "요리 카테고리엔 주입되지 않는다");
  ok(econSeeds("반려동물", now).length === 0, "반려동물 카테고리엔 주입되지 않는다");
}

// ── ⑤ 배선 확인 ───────────────────────────────────────────────────────
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/econSeeds/.test(tt), "★수확 경로에 배선됨");
  ok(/\[econ-preempt\]/.test(tt), "선점 주입 로그가 남는다");
}

console.log(fail ? `\n실패 ${fail}건` : `\n통과: 경제 지표 캘린더 (총 ${ECON_EVENTS.length}건)`);
process.exit(fail ? 1 : 0);
