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
  void 0;
  ok(leadHashtag(h, "지급일").match(/#[^<]+/)[0].trim() === "#지급일", "★이미 있던 말이어도 그것 하나만 남는다");
  // ★대표 태그가 없는 글(근로장려금 같은 경우)은 '안 넣기'가 아니라 원래 태그 그대로 나간다(유저 확인).
  ok(leadHashtag(h, "") === h, "★대표 태그가 없으면 기존 태그 여러 개가 그대로 유지된다");
  // ★대표 태그가 있으면 그것 하나만 남긴다(2026-08-05 유저 확정: "이런 애들은 #분양만 들어가야 하는데").
  //  태그가 여럿이면 네이버가 어느 것을 광고 기준으로 삼을지 불확실하다 —
  //  하나만 둬야 하단 파워링크가 그 키워드 계열로 확실히 바뀐다(이 기능의 목적).
  const after = (leadHashtag(h, "실손보험").match(/#[가-힣A-Za-z0-9_]{2,}/g) ?? []);
  ok(after.length === 1 && after[0] === "#실손보험", `★대표 태그가 있으면 그것 하나만 (${after.join(" ")})`);
  ok(leadHashtag("<p>본문만</p>", "실손보험") === "<p>본문만</p>", "태그 줄이 없으면 만들지 않는다");
}

console.log("\n④ 배선:");
{
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  // ★유저가 받는 글은 경로가 둘이다. generate만 배선하면 기능이 절반만 켜진다
  //  (2026-08-06 실측: 카드에서 여는 글(pregen)에는 대표 태그가 통째로 없었다).
  const pg = fs.readFileSync(new URL("../app/api/pregen/route.ts", import.meta.url), "utf-8");
  for (const [src, where] of [[gr, "생성"], [pg, "★사전 생성(카드에서 여는 글)"]])
    ok(/leadTagFor\(/.test(src), `${where} 경로가 단가를 잰다`);
  const ab = fs.readFileSync(new URL("../lib/adBid.ts", import.meta.url), "utf-8");
  ok(/\[ad-bid\] \$\{where\} 실패/.test(ab), "실패해도 글은 나간다");
  ok(/export async function leadTagFor/.test(ab), "★계산은 한 곳(경로별 복붙 금지)");
  const fb = fs.readFileSync(new URL("../lib/finalizeBody.ts", import.meta.url), "utf-8");
  ok(/leadHashtag\(ensureHashtags\(/.test(fb), "★해시태그를 만든 뒤 맨 앞으로 당긴다(순서 중요)");
  ok(/단가 조회는 네트워크라 여기\(동기 조립\)에서 하지 않는다/.test(fb), "조립 함수는 동기로 유지");
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  // ★이미지는 '그 문단이 말하는 대상'을 그대로 지목한다(유저: SK하이닉스 주가 문단 → SK하이닉스 로고)
  ok(/그 문단이 말하고 있는 대상'을 그대로 지목한다/.test(ap), "★이미지가 문맥과 직결된다");
  ok(/유저가 무엇을 검색하면 되는지'로 쓴다/.test(ap), "★설명이 검색어에 가깝게 쓰인다");
}

console.log("\n⑤ 규격을 바꾸면 사전 생성분이 폐기되는가:");
{
  const ap2 = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  const pg = fs.readFileSync(new URL("../app/api/pregen/route.ts", import.meta.url), "utf-8");
  // ★실측(2026-08-05): 이미지 마커 3종을 배포했는데 화면엔 옛 [사진:] 두 개만 떴다.
  //  사전 생성 글이 자정에만 만료돼서, 낮에 규격을 바꿔도 그날 미리 만든 글은 옛 규격으로 나갔다.
  ok(/export const PROMPT_SPEC_VERSION/.test(ap2), "★규격 버전이 있다");
  ok(/specV: PROMPT_SPEC_VERSION/.test(pg), "★사전 생성분에 규격 버전을 새긴다");
  ok(/규격이 다르면 오늘 것이어도 버린다/.test(pg), "★버전이 다르면 오늘 것도 폐기");
  ok(/본문 규격을 바꾸면 이 숫자를 올린다/.test(ap2), "다음 사람이 올릴 줄 알게 적어 뒀다");
}

console.log("\n⑥ 내부 링크가 통째로 사라지지 않는가:");
{
  const rp = fs.readFileSync(new URL("../lib/relatedPosts.ts", import.meta.url), "utf-8");
  // ★실측: 경제·재테크 블로그는 제목에 '청약·공고'와 'N월·올해'가 거의 항상 들어간다.
  //  수명 게이트 둘이 겹치면 후보가 전멸하고, 그러면 회유 장치를 통째로 잃는다.
  ok(/수명 게이트로 전멸/.test(rp), "★전멸했을 때만 한 단계 물러선다");
  ok(/날짜가 박힌 글\(MONTHLY\)은 여전히 빼되/.test(rp), "★날짜 박힌 글은 계속 제외(원래 목적 유지)");
  ok(/확정 URL\(naver_url\)이 있는 글이 하나도 없다/.test(rp), "★진짜 원인이 URL 미확정이면 그걸 로그로 말한다");
}

console.log("\n⑦ 마감이 몇 번 돌아도 같은가(멱등):");
{
  // ★실측 버그(2026-08-06): pregen이 대표 태그 1개로 저장한 글을 유저가 카드에서 여는 순간
  //  claim이 마감을 다시 태우는데, ensureHashtags가 '태그가 3개 미만이니 부족하다'고 보고
  //  줄을 하나 더 붙였다 → #신혼부부대출 이 #신혼부부대출 #신혼부부대출 #디딤돌대출 #내집마련로 불었다.
  //  ★claim은 '마감은 멱등'을 전제로 다시 태운다 — 그 전제가 깨져 있었다.
  const { finalizeArticleBody } = await import("../lib/finalizeBody.ts");
  const body = "<h2>자격</h2><p>연 소득 7,000만 원 이하가 대상입니다. 혼인 7년 이내여야 합니다.</p>";
  const c = { keyword: "신혼부부 매매대출", isReview: false, modelTags: ["신혼부부대출", "디딤돌대출", "내집마련"] };
  const tags = (h) => (h.match(/#[가-힣A-Za-z0-9_]{2,}/g) ?? []);
  const lines = (h) => (h.match(/<p[^>]*>(?:\s*#[가-힣A-Za-z0-9_]{2,})+\s*<\/p>/g) ?? []).length;

  // ★★관련글이 있을 때도 반드시 검사한다(2026-08-06 실측 구멍).
  //  처음 고칠 때 '태그 줄은 글 맨 끝에 있다'고 보고 고쳤는데, 태그 줄 뒤에는 관련글 마커가 붙는다.
  //  관련글 없는 케이스만 테스트해서 통과했고, 유저 글(관련글 있음)에서는 그대로 불어났다.
  //  ★테스트가 실제 경로를 안 태우면 통과는 아무것도 보장하지 않는다.
  const REL = [{ title: "디딤돌대출 조건", url: "https://blog.naver.com/me/111" }];
  for (const [label, relatedPosts] of [["관련글 없음", []], ["★관련글 있음(실제 경로)", REL]]) {
    const x1 = finalizeArticleBody({ bodyHtml: body, leadTag: "신혼부부대출", relatedPosts, ...c });
    const x2 = finalizeArticleBody({ bodyHtml: x1.html, relatedPosts, ...c });
    const x3 = finalizeArticleBody({ bodyHtml: x2.html, relatedPosts, ...c });
    ok(x1.html === x2.html && x2.html === x3.html, `${label}: 세 번 마감해도 같다`);
    ok(tags(x2.html).length === 1 && lines(x2.html) === 1, `${label}: 대표 태그 1개 유지`, tags(x2.html).join(" "));
    // ★태그는 글의 마지막 줄이어야 한다 — 관련글 블록 위에 있으면 유저 눈에는 '태그가 없다'로 보인다
    ok(/<p>(?:\s*#[가-힣A-Za-z0-9_]{2,})+\s*<\/p>\s*$/.test(x2.html), `${label}: ★태그가 글의 마지막 줄`);
  }

  const a1 = finalizeArticleBody({ bodyHtml: body, leadTag: "신혼부부대출", ...c });
  const a2 = finalizeArticleBody({ bodyHtml: a1.html, ...c });
  const a3 = finalizeArticleBody({ bodyHtml: a2.html, ...c });
  ok(a1.html === a2.html && a2.html === a3.html, "★대표 태그 글을 세 번 마감해도 그대로");
  ok(tags(a2.html).length === 1 && lines(a2.html) === 1, "★열어도 대표 태그 1개 그대로", tags(a2.html).join(" "));

  const b1 = finalizeArticleBody({ bodyHtml: body, ...c });
  const b2 = finalizeArticleBody({ bodyHtml: b1.html, ...c });
  ok(b1.html === b2.html && lines(b2.html) === 1, "★대표 태그 없는 글도 태그 줄이 안 불어난다", tags(b2.html).join(" "));

  // 대표 태그는 '마지막' 태그 줄을 고친다 — 본문 중간 태그를 잘못 집으면 글 끝은 그대로 남는다
  const { leadHashtag } = await import("../lib/editorial.ts");
  const mid = "<p>#중간태그 #딴것</p><p>본문</p><p>#끝태그 #둘째</p>";
  const r = leadHashtag(mid, "실손보험");
  ok(/<p>#중간태그 #딴것<\/p>/.test(r) && /<p>#실손보험<\/p>\s*$/.test(r), "★글 끝의 태그 줄을 고친다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 대표 태그 + 이미지 문맥");
process.exit(fail ? 1 : 0);
