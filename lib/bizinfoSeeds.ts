// ★기업마당 수확기(2026-07-09 — 돈+행동 3호) — 중기부 지원사업 공고 API 실호출 검증 완료(15157820).
//  규격은 청약·보조금24와 동일: 공고 등록 48h 신선도, 접수 창=카드 만료, 조회수=실수요 정렬, 원문 외 수치 금지.

export interface BizinfoSeed {
  keyword: string;
  title: string;
  actionStart: string;
  actionEnd: string;
  views: number;
  newsContext: string;
}

const EP = "https://apis.data.go.kr/1421000/bizinfo/pblancBsnsService";

function pick(block: string, tag: string): string {
  const m = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`).exec(block);
  return (m?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchBizinfoSeeds(): Promise<BizinfoSeed[]> {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) throw new Error("DATA_GO_KR_KEY_MISSING");
  const res = await fetch(`${EP}?serviceKey=${encodeURIComponent(key)}&pageNo=1&numOfRows=80`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`BIZINFO_HTTP_${res.status}`);
  const xml = await res.text();
  const now = Date.now();
  const FRESH = 48 * 3600_000;
  const out: BizinfoSeed[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const b = m[1] ?? "";
    const name = pick(b, "pblancNm");
    const range = pick(b, "reqstBeginEndDe"); // "2026-07-01 ~ 2026-07-15"
    const created = pick(b, "creatPnttm");    // "2026-07-08 14:53:49"
    if (!name || !range || !created) continue;
    const rm = /(\d{4}-\d{2}-\d{2})\s*[~∼-]\s*(\d{4}-\d{2}-\d{2})/.exec(range);
    if (!rm) continue; // 접수 기간이 날짜 쌍이 아니면(예산 소진 시까지 등) 제외 — 행동 창 불명
    const [, start, end] = rm;
    const createdTs = Date.parse(`${created.replace(" ", "T")}+09:00`);
    if (!Number.isFinite(createdTs) || now - createdTs > FRESH) continue; // 공고 등록 48h 게이트
    if (Date.parse(`${end}T23:59:59+09:00`) < now) continue; // 마감 지난 것
    const region = pick(b, "jrsdInsttNm");
    // 기초지자체(구·군) 소관 제외 — 전국 검색 수요 없음(보조금24와 동일 규칙). 광역·중앙부처 허용
    if (/^[가-힣]{1,4}(구|군)$/.test(region)) continue;
    if (/[가-힣]{1,4}(구|군)(?![가-힣])/.test(name.replace(/\[[^\]]*\]/g, ""))) continue; // 공고명 속 구·군(실측: [인천] 서해구·[대전] 유성구 통과)
    const field = pick(b, "pldirSportRealmLclasCodeNm");
    const target = pick(b, "trgetNm");
    // ★독자 정합 게이트(유저 원칙: 많이 읽을 것만) — B2B 과제 공고는 기업 담당자 소수만 검색.
    //  대상 코드가 '소상공인'이거나 공고명에 일반인 검색어(소상공인·자영업·1인·전통시장)가 있는 것만.
    //  주의: '소기업' 패턴은 '중소기업'에 부분 매치(실측 — 로봇 실증이 통과했던 원인) — 정확값 비교로
    const audienceOk = target === "소상공인" || /(소상공인|자영업|1인\s?(기업|창업)|전통시장|골목상권)/.test(name);
    if (!audienceOk) continue;
    const url = pick(b, "pblancUrl");
    const summary = pick(b, "bsnsSumryCn").slice(0, 200);
    const shortName = name.replace(/^\d{4}년\s*/, "").replace(/\s*(참여기업|참여자)?\s*모집\s*공고.*$/, "").trim().slice(0, 30);
    const mmdd = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
    out.push({
      keyword: `${shortName} 신청`.slice(0, 40),
      title: `${shortName} 접수, ${mmdd(end!)} 마감`,
      actionStart: start!, actionEnd: end!,
      views: Number(pick(b, "inqireCo") || 0),
      newsContext: [
        `- [기업마당 공고 실데이터] ${name} | 소관 ${region} | 분야 ${field}${target ? ` | 대상 ${target}` : ""} | 접수 ${start}~${end} | 공고 등록 ${created.slice(0, 10)}${url ? ` | 공고문 ${url}` : ""}`,
        summary ? `- 사업 요약(원문): ${summary}` : "",
        `※ 지원 금액·조건은 위 원문 범위 안에서만 서술 — 원문에 없는 수치 추정 절대 금지. 정확한 기준은 '기업마당 공고문에서 확인'으로 안내한다.`,
      ].filter(Boolean).join("\n"),
    });
  }
  out.sort((a, b) => b.views - a.views || a.actionEnd.localeCompare(b.actionEnd));
  return out.slice(0, 5);
}
