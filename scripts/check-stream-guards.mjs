// ★생성 스트림 안전장치 회귀(2026-08-03 유저 실측: '더 좋은 글로 다듬고 있어요'에서 20분 멈춤)
//  사고 사슬: 서버가 maxDuration(300초)을 넘겨 죽음 → 스트림이 done 이벤트 없이 끊김 →
//  클라이언트는 아무 처리도 안 해서 스피너가 영원히 돎. 양쪽 다 구멍이었다.
//   서버: 재생성 횟수만 세고 시간을 안 쟀다(REGEN_CAP=1이 우연히 막아주고 있었을 뿐).
//   클라: '끝났다는 신호를 못 받은 것'과 '끝난 것'을 구분하지 않았다.
//  ★이 검사는 그 둘이 되살아나는 걸 막는다.
import fs from "node:fs";

let fail = 0;
const ok = (cond, name, detail = "") => {
  console.log(`${cond ? "OK " : "FAIL"} | ${name} ${detail}`);
  if (!cond) fail++;
};
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf-8");

// ── ① 서버: 시간 예산 ────────────────────────────────────────────────
{
  const gr = read("../app/api/generate/route.ts");
  ok(/const genStartedAt = Date\.now\(\)/.test(gr), "생성 시작 시각을 잰다");
  ok(/firstGenMs/.test(gr), "★1회 생성 시간을 실측한다(상수 추정 금지 — 모델·글 길이마다 다르다)");
  ok(/const hasTimeForRegen/.test(gr), "재생성 여유를 판단하는 함수가 있다");
  ok(/\[time-budget\]/.test(gr), "★포기할 때 로그를 남긴다(조용히 건너뛰면 원인을 못 찾는다)");

  // ★핵심 회귀: 재생성 호출부가 전부 시간 게이트를 통과하는가.
  //  하나라도 빠지면 그 경로로 maxDuration을 넘길 수 있다.
  // ★고정 문자열로 세면 조건이 조금만 달라져도 깨진다(2026-08-05: 이미지 부족에 전용 예산을 주면서
  //  'regenSpent < REGEN_CAP || imgUrgent' 형태가 생겼고, 시간 게이트는 멀쩡한데 검사만 실패했다).
  //  ★지켜야 할 건 '문장 모양'이 아니라 '재생성이 시간 게이트 없이 일어나지 않는다'다.
  //   재생성이 실제로 소비되는 자리(regenSpent++)마다 그 앞 조건문에 시간 게이트가 있는지 본다.
  const spots = [...gr.matchAll(/regenSpent\+\+/g)].map((m) => m.index ?? 0);
  const ungated = spots.filter((i) => !/hasTimeForRegen\(\)/.test(gr.slice(Math.max(0, i - 700), i)));
  ok(spots.length > 0 && ungated.length === 0, "★재생성 가드 전부에 시간 게이트가 배선됨", `${spots.length - ungated.length}/${spots.length}`);
  ok(/lenPass < LEN_REGEN_CAP && charCount > lenCap && hasTimeForRegen\(\)/.test(gr), "★분량 압축 루프도 시간 게이트를 지난다");

  // maxDuration에서 저장·마무리 몫을 빼 두었는가 — 예산을 300초 꽉 채우면 저장하다 죽는다
  ok(/300_000 - 45_000/.test(gr), "저장·마무리 몫을 예산에서 뺀다");
}

// ── ② 클라이언트: 무응답 감시 ────────────────────────────────────────
{
  const wv = read("../components/dashboard/WritingView.tsx");
  ok(/HARD_LIMIT_MS/.test(wv) && /SILENCE_LIMIT_MS/.test(wv), "총시간·무응답 두 기준이 있다");

  // ★총 한도는 서버 maxDuration(300초)보다 커야 한다 — 작으면 정상 생성을 클라가 끊는다.
  const hard = Number((wv.match(/HARD_LIMIT_MS = ([\d_]+)/) ?? [])[1]?.replace(/_/g, "") ?? 0);
  ok(hard > 300_000, "★총 한도가 서버 maxDuration보다 길다(정상 생성을 끊지 않게)", `${hard / 1000}초`);

  // ★무응답 한도는 1회 재생성(60~120초)보다 넉넉해야 한다 — 짧으면 멀쩡한 재생성을 끊는다.
  const silence = Number((wv.match(/SILENCE_LIMIT_MS = ([\d_]+)/) ?? [])[1]?.replace(/_/g, "") ?? 0);
  ok(silence >= 150_000, "★무응답 한도가 재생성 1회보다 넉넉하다", `${silence / 1000}초`);

  ok(/if \(!streamDoneRef\.current\) setError\("__TIMEOUT__"\)/.test(wv), "★done 없이 스트림이 닫히면 사용자에게 알린다(종전엔 조용히 빠져나갔다)");
  ok(/watchdogRef\.current !== "none"/.test(wv), "★감시견이 끊은 것과 사용자가 떠난 것을 구분한다");
  ok(/__TIMEOUT__/.test(wv) && /__DISCONNECT__/.test(wv), "시간 초과와 연결 끊김을 다른 안내로 나눈다");

  // ★정직: 시간 초과는 서버가 죽은 것이므로 '계속 만들어지고 있어요'라고 하면 안 된다.
  const timeoutBlock = (wv.match(/__TIMEOUT__" \? \([\s\S]*?\) : error === "__DISCONNECT__"/) ?? [""])[0];
  ok(timeoutBlock.length > 0 && !/계속 만들어지고 있어요/.test(timeoutBlock), "★시간 초과 안내가 거짓 안심을 주지 않는다");
  ok(/clearInterval\(watchdog\)/.test(wv), "감시견을 반드시 정리한다(타이머 누수 방지)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 생성 스트림 안전장치(시간 예산·무응답 감시)");
process.exit(fail ? 1 : 0);
