// 클립보드 검증 로직 증명 — mock navigator.clipboard로 시나리오별 최종 클립보드 로그.
//   npx tsx scripts/check-copy-verify.mjs
let clipboard = "";      // OS 클립보드 mock
let focused = true;      // 문서 포커스
let silentFail = false;  // write가 조용히 실패(오탐 유발)

const nav = {
  clipboard: {
    writeText: async (t) => { if (!focused) throw new Error("not focused"); if (silentFail) return; clipboard = t; },
    write: async () => { if (!focused) throw new Error("not focused"); },
    readText: async () => clipboard,
  },
};
Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true, writable: true });
Object.defineProperty(globalThis, "window", { value: { focus: () => { focused = true; } }, configurable: true, writable: true });

const { copyTextVerified, readClipboardText } = await import("../lib/clipboard.ts");
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

const BODY = "고유가 지원금 오늘 마감 재테크 입문자도 받는 25만원 신청법입니다";
const TITLE = "고유가 지원금 신청 마감 가이드";

// (a) 정상 순서
console.log("(a) 정상 순서:");
clipboard = ""; focused = true; silentFail = false;
let r = await copyTextVerified(BODY);
ok(r === "ok", `본문 복사 결과=${r}`);
ok((await readClipboardText()) === BODY, `최종 클립보드=본문 ("${(await readClipboardText()).slice(0,14)}…")`);

// (b) 복사 → 탭전환(포커스 상실) → 복귀 → 재복사(첫 시도 실패, 자동 재시도 1회 성공)
console.log("\n(b) 탭전환 후 재복사(포커스 상실→자동 재시도):");
clipboard = ""; silentFail = false; focused = false; // 탭 전환으로 포커스 없음
r = await copyTextVerified(BODY); // 시도0 실패 → window.focus()로 회복 → 시도1 성공
ok(r === "ok", `자동 재시도로 성공 결과=${r}`);
ok((await readClipboardText()) === BODY, "최종 클립보드=본문");

// (c) 제목 탭복사 → 본문 복사 연속 → 최종은 본문
console.log("\n(c) 제목 복사 → 본문 복사 연속:");
clipboard = ""; focused = true; silentFail = false;
r = await copyTextVerified(TITLE); ok(r === "ok" && (await readClipboardText()) === TITLE, "제목 복사됨");
r = await copyTextVerified(BODY);  ok(r === "ok" && (await readClipboardText()) === BODY, "이어서 본문 복사 → 최종 클립보드=본문");

// (버그) write는 true인데 클립보드 미갱신(오탐) → 검증이 fail로 잡는가
console.log("\n(버그) 조용한 실패(오탐) 차단:");
clipboard = "이전제목내용"; focused = true; silentFail = true; // write 성공처럼 보이나 클립보드 그대로
r = await copyTextVerified(BODY);
ok(r === "fail", `오탐을 fail로 차단 결과=${r} (기존 '${clipboard.slice(0,6)}' 유지)`);

// (e) ★회귀 고정(2회 재발 버그): '네이버 열기'는 클립보드를 절대 만지지 않는다.
console.log("\n(e) 열기 후 클립보드 불변(덮어쓰기 회귀):");
clipboard = ""; focused = true; silentFail = false;
await copyTextVerified(BODY);                       // 화면1: 본문 복사
// 화면2: 열기 — window.open만(순수). 클립보드 API 호출이 있었다면 mock이 내용을 바꿨을 것.
const openNaver = () => { /* window.open(...) — 탭만 */ };
openNaver();
ok((await readClipboardText()) === BODY, "열기 클릭 후에도 클립보드 = 본문(제목 아님)");

// 정적 가드 — 열기 경로 소스에 clipboard 접근 코드가 없어야 한다(잔재 코드 재유입 차단).
const fs = await import("node:fs");
const naverApp = fs.readFileSync("lib/naverApp.ts", "utf8");
ok(!/clipboard/i.test(naverApp), "lib/naverApp.ts에 clipboard 접근 0");
const am = fs.readFileSync("components/dashboard/ArticleModal.tsx", "utf8");
const openFn = am.slice(am.indexOf("function openNaverWrite"), am.indexOf("}", am.indexOf("window.open(`https://blog.naver.com")) + 1);
ok(!/clipboard/i.test(openFn), "openNaverWrite 함수 내 clipboard 접근 0");
const sheet = fs.readFileSync("components/dashboard/NaverPublishSheet.tsx", "utf8");
const openBtn = sheet.slice(sheet.indexOf("화면 2"), sheet.indexOf("화면 3"));
ok(!/copyText|copyRich|clipboard/i.test(openBtn), "위저드 화면2(열기)에 복사 호출 0");

console.log(fail === 0 ? "\n통과: 3시나리오 + 오탐 차단 + 열기 불변(회귀 고정)" : `\n실패: ${fail}건`);
process.exit(fail === 0 ? 0 : 1);
