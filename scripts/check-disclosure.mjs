import { isReviewType, revenuePath, ensureDisclosure, hasDisclosure, DISCLOSURE_TEXT, LINK_MARKER } from "../lib/revenue.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};

console.log("① 리뷰/제휴형 판정(태그+대가성 공유):");
ok(isReviewType({keyword:"공기청정기 추천 순위"})===true,"'추천 순위' → 리뷰형");
ok(isReviewType({keyword:"에어팟 후기"})===true,"'후기' → 리뷰형");
ok(isReviewType({title:"A vs B 비교",intent:"비교 분석"})===true,"비교분석 의도 → 리뷰형");
ok(isReviewType({keyword:"고유가 지원금 신청방법"})===false,"정보형(지원금) → 리뷰형 아님");
ok(revenuePath({keyword:"노트북 추천"})==="shopping","리뷰 → shopping 태그");
ok(revenuePath({keyword:"연말정산 방법"})==="adpost","정보 → adpost 태그");

console.log("\n② 대가성 문구 누락 불가:");
const review="<h2>추천</h2><p>이 제품 좋아요.</p>";
const out=ensureDisclosure(review,true);
ok(out.startsWith(`<p><b>${DISCLOSURE_TEXT}</b></p>`),"리뷰형+문구없음 → 상단 강제 삽입");
ok(hasDisclosure(out),"삽입 후 hasDisclosure=true");
// 이미 있으면 중복 삽입 안 함
const already=`<p>${DISCLOSURE_TEXT}</p><h2>x</h2>`;
ok(ensureDisclosure(already,true)===already,"이미 있으면 중복 삽입 안 함");
// 정보형은 삽입 안 함
ok(ensureDisclosure("<p>정보글</p>",false)==="<p>정보글</p>","정보형 → 삽입 안 함");
// 누락 경로 불가능: 리뷰형은 항상 문구 보장
for(const kw of ["에어팟 후기","공기청정기 추천","노트북 비교 vs"]){
  const g=ensureDisclosure(`<p>${kw} 내용</p>`, isReviewType({keyword:kw}));
  ok(hasDisclosure(g),`리뷰형 "${kw}" → 문구 항상 존재`);
}
console.log("\n③ 링크 자리 마커:");
ok(LINK_MARKER==="[상품 링크 자리]","마커 = [상품 링크 자리]");

console.log(fail===0?"\n통과: 대가성 문구 누락 불가능 증명":`\n실패: ${fail}건`);
process.exit(fail===0?0:1);
