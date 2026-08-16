import fs from "node:fs";

// ★2026-08-02 — '[trend-funnel] 증식 0'을 끝까지 판 결과.
//  증상: 수확 로그는 성공("seeds=26→gated=24", "채택 4/4")인데 풀에는 그 카테고리 행이 0건.
//  헬스 프로브로 카테고리 분해를 찍어보니 활성 블로그 카테고리만 통째로 비어 있었다.
//
//  ★원인 두 겹:
//   ① 중복 제거(uniq) '뒤에' 선점 공고를 rows에 더 밀어넣는다. 키워드가 겹치면
//      upsert가 "ON CONFLICT ... cannot affect row a second time"으로 배치 전체가 실패한다.
//      한 건의 중복이 24건을 다 죽인다.
//   ② 그런데 순서가 'delete 먼저 → upsert'였다. 그래서 실패하면 카테고리가 통째로 빈다.
//      게다가 세 번의 강등 재시도가 전부 같은 중복 오류로 실패하는데 에러를 삼켰다.
//      밖에서는 '수확 성공 로그 + 빈 풀'이라는 모순된 상태로만 보였다.
//  ★파괴는 성공 이후에만 한다. 실패하면 옛 씨앗이라도 남는 게 빈손보다 낫다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
const tail = tt.slice(tt.indexOf("const admin = createSupabaseAdminClient()"));

// ── ① 넣고 나서 지우는가(순서) ─────────────────────────────────────────
{
  const upAt = tail.indexOf("await upsert(uniqRows)");
  const delAt = tail.indexOf('.delete().eq("category", category)');
  ok(upAt > 0 && delAt > 0, "두 연산이 모두 존재");
  ok(upAt < delAt, "★upsert가 delete보다 먼저(실패해도 카테고리가 비지 않는다)", `up@${upAt} < del@${delAt}`);
  ok(/저장에 성공했을 때만/.test(tail), "성공 조건부 정리라는 의도가 코드에 남아 있다");
}

// ── ② 실패를 삼키지 않는가 ─────────────────────────────────────────────
//  ★이걸 삼켜서 원인을 찾는 데 오래 걸렸다. 조용한 실패가 이 저장소의 반복 사고다.
{
  ok(/console\.error\(`\[trend-upsert\]/.test(tail), "★저장 실패를 로그로 남긴다");
  ok(/기존 씨앗 유지/.test(tail), "실패 시 옛 씨앗을 지키고 빠져나온다");
  ok(/return \{ generated: 0, drops, applyhome: ah \}/.test(tail), "실패는 generated 0으로 보고(성공으로 위장 금지)");
}

// ── ③ 중복 키워드를 최종적으로 접는가 ──────────────────────────────────
{
  ok(/const seenKw = new Set/.test(tail), "★upsert 직전 키워드 중복 제거");
  ok(/중복 키워드 \$\{rows\.length - uniqRows\.length\}건 제거/.test(tail), "몇 건을 접었는지 로그");
  // 동작 재현 — 선점 공고가 씨앗과 겹치는 실제 형태
  const rows = [
    { keyword: "딜리셔스 공모주 청약" }, { keyword: "실업급여조건" },
    { keyword: "딜리셔스 공모주 청약" }, // ← preempt가 뒤에 또 밀어넣은 경우
    { keyword: "" },
  ];
  const seen = new Set();
  const uniq = rows.filter((r) => { const k = String(r.keyword ?? ""); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  ok(uniq.length === 2, "★중복·빈 키워드가 접힌다", `${rows.length} → ${uniq.length}`);
}

// ── ④ 컬럼 미적용 강등 재시도는 유지되는가(회귀) ───────────────────────
{
  ok(/action_start: _a, action_end: _b/.test(tail), "action 컬럼 미적용 강등 유지");
  ok(/source: _s/.test(tail), "source 컬럼 미적용 강등 유지");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 트렌드 씨앗 저장(파괴는 성공 이후에만)");
process.exit(fail ? 1 : 0);
