import { STYLE_PRESETS, stylePresetFor, stylePersonaInstruction } from "../lib/stylePersona.ts";
import { visualIdentityFor } from "../lib/visualIdentity.ts";

// ★10인 스타일 분화 회귀(2026-08-02 유저 확정: "주제는 겹쳐도 되지만 글 스타일은 완전히 다르게").
//  기존 해시 조합은 축이 전부 표면(도입 형식·해시태그 개수·이모지 양)이라 두 글을 나란히 놓으면
//  같은 사람이 쓴 티가 났다 — 어미·인칭·수치 화법이 같았기 때문이다.
//  이 테스트가 지키는 것: ①10석이 실제로 다른가 ②같은 계정은 항상 같은가(C-Rank 일관성) ③축이 문체까지 내려갔는가
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

ok(STYLE_PRESETS.length === 10, `스타일 프리셋 10종 (현재 ${STYLE_PRESETS.length})`);
ok(new Set(STYLE_PRESETS.map((p) => p.key)).size === 10, "프리셋 key 중복 없음");
ok(new Set(STYLE_PRESETS.map((p) => p.traits.join("|"))).size === 10, "★10종의 지시문이 서로 완전히 다름");

// ── 축이 문체까지 내려갔는가(표면 축만 있으면 실패) ──
{
  const 어미 = STYLE_PRESETS.map((p) => (p.traits.join(" ").includes("해요체") ? "해요" : "합니다"));
  ok(new Set(어미).size === 2, "★어미 체계가 갈린다(해요체/합니다체 둘 다 존재)");
  const 인칭 = new Set(STYLE_PRESETS.map((p) => p.traits[1]));
  ok(인칭.size >= 3, `★1인칭 축이 3종 이상 (현재 ${인칭.size}: 저는/우리/없음)`);
  const 수치 = new Set(STYLE_PRESETS.map((p) => p.traits[3]));
  ok(수치.size >= 5, `★수치 화법이 갈린다 (현재 ${수치.size}종)`);
  // 모든 프리셋이 존댓말 범위 안에 있어야 한다 — 분화는 하되 네이버 규격을 벗어나면 안 된다
  for (const p of STYLE_PRESETS) {
    const t = p.traits.join(" ");
    ok(/해요체|정중체|~합니다|~해요/.test(t), `${p.name}: 존댓말 규격 유지`);
  }
}

// ── 같은 계정은 항상 같은 스타일(블로그 내 일관성) ──
{
  const a = stylePersonaInstruction("blog-abc");
  const b = stylePersonaInstruction("blog-abc");
  ok(a === b, "같은 계정은 항상 같은 스타일(C-Rank 일관성)");
  ok(stylePersonaInstruction("blog-xyz") !== a || STYLE_PRESETS.length === 1, "다른 계정은 다른 스타일이 나올 수 있다");
}

// ── 환경변수 1:1 고정 배정이 실제로 먹는가(10명 운영 시 충돌 0을 보장하는 장치) ──
{
  process.env.ATEFLO_STYLE_ASSIGN = "blog-1:P7,blog-2:P3";
  ok(stylePresetFor("blog-1").key === "P7", "★환경변수 고정 배정이 해시를 이긴다 (blog-1→P7)");
  ok(stylePresetFor("blog-2").key === "P3", "★환경변수 고정 배정 (blog-2→P3)");
  delete process.env.ATEFLO_STYLE_ASSIGN;
}

// ── 시각 정체성 10석이 서로 겹치지 않는가 ──
{
  process.env.ATEFLO_VISUAL_ASSIGN = Array.from({ length: 10 }, (_, i) => `u${i}:${i}`).join(",");
  const ids = Array.from({ length: 10 }, (_, i) => visualIdentityFor(`u${i}`));
  ok(new Set(ids.map((x) => x.layout)).size === 10, "★시각 10석 레이아웃이 전부 다름");
  ok(new Set(ids.map((x) => JSON.stringify(x.palette))).size === 10, "★시각 10석 팔레트가 전부 다름");
  ok(JSON.stringify(visualIdentityFor("u3")) === JSON.stringify(ids[3]), "같은 계정은 항상 같은 시각 정체성");
  delete process.env.ATEFLO_VISUAL_ASSIGN;
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 10인 스타일·시각 프리셋");
process.exit(fail ? 1 : 0);
