import { fetchDartIPOSeeds, ipoAdviceLeak, shortCorpName } from "../lib/dartIPO.ts";

// ★DART 실호출 진단(2026-08-02) — 키를 넣은 뒤 한 번 돌려 필드명·응답 형태를 실측한다.
//  ★추측으로 배포하지 않는다: 다른 수확기(청약홈·기업마당)도 전부 실호출로 필드를 확정하고 넣었다.
const key = process.env.DART_API_KEY;
if (!key) {
  console.log("DART_API_KEY 없음.\n  로컬에서 보려면: vercel env pull .env.local  (또는 .env.local에 직접 한 줄 추가)");
  process.exit(1);
}
console.log(`키 감지 — 길이 ${key.length}자\n`);

// ① 원본 응답 형태부터 본다(가공 전)
const days = Number(process.argv[2] ?? 14);
const ymd = (d) => new Date(d.getTime() + 9 * 36e5).toISOString().slice(0, 10).replace(/-/g, "");
const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${key}&bgn_de=${ymd(new Date(Date.now() - days * 864e5))}&end_de=${ymd(new Date())}&pblntf_detail_ty=C001&page_count=100`;
const raw = await fetch(url).then((r) => r.json());
console.log(`① 원본 응답 — status=${raw.status} message=${raw.message ?? "-"} 총 ${raw.total_count ?? 0}건`);
if (raw.status !== "000") {
  console.log("  ★status 000이 아님 — 013=데이터없음 / 020=한도초과 / 100=키오류 / 101=미인증키");
  process.exit(raw.status === "013" ? 0 : 1);
}
const list = raw.list ?? [];
console.log(`  필드 확인: ${Object.keys(list[0] ?? {}).join(", ") || "(빈 목록)"}\n`);

// ② 미상장(공모 후보) vs 상장사 유상증자 분리가 되는가
const unlisted = list.filter((x) => !(x.stock_code ?? "").trim());
console.log(`② 미상장 ${unlisted.length}건 / 상장사 ${list.length - unlisted.length}건 (상장사 유상증자는 제외 대상)`);
for (const x of list.slice(0, 8))
  console.log(`   ${(x.stock_code ?? "").trim() ? "상장" : "미상장"} | ${x.rcept_dt} | ${shortCorpName(x.corp_name)} | ${x.report_nm}`);

// ③ 실제 씨앗
const seeds = await fetchDartIPOSeeds({ days });
console.log(`\n③ 씨앗 ${seeds.length}건`);
for (const s of seeds) {
  // ★검사 범위는 프로덕션과 같아야 한다(keyword+title).
  //  newsContext까지 넣었더니 거기 적힌 금지어 목록('유망·기대주·따상…')을 스스로 잡아
  //  멀쩡한 씨앗 5건이 전부 누출로 찍혔다 — 규칙문을 위반문으로 읽은 것이다.
  const leak = ipoAdviceLeak(`${s.keyword} ${s.title}`);
  console.log(`   • ${s.keyword}`);
  console.log(`     제목: ${s.title}`);
  console.log(`     공시: ${s.rceptDt} / ${s.rceptNo}`);
  console.log(`     투자권유 검사: ${leak ? `★누출 "${leak}"` : "통과"}${s.priced ? " | ★발행조건 확정(청약 임박)" : ""}`);
}
if (!seeds.length) console.log("   (최근 공모 공시 없음 — 기간을 늘려보세요: node scripts/diagnose-dart.mjs 30)");
