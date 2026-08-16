// 대표이미지 합성 렌더러 검증 — 전부 로컬(폴백 배경, AI 비용 0).
//   npx tsx scripts/check-thumbnails.mjs
// 산출: 50장 그리드 + 150px 축소 + 엣지케이스 + 100명 패턴 시뮬 + 금지어 + 열린고리 샘플.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { visualIdentityFor, THUMB_COMBO_SPACE } from "../lib/visualIdentity.ts";
import { renderThumbnail, renderThumbnailAt } from "../lib/thumbnailRenderer.ts";
import { pickHookPattern, HOOK_PATTERNS, containsBanned, bannedHits } from "../lib/hookPatterns.ts";

const OUT = process.env.OUT_DIR || "/private/tmp/claude-501/-Users-swooosy/6be93337-c111-414a-81d7-88542cd1773c/scratchpad/thumbs";
fs.mkdirSync(OUT, { recursive: true });

// 목 브리프 10개 — 열린 고리 카피(답 숨김). \n=줄바꿈.
const BRIEFS = [
  { mainCopy: "지금 바꿔야\n하는 이유", subCopy: "그냥 두면 새는 이자", badge: "경제정보" },
  { mainCopy: "월 5천 원\n차이의 정체", subCopy: "통장 하나 차이", badge: "재테크" },
  { mainCopy: "사회초년생이\n먼저 볼 것", subCopy: "", badge: "금융꿀팁" },
  { mainCopy: "높은 금리가\n손해인 경우", subCopy: "숫자에 속지 않기", badge: "예적금" },
  { mainCopy: "갈아타 보니\n달랐던 점", subCopy: "직접 겪은 차이", badge: "경험담" },
  { mainCopy: "이번 달까지만", subCopy: "놓치면 다음 기회", badge: "마감임박" },
  { mainCopy: "지금 신청해도\n될까?", subCopy: "", badge: "정책정보" },
  { mainCopy: "적금과 파킹\n지금은?", subCopy: "상황별 정답", badge: "비교분석" },
  { mainCopy: "숨은 조건\n세 가지", subCopy: "가입 전 체크", badge: "체크리스트" },
  { mainCopy: "왜 나만\n안 될까", subCopy: "탈락 이유", badge: "신청가이드" },
];

// 서로 다른 시각 정체성 유저 n명 — 레이아웃도 팔레트도 서로 겹치지 않게(데모 다양성 극대화).
function pickDistinctUsers(n) {
  const users = [], layouts = new Set(), palettes = new Set();
  for (let i = 0; i < 20000 && users.length < n; i++) {
    const uid = `u${i}`;
    const v = visualIdentityFor(uid);
    if (layouts.has(v.layout) || palettes.has(v.palette.name)) continue;
    layouts.add(v.layout); palettes.add(v.palette.name); users.push(uid);
  }
  return users;
}

async function main() {
  console.log(`조합 공간: ${THUMB_COMBO_SPACE} (레이아웃10×팔레트12×폰트6×배경8)`);
  const users = pickDistinctUsers(5);
  console.log(`\n유저 5명 시각 정체성(레이아웃|팔레트|폰트|배경):`);
  for (const u of users) {
    const v = visualIdentityFor(u);
    console.log(`  ${u}: ${v.layout} | ${v.palette.name} | ${v.fontPair.name} | ${v.bgStyle}`);
  }
  const idKeys = users.map((u) => { const v = visualIdentityFor(u); return `${v.layout}|${v.palette.name}`; });
  console.log(`  레이아웃×팔레트 중복 0? ${new Set(idKeys).size === users.length}`);

  // 50장 렌더(300px, 폴백 배경) → 5행×10열 그리드
  console.log(`\n50장 렌더 중(폴백 배경)...`);
  const CELL = 300, COLS = 10, ROWS = 5, GAP = 8;
  const composites = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const identity = visualIdentityFor(users[r]);
      const png = await renderThumbnailAt({ ...BRIEFS[c], identity, bgDataUrl: null }, CELL);
      composites.push({ input: png, left: c * (CELL + GAP), top: r * (CELL + GAP) });
    }
  }
  const gw = COLS * (CELL + GAP) - GAP, gh = ROWS * (CELL + GAP) - GAP;
  const gridPath = path.join(OUT, "grid-50.png");
  await sharp({ create: { width: gw, height: gh, channels: 3, background: "#ffffff" } })
    .composite(composites).png().toFile(gridPath);
  console.log(`  50장 그리드: ${gridPath}`);

  // 150px 축소 미리보기 — 한 유저의 10 브리프를 150px로 한 줄
  const P = 150;
  const previews = [];
  for (let c = 0; c < COLS; c++) {
    const identity = visualIdentityFor(users[0]);
    const png = await renderThumbnailAt({ ...BRIEFS[c], identity, bgDataUrl: null }, P);
    previews.push({ input: png, left: c * (P + GAP), top: 0 });
  }
  const prevPath = path.join(OUT, "preview-150.png");
  await sharp({ create: { width: COLS * (P + GAP) - GAP, height: P, channels: 3, background: "#ffffff" } })
    .composite(previews).png().toFile(prevPath);
  console.log(`  150px 축소 미리보기: ${prevPath}`);

  // 텍스트 엣지 케이스 — 2/10/20자 넘침·깨짐 없음
  const edges = [{ mainCopy: "이유", badge: "짧음" }, { mainCopy: "지금 바꿔야 하는 이유는", badge: "10자" }, { mainCopy: "지금 당장 바꾸지 않으면 손해 보는", badge: "20자" }];
  const edgeComps = [];
  for (let i = 0; i < edges.length; i++) {
    const png = await renderThumbnailAt({ ...edges[i], identity: visualIdentityFor(users[1]), bgDataUrl: null }, CELL);
    edgeComps.push({ input: png, left: i * (CELL + GAP), top: 0 });
  }
  const edgePath = path.join(OUT, "edge-cases.png");
  await sharp({ create: { width: 3 * (CELL + GAP) - GAP, height: CELL, channels: 3, background: "#ffffff" } })
    .composite(edgeComps).png().toFile(edgePath);
  console.log(`  엣지케이스(2·10·20자): ${edgePath}`);

  // 풀사이즈 3장(같은 씨앗 유저 3명 비교) — 1080px 개별
  console.log(`\n같은 씨앗 × 유저 3명 비교(풀사이즈):`);
  const day = "2026-07-03";
  const seed = "고유가지원금 신청방법";
  for (let i = 0; i < 3; i++) {
    const uid = users[i], v = visualIdentityFor(uid);
    const hook = pickHookPattern(uid, seed, day, [], "고유가지원금 마감");
    const png = await renderThumbnail({ ...BRIEFS[i], identity: v, bgDataUrl: null });
    const f = path.join(OUT, `sample-user${i + 1}.png`);
    fs.writeFileSync(f, png);
    console.log(`  유저${i + 1}(${uid}): 훅=${hook.name} | ${v.layout}/${v.palette.name}/${v.fontPair.name} → ${f}`);
  }

  // 제목 패턴 시뮬 — 100명, 같은 씨앗. 분포 + 유저 내 연속 반복 없는지
  console.log(`\n제목 훅 패턴 100명 시뮬(같은 씨앗):`);
  const dist = {};
  let consecutiveRepeat = 0;
  for (let i = 0; i < 100; i++) {
    const uid = `sim-${i}`;
    // 유저 내 연속 5개 글(다른 씨앗) — 직전 3개 제외 회전 확인
    const recent = [];
    const seeds = ["고유가지원금", "청년도약계좌", "파킹통장 금리", "전세대출 조건", "연말정산 환급"];
    for (const sk of seeds) {
      const hp = pickHookPattern(uid, sk, day, recent, sk + " 마감 신청");
      if (recent[0] === hp.key) consecutiveRepeat++;
      recent.unshift(hp.key);
    }
    const first = pickHookPattern(uid, "고유가지원금", day, [], "고유가지원금 마감");
    dist[first.name] = (dist[first.name] || 0) + 1;
  }
  for (const h of HOOK_PATTERNS) console.log(`  ${h.name.padEnd(8)} ${"█".repeat(dist[h.name] || 0)} ${dist[h.name] || 0}`);
  console.log(`  유저 내 직전 패턴 즉시 반복: ${consecutiveRepeat}건 (0이어야 함)`);

  // 금지어 필터 테스트
  console.log(`\n금지어 필터:`);
  const badTitles = ["무조건 오르는 통장 100% 보장", "이거 하나면 대박 나는 재테크", "충격적인 금리의 진실", "지금 바꿔야 하는 이유", "월 5천 원 차이의 정체"];
  let filterOk = true;
  for (const t of badTitles) {
    const bad = containsBanned(t);
    const expected = t.includes("보장") || t.includes("대박") || t.includes("충격");
    const mark = bad === expected ? "OK" : "!!";
    if (bad !== expected) filterOk = false;
    console.log(`  ${mark} "${t}" → ${bad ? "차단(" + bannedHits(t).join(",") + ")" : "통과"}`);
  }
  console.log(`  금지어 필터 정확? ${filterOk}`);

  // 열린 고리 육안 샘플 20개(카피 + 클릭형 제목)
  console.log(`\n열린 고리 육안 확인 샘플 20(질문이 생기는가?):`);
  BRIEFS.forEach((b, i) => console.log(`  ${String(i + 1).padStart(2)}. 카피: "${b.mainCopy.replace("\n", " ")}"  |  제목예: "${HOOK_PATTERNS[i % 8].example}"`));

  console.log(`\n★그리드 열어서 확인: ${gridPath}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
