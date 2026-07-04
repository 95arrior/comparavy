// 빈 슬롯 발행 — 복사 HTML(rich·plain)에 슬롯 잔재 0건 증명([사진 N] 유출 재발 금지).
import { formatBody, buildPlainText, hasPhotoLeak } from "../lib/publishHtml.ts";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};
const body="<p>도입.</p>[사진: 보조금24 신청 내역 화면 캡처]<h2>대상</h2><p>대상: 전 국민 70%</p>[사진: 계산기와 서류가 놓인 책상]<p>본문.</p>[카드: 금액=25만원]<p>끝.</p>";
// 이미지 0장(전부 빈 슬롯)
const rich0=formatBody({title:"t",bodyHtml:body});
const plain0=buildPlainText({title:"t",bodyHtml:body});
ok(!/\[사진|\[카드/.test(rich0),"rich: 빈 슬롯 잔재 0");
ok(!/\[사진|\[카드/.test(plain0),"plain: 빈 슬롯 잔재 0(마커 유출 재발 금지)");
ok(!hasPhotoLeak(rich0),"hasPhotoLeak=false(복사 버튼 활성)");
// 일부만 업로드(1번째만)
const rich1=formatBody({title:"t",bodyHtml:body,images:{0:"http://x/a.png"}});
const plain1=buildPlainText({title:"t",bodyHtml:body,images:{0:"http://x/a.png"}});
ok((rich1.match(/<img/g)??[]).length===1,"rich: 올린 슬롯만 img 1");
ok(/\[사진 1\]/.test(plain1)&&!/\[사진 [23]\]/.test(plain1),"plain: 올린 슬롯만 [사진 1], 빈 슬롯 잔재 0");
console.log(fail===0?"\n통과: 빈 슬롯 무잔재":"\n실패: "+fail);
process.exit(fail?1:0);
