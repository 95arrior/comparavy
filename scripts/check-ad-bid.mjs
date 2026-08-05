// 대표 태그(광고 단가) — 실행: npx tsx scripts/check-ad-bid.mjs
// ★유저 지시(2026-08-05): "마지막에 태그 넣는 부분, 이거 1개만 대표 키워드 광고단가 높은 걸 넣을 거예요. 글에 맞는."
//  방법 근거: 네이버 검색광고 키워드도구의 '예상 평균 클릭 비용'이 높은 키워드를 태그 맨 앞에 하나 넣으면
//  하단 파워링크가 그 계열 광고로 바뀐다.
// ★★유저가 함께 강조한 주의사항 4: "글마다 그 주제에 맞는, 단가 가장 높은 키워드 하나만."
//  무관한 고단가 태그는 광고주 타겟과 어긋나 신고·애드포스트 정지 위험이다.
import fs from "node:fs";
import { bidCandidates } from "../lib/adBid.ts";
import { leadHashtag } from "../lib/editorial.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };
const ab = fs.readFileSync(new URL("../lib/adBid.ts", import.meta.url), "utf-8");

console.log("① 후보는 '태그로 쓸 수 있는 말'인가:");
{
  const c = bidCandidates("<p>근로장려금 자격을 확인하세요. 근로장려금 신청이 가능합니다.</p>", "근로장려금 지급");
  // ★실측(2026-08-05): 조사가 붙은 '자격을'이 후보로 올라왔다 — 사람은 태그에 그렇게 쓰지 않는다.
  ok(!c.includes("자격을"), "★조사가 붙은 어절은 후보가 아니다");
  ok(c.includes("자격"), "조사를 털면 후보가 된다");
  ok(!c.some((x) => /합니다|입니다|하세요/.test(x)), "★서술어는 후보가 아니다");
  // ★연관성: 본문에 없는 말은 후보가 될 수 없다(계정 안전)
  const c2 = bidCandidates("<p>전기요금 이야기만 합니다.</p>", "전기요금 누진", ["암보험"]);
  ok(!c2.includes("암보험"), "★본문에 없는 고단가 말은 후보에서 제외된다");
}

console.log("\n② 주제와 묶인 말만 고르는가(주의사항 4):");
{
  // ★실측이 이 게이트의 필요성을 보여줬다:
  //  근로장려금 글에서 주제어 '근로장려금'은 70원인데 일반 명사 '자격'이 4,110원이었다.
  //  단가만 보면 '자격'을 고르는데, 그 태그가 부르는 건 자격증 광고다 — 글과 무관하다.
  ok(/주제와 묶인 말만 고른다/.test(ab), "★씨앗과 말 조각을 공유해야 대표 태그가 된다");
  ok(/자격증 광고다 — 글과 무관하다/.test(ab), "실측 사례가 코드에 남아 있다");
  ok(/억지로 넣는 순간 '무관한 고단가 태그'가 되고/.test(ab), "★없으면 안 넣는다");
  ok(/수익보다 계정이 먼저다/.test(ab), "★우선순위가 코드에 적혀 있다");
  ok(/대표 태그 없음 — 주제 밖/.test(ab), "거부한 이유를 로그로 남긴다");
}

console.log("\n③ 태그 맨 앞에 들어가는가:");
{
  const h = `<p>본문</p><p style="text-align:center">#근로장려금 #지급일 #신청방법</p>`;
  ok(/^#실손보험/.test(leadHashtag(h, "실손보험").match(/#[^<]+/)[0]), "★맨 앞에 붙는다");
  ok(/^#지급일 #근로장려금/.test(leadHashtag(h, "지급일").match(/#[^<]+/)[0]), "★이미 있으면 순서만 앞으로(중복 금지)");
  // ★대표 태그가 없는 글(근로장려금 같은 경우)은 '안 넣기'가 아니라 원래 태그 그대로 나간다(유저 확인).
  ok(leadHashtag(h, "") === h, "★대표 태그가 없으면 기존 태그 여러 개가 그대로 유지된다");
  // ★대표 태그는 '하나 더 얹는 것'이지 '하나를 바꾸는 것'이 아니다
  //  (2026-08-05 실측: 개수를 유지하려고 뒤를 자르다 '소득기준'이 사라졌다).
  const before = (h.match(/#[가-힣A-Za-z0-9_]{2,}/g) ?? []).length;
  const after = (leadHashtag(h, "실손보험").match(/#[가-힣A-Za-z0-9_]{2,}/g) ?? []).length;
  ok(after === before + 1, `★대표 태그를 넣어도 기존 태그를 잃지 않는다 (${before} → ${after})`);
  ok(leadHashtag("<p>본문만</p>", "실손보험") === "<p>본문만</p>", "태그 줄이 없으면 만들지 않는다");
}

console.log("\n④ 배선:");
{
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/pickTopBidTag\(/.test(gr), "★생성 경로가 단가를 잰다");
  ok(/\[ad-bid\] 실패/.test(gr), "실패해도 글은 나간다");
  const fb = fs.readFileSync(new URL("../lib/finalizeBody.ts", import.meta.url), "utf-8");
  ok(/leadHashtag\(ensureHashtags\(/.test(fb), "★해시태그를 만든 뒤 맨 앞으로 당긴다(순서 중요)");
  ok(/단가 조회는 네트워크라 여기\(동기 조립\)에서 하지 않는다/.test(fb), "조립 함수는 동기로 유지");
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  // ★이미지는 '그 문단이 말하는 대상'을 그대로 지목한다(유저: SK하이닉스 주가 문단 → SK하이닉스 로고)
  ok(/그 문단이 말하고 있는 대상'을 그대로 지목한다/.test(ap), "★이미지가 문맥과 직결된다");
  ok(/유저가 무엇을 검색하면 되는지'로 쓴다/.test(ap), "★설명이 검색어에 가깝게 쓰인다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 대표 태그 + 이미지 문맥");
process.exit(fail ? 1 : 0);
