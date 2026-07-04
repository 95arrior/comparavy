import { parseNaverBlogId, normalizeTitle, titleSimilarity, matchInRss, MATCH_THRESHOLD } from "../lib/naverRss.ts";
import fs from "node:fs";
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log(`  !! ${m}`);}else console.log(`  OK ${m}`);};

console.log("① blogId 파싱(어떤 형태든):");
for (const [i,e] of [["https://blog.naver.com/myblog","myblog"],["m.blog.naver.com/My_Blog/223456","my_blog"],["blog.naver.com/abc?Redirect=Log&logNo=1","abc"],["https://blog.naver.com/PostList.naver?blogId=Foo_1","foo_1"],["rss.blog.naver.com/bar.xml","bar"],["myid123","myid123"],["https://naver.com",null],["",null]]) {
  ok(parseNaverBlogId(i)===e, `"${i}" → ${e}`);
}

console.log("\n② 제목 매칭(정규화+임계+시각 가중):");
const now=Date.now();
const items=[
  { title:"고유가 지원금, 신청 전에 꼭 확인할 것들", link:"https://blog.naver.com/x/1", pubDate: now-3600_000 },
  { title:"오늘 저녁 뭐 먹지? 김치찌개 레시피", link:"https://blog.naver.com/x/2", pubDate: now-7200_000 },
];
ok(matchInRss("고유가 지원금 신청 전에 꼭 확인할 것들", items, now)?.link.endsWith("/1")===true, "구두점·공백 차이 매칭");
ok(matchInRss("[정보] 고유가 지원금, 신청 전에 꼭 확인할 것들!!", items, now)?.link.endsWith("/1")===true, "머리말·꼬리 기호 붙어도 매칭");
ok(matchInRss("강아지 분리불안 해결법", items, now)===null, "무관 제목 미매칭(null=재시도 몫, 즉시 실패 아님)");
ok(titleSimilarity("완전히 다른 글","고유가 지원금")<MATCH_THRESHOLD, "임계 미달 차단");

console.log("\n③ 함정 (a) — 'RSS에 없음=삭제' 판정 코드 부재(정적 고정):");
const rssSrc=fs.readFileSync("lib/naverRss.ts","utf8");
ok(!/RSS.*없.*(삭제|deleted)/.test(rssSrc.replace(/\/\/[^\n]*/g,"")) , "주석 외 본문에 RSS부재→삭제 로직 없음");
ok(/URL 조회 기반 삭제 감지/.test(rssSrc), "삭제는 checkPostDeleted(URL 조회)만");

console.log("\n④ 함정 (b) — 200+삭제문구 감지, 불확실=유지:");
ok(/삭제되었거나 존재하지 않는/.test(rssSrc) && /unknown/.test(rssSrc), "명시 패턴만 deleted, 모호는 unknown(유지)");
ok(normalizeTitle("고유가  지원금! (2차)")===normalizeTitle("고유가 지원금 2차"), "정규화 동치");

console.log(fail===0?"\n통과: RSS 검증 코어":"\n실패: "+fail);
process.exit(fail?1:0);
