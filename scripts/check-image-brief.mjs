// 이미지 주문서 규격 — 실행: npx tsx scripts/check-image-brief.mjs
// ★유저 확정(2026-08-05): "이미지는 어차피 내가 찾아서 구하는 거니깐 '이런 이미지가 들어가면 좋아요'라고 명시.
//  대신 터무니없는 의미 없는 이미지 말고. 브랜드명·브랜드 로고 다 가능해요. 이런 표 이미지도 찾으라고 해주세요.
//  기업 혹은 그 주제에 맞는 인물 사진도 넣어도 되니깐 적극적으로 추천해주세요."
// ★핵심 구분: 'AI 이미지에 글자 금지'는 우리가 그리는 이미지 규칙이다.
//  유저가 웹에서 찾아 넣는 이미지에는 해당하지 않는다 — 표·로고·캡션이 오히려 필요하다.
import fs from "node:fs";
import { parseSlots } from "../lib/publishHtml.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };
const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
const ph = fs.readFileSync(new URL("../lib/publishHtml.ts", import.meta.url), "utf-8");

console.log("① 유저가 찾아 넣는 3종이 주문되는가:");
{
  ok(/\[브랜드: 대상/.test(ap), "★브랜드 이미지(로고·제품)를 지목한다");
  ok(/\[표: 제목/.test(ap), "★표·인포그래픽 이미지를 지목한다");
  ok(/\[인물: 누구/.test(ap), "★인물 사진을 지목한다");
  ok(/출처표기/.test(ap), "★출처가 있는 이미지엔 출처 표기를 요구한다");
  ok(/터무니없는·의미 없는 이미지는 금지/.test(ap), "★섹션과 무관한 이미지는 막는다(유저 단서)");
  // ★유저 지시로 '적극 추천'으로 바뀌었다 — 다만 문맥 결합 조건은 그대로 남아야 한다
  ok(/장식으로 로고를 흩뿌리지 마라/.test(ap), "브랜드 로고 남용 금지");
  ok(/적극적으로 써라/.test(ap), "★브랜드가 나오는 문단마다 후보(유저 지시)");
  ok(/인물이 주인공이 아닌 문단에 얼굴 사진을 넣지 마라/.test(ap), "★무관한 얼굴은 신뢰를 깎는다");
  ok(/적극적으로 추천하되\(유저 지시\)/.test(ap), "★인물 사진도 적극 추천(유저 지시)");
}

console.log("\n② 규칙이 서로 안 섞이는가:");
{
  // ★AI 이미지 글자 금지는 유저가 4번 지적한 절대 규칙이다 — 그 적용 범위를 좁히되 없애지 않는다
  ok(/AI 이미지 규칙\(글자 금지\)은 \[사진:\] 슬롯에만 적용된다/.test(ap), "★글자 금지는 [사진:]에만 적용");
  ok(/AI가 그리는 이미지에만 해당하는 규칙이다/.test(ap), "왜 갈랐는지가 프롬프트에 적혀 있다");
  const thumb = fs.readFileSync(new URL("../lib/thumbSubject.ts", import.meta.url), "utf-8");
  ok(/NO TEXT of any kind/.test(thumb), "★AI 생성 경로의 글자 금지는 그대로 살아 있다");
}

console.log("\n③ 마커가 발행본에 새지 않는가:");
{
  // ★마커를 만들 때는 '그리는 쪽'과 '지우는 쪽'을 반드시 같이 고쳐야 한다 —
  //  파싱에 안 넣으면 대괄호째로 독자에게 노출된다.
  const slots = parseSlots(`<p>가</p>[사진: 창구 앞 대기줄]<p>나</p>[브랜드: SK하이닉스 HBF | 제품 이미지 | 출처표기]<p>다</p>[표: 표준 규격 | 정의, 용량 | 출처표기]<p>라</p>[인물: 최태원 회장 | 최근 사진 | 출처표기]`);
  ok(slots.length === 4, `네 마커가 모두 슬롯으로 잡힌다 (${slots.length})`);
  ok(slots[1].desc.startsWith("브랜드 찾기: "), "★'찾기' 접두어로 유저가 할 일이 드러난다");
  ok(slots[2].desc.startsWith("표 찾기: "), "표도 마찬가지");
  ok(slots[3].desc.startsWith("인물 찾기: "), "인물도 마찬가지");
  ok(/사진\|카드\|브랜드\|표\|인물/.test(ph), "★유출 검사도 새 마커를 본다");
  // ★AI가 그리면 안 되는 자리다 — 로고·표는 그릴 수 없고 크레딧만 태운다.
  //  타입을 안 나누면 소비하는 쪽이 desc 문자열을 냄새 맡아 판단하게 된다(반드시 어긋난다).
  ok(slots[1].type === "find" && slots[2].type === "find" && slots[3].type === "find", "★세 마커는 'find' 타입(AI 생성 대상 아님)");
  ok(slots[0].type === "photo", "[사진:]은 그대로 photo");
  const am = fs.readFileSync(new URL("../components/dashboard/ArticleModal.tsx", import.meta.url), "utf-8");
  ok(/slot\.type === "find"/.test(am) && /직접 구해요/.test(am), "★화면이 '직접 구하는 자리'로 보여준다");
  ok(/캡션에 출처를 남겨주세요/.test(am), "출처 표기 안내가 화면에 뜬다");
  ok(/filter\(\(x\) => x\.type === "photo"\)/.test(am), "★AI 생성기에는 photo만 넘어간다");
  const wv = fs.readFileSync(new URL("../components/dashboard/WritingView.tsx", import.meta.url), "utf-8");
  ok(/if \(slot\.type === "find"\) continue;/.test(wv), "★자동 생성 루프도 명시적으로 건너뛴다(우연히 맞는 건 다음에 깨진다)");

  // ★마커를 늘리면 '세는 쪽'도 같이 늘려야 한다 — 안 그러면 충분한 글이 '사진 부족'으로 지적받는다
  const { photoSlotShortfall } = await import("../lib/editorial.ts");
  const h2 = "<h2>a</h2><h2>b</h2><h2>c</h2>";
  ok(photoSlotShortfall(h2 + "[사진: 1][브랜드: x][표: y]") === null, "★브랜드·표로 채워도 '부족'이 아니다");
  ok(photoSlotShortfall(h2 + "[브랜드: a][표: b][인물: c]")?.photoOnly === 0, "★그래도 [사진:] 최소 1장은 요구한다(도입부 첫인상)");
}

console.log("\n④ 광고·체류 배치:");
{
  ok(/40~60% 지점.*이미지 \+ 표 조합/.test(ap), "★이탈 최다 구간에 시각 요소를 몬다");
  ok(/그 직전 3문단을 순수 텍스트로 두지 마라/.test(ap), "★광고 직전 텍스트벽 금지(스크롤이 빨라져 광고를 못 본다)");
  ok(/텍스트만 6문단 이상 이어지면 실격/.test(ap), "★3~5문단마다 시각 브레이크");
}

console.log("\n⑤ 분량 상향:");
{
  const ed = fs.readFileSync(new URL("../lib/editorial.ts", import.meta.url), "utf-8");
  ok(/HARD_CHAR_LIMIT = 3200/.test(ed), "★하드 상한 2,500 → 3,200(체류·슬롯)");
  ok(/targetMin = input\.channel === "wordpress" \? 2000 : 1600/.test(ap), "네이버 목표 하한 상향");
  ok(/상한이 올랐다고 채우라는 뜻이 아니다/.test(ap), "★'오바 금지' 단서가 살아 있다(유저 조건)");
}

console.log("\n⑥ 본문 규칙(스펙 5절):");
{
  const ed = fs.readFileSync(new URL("../lib/editorial.ts", import.meta.url), "utf-8");
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  // ★프롬프트는 방향, 코드는 한계선 — 모델이 습관적으로 어기는 건 코드가 막는다
  ok(/export function boldOveruse/.test(ed), "★볼드 남발을 코드가 잰다");
  ok(/export function textWallRuns/.test(ed), "★시각 브레이크 없는 구간을 코드가 잰다");
  ok(/boldOveruse\(a\.body_html\)/.test(gr) && /textWallRuns\(a\.body_html\)/.test(gr), "★생성 경로에 실제로 물려 있다");
  ok(/전부 강조하면 아무것도 강조가 아니다/.test(gr), "왜 막는지가 경고문에 있다");

  // ★인용구 3용도 — 종전엔 '속마음 인용' 하나뿐이라 도입부에만 몰렸다
  ok(/인용구\(blockquote\)는 세 가지 용도로만 쓰고/.test(ap), "★인용구 3용도가 명시됐다");
  ok(/한곳에 몰지 마라/.test(ap), "배치까지 지시한다");
  ok(/바로 다음 문단에서 답한다/.test(ap), "★속마음 인용은 즉시 답이 붙는다(대화체 리듬)");
  // ★스펙의 '○○씨는 이렇게 신청했다'는 우리 규칙(경험 날조 금지)과 충돌한다 — 조건을 붙여 받았다
  ok(/가상의 인물을 만들지 마라/.test(ap), "★사례 인용에 인물 날조 금지가 걸려 있다");
  ok(/인용 형식은 '사실'로 읽히므로 날조의 피해가 가장 크다/.test(ap), "★왜 인용구에서 특히 위험한지가 적혀 있다");
  ok(/한 문단에 최대 1개/.test(ap), "볼드 규칙이 프롬프트에도 있다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 이미지 주문서 + 분량");
process.exit(fail ? 1 : 0);
