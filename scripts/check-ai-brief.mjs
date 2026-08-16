// ★AI 브리핑 인용 판정 검증(2026-07-17 실측 마커 기반) — 블록 경계 안/밖·부재·대소문자.
import { aiBriefCitation, naverPostKey } from "../lib/naverRank.ts";
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

const MY = "rider95/224000000001";
const marker = 'data-meta-ssuid-extra="fender_renderer-ai_briefing" class="api_subject_bx"';
const nextSection = 'data-meta-ssuid-extra="fender_renderer-blog_smart" class="api_subject_bx"';
const pad = "x".repeat(500);

// ① 브리핑 블록 안에 내 글 인용 → rank 1
const cited = `${pad}${marker}<div>요약... https://m.blog.naver.com/RIDER95/224000000001 출처</div>${nextSection}${pad}`;
const r1 = aiBriefCitation(cited, MY);
ok(r1.rank === 1 && r1.status === "ok", "블록 안 인용(대소문자 무시) → rank 1");

// ② 브리핑은 떴지만 내 글은 블록 '밖'(일반 블로그 섹션)에만 → rank 0 (실제 블록은 수만 자 — 패딩으로 재현)
const notCited = `${pad}${marker}<div>요약... https://taxlaw.nts.go.kr 출처 ${pad}</div>${nextSection}<a href="https://m.blog.naver.com/rider95/224000000001">내 글</a>`;
const r2 = aiBriefCitation(notCited, MY);
ok(r2.rank === 0 && r2.status === "not_found", "블록 밖 노출은 인용 아님 → rank 0(브리핑 존재)");

// ③ 브리핑 자체가 없는 검색어 → rank null
const noBrief = `${pad}<div class="api_subject_bx">일반 블로그 결과 rider95/224000000001</div>`;
const r3 = aiBriefCitation(noBrief, MY);
ok(r3.rank === null && r3.status === "not_found", "브리핑 없음 → rank null");

// ④ 다음 섹션 경계가 없어도(마지막 섹션) 안전하게 판정
const tail = `${pad}${marker}<div>요약 https://m.blog.naver.com/rider95/224000000001</div>`;
ok(aiBriefCitation(tail, MY).rank === 1, "경계 없는 꼬리 블록도 판정");

// ⑤ 키 정규화 연동 — PostView·m.blog 변형이 같은 키로 떨어지는지(기존 동작 확인)
ok(naverPostKey("https://m.blog.naver.com/rider95/224000000001") === MY.toLowerCase(), "m.blog URL 정규화");
ok(naverPostKey("https://blog.naver.com/PostView.naver?blogId=rider95&logNo=224000000001") === MY.toLowerCase(), "PostView URL 정규화");

console.log(fail === 0 ? "\n통과: AI 브리핑 판정 정상" : "\n실패: " + fail);
process.exit(fail ? 1 : 0);
