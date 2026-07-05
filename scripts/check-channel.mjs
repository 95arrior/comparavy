// 채널 배타 회귀 고정 — 네이버 프롬프트 무변경 + WP 규격 존재.
import { buildSystemPrompt } from "../lib/articlePrompt.ts";
let fail = 0;
const ok = (c, m) => { console.log(c ? `  OK ${m}` : `  !! ${m}`); if (!c) fail++; };
const nv = buildSystemPrompt("general");
const nv2 = buildSystemPrompt("general", "naver");
const wp = buildSystemPrompt("general", "wordpress");
ok(nv === nv2, "기본값=naver (기존 호출 무변경)");
ok(nv.includes("네이버 블로그 모드") && !nv.includes("워드프레스 모드"), "네이버 = 네이버 규격만");
ok(wp.includes("구글/워드프레스 모드") && !wp.includes("네이버 블로그 모드"), "WP = 구글 규격만(배타)");
ok(["AI Overviews", "E-E-A-T", "Helpful Content", "[내부링크:"].every((k) => wp.includes(k)), "WP 4규격(인용·경험·독자가치·클러스터)");
ok(wp.includes("해시태그·형광펜 문법은 쓰지 않는다"), "네이버 문법 침투 금지");
console.log(fail ? `\n실패: ${fail}` : "\n통과: 채널 배타 고정");
process.exit(fail ? 1 : 0);
