import fs from "node:fs";
import { dayKeyKST, yesterdayKST } from "../lib/checkin.ts";

// ★체크인 날짜 회귀(2026-08-01 실측 검거).
//  사고: 서버(Vercel)는 UTC로 도는데 `new Date()`의 로컬 게터로 날짜를 만들었다.
//  → KST 자정~오전 9시 사이 입력이 하루 밀렸다. 실측: 08-01 02:27 KST 입력 → 07-31이어야 하는데 07-30 저장.
//  이 값은 홈판 판정이 발행일과 3일 창으로 대조하는 축이라, 하루가 밀리면 귀속이 통째로 어긋난다.
let fail = 0;
const ok = (cond, label, extra = "") => { if (!cond) fail++; console.log(cond ? "OK " : "FAIL", "|", label, extra); };

// KST 특정 시각의 epoch(ms) — 테스트 입력을 시각으로 못 박는다.
const kst = (iso) => Date.parse(`${iso}+09:00`);

// ── 하루가 밀리는 위험 구간(KST 00:00~09:00)에서도 정확한가 ────────────────
const CASES = [
  ["2026-08-01T00:00", "2026-08-01", "2026-07-31", "자정 직후"],
  ["2026-08-01T02:27", "2026-08-01", "2026-07-31", "★실측 사고 시각(02:27)"],
  ["2026-08-01T08:59", "2026-08-01", "2026-07-31", "오전 9시 직전"],
  ["2026-08-01T09:00", "2026-08-01", "2026-07-31", "오전 9시 정각"],
  ["2026-08-01T23:59", "2026-08-01", "2026-07-31", "자정 직전"],
  ["2026-01-01T00:30", "2026-01-01", "2025-12-31", "해 넘김"],
  ["2026-03-01T01:00", "2026-03-01", "2026-02-28", "달 넘김"],
];
for (const [iso, today, yday, label] of CASES) {
  ok(dayKeyKST(kst(iso)) === today, `오늘(KST) ${label}`, `→ ${dayKeyKST(kst(iso))} (기대 ${today})`);
  ok(yesterdayKST(kst(iso)) === yday, `어제(KST) ${label}`, `→ ${yesterdayKST(kst(iso))} (기대 ${yday})`);
}

// ── 옛 방식(UTC 서버의 로컬 게터)은 실제로 틀렸는가 — 회귀의 근거를 남긴다 ──
{
  const t = kst("2026-08-01T02:27");
  const utcNaive = new Date(t); utcNaive.setUTCDate(utcNaive.getUTCDate() - 1);
  const wrong = utcNaive.toISOString().slice(0, 10);
  ok(wrong === "2026-07-30", "옛 방식은 07-30으로 계산됨(사고 재현)", `→ ${wrong}`);
  ok(yesterdayKST(t) !== wrong, "★새 방식은 그 값과 다름", `→ ${yesterdayKST(t)}`);
}

// ── 서버가 KST 함수를 실제로 쓰는가(로컬 게터로 되돌아가면 사고 재발) ──────
{
  const srv = fs.readFileSync(new URL("../app/api/checkin/route.ts", import.meta.url), "utf-8");
  ok(/yesterdayKST\(\)/.test(srv), "체크인 저장이 yesterdayKST()를 사용");
  ok(!/new Date\(\);\s*\w+\.setDate\(/.test(srv), "★로컬 게터로 날짜를 만들지 않음");
  ok(!/dayKey\(y\)/.test(srv), "옛 dayKey(y) 호출 없음");
}

// ── 소급 입력: 화면이 고를 수 있는 범위 ≤ 서버가 받는 범위 ────────────────
// (어긋나면 사장님이 날짜를 골랐는데 저장이 조용히 거절된다)
{
  const ui = fs.readFileSync(new URL("../components/dashboard/CheckinCard.tsx", import.meta.url), "utf-8");
  const srv = fs.readFileSync(new URL("../app/api/checkin/route.ts", import.meta.url), "utf-8");
  const uiDays = Number(ui.match(/const BACKFILL_DAYS = (\d+)/)?.[1] ?? NaN);
  const srvDays = Number(srv.match(/Date\.now\(\) - (\d+) \* 86400000/)?.[1] ?? NaN);
  ok(Number.isFinite(uiDays) && Number.isFinite(srvDays), "양쪽 범위를 읽음", `→ 화면 ${uiDays}일 / 서버 ${srvDays}일`);
  ok(uiDays <= srvDays, "★화면 선택 범위 ≤ 서버 허용 범위", `→ ${uiDays} ≤ ${srvDays}`);
  ok(uiDays >= 28, "소급 입력이 4주 이상 열려 있음", `→ ${uiDays}일`);
  ok(uiDays % 7 === 0, "7열 격자에 딱 맞음(가로 스크롤 없이 감싸짐)", `→ ${uiDays}일 = ${uiDays / 7}줄`);
  ok(/grid-cols-7/.test(ui), "날짜 칩이 격자(가로 스크롤 아님)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 체크인 날짜·소급 범위");
process.exit(fail ? 1 : 0);
