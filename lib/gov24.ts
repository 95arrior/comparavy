// ★보조금24 수확기(2026-07-09 유저 승인 2단계) — 행안부 공공서비스(혜택) API 실호출 검증 완료.
//  원칙: 신청기한에 '기간 패턴'이 파싱되는 것만(상시신청 제외 — 행동 창이 없는 제도는 트렌드 부적합, 유저 확정).
//  신뢰 원칙: 표시값은 API 실값만. 금액·조건은 API의 지원내용 원문만 전달(추정 생성 금지).

export interface Gov24Seed {
  keyword: string;
  title: string;
  actionStart: string; // YYYY-MM-DD
  actionEnd: string;
  views: number;
  newsContext: string;
}

const EP = "https://api.odcloud.kr/api/gov24/v3/serviceList";

/** 신청기한 자유 텍스트에서 기간 후보들을 뽑아, 지금 유효한(마감 전) 창 하나를 고른다. */
export function parseApplyWindow(text: string, now = new Date()): { start: string; end: string } | null {
  const t = (text || "").replace(/\s+/g, " ");
  if (!t || /상시|연중|수시/.test(t.slice(0, 30)) && !/\d{1,2}\s*\./.test(t)) return null;
  const year = now.getFullYear();
  const windows: { s: Date; e: Date }[] = [];
  // 패턴: "5.1.~5.31." / "9. 1 ~ 9. 15" / "7월 1일~7월 31일" (연도 명시형 "2026.7.1" 포함)
  const re = /(?:(\d{4})\s*\.\s*)?(\d{1,2})\s*[.월]\s*(\d{1,2})\s*[일.]?\s*[~∼-]\s*(?:(\d{4})\s*\.\s*)?(\d{1,2})\s*[.월]\s*(\d{1,2})\s*[일.]?/g;
  for (const m of t.matchAll(re)) {
    const y1 = m[1] ? Number(m[1]) : year;
    const y2 = m[4] ? Number(m[4]) : y1;
    const s = new Date(`${y1}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}T00:00:00+09:00`);
    const e = new Date(`${y2}-${String(Number(m[5])).padStart(2, "0")}-${String(Number(m[6])).padStart(2, "0")}T23:59:59+09:00`);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e.getTime() >= s.getTime()) windows.push({ s, e });
  }
  if (windows.length === 0) return null;
  // 지금 유효(마감 전)한 창 중 가장 이른 것 — 전부 지났으면 없음
  const alive = windows.filter((w) => w.e.getTime() >= now.getTime()).sort((a, b) => a.s.getTime() - b.s.getTime());
  const pick = alive[0];
  if (!pick) return null;
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(pick.s), end: fmt(pick.e) };
}

type Row = Record<string, unknown>;

export async function fetchGov24Seeds(): Promise<Gov24Seed[]> {
  const key = process.env.DATA_GO_KR_KEY;
  if (!key) throw new Error("DATA_GO_KR_KEY_MISSING");
  const now = new Date();
  const soon = now.getTime() + 14 * 86400_000; // 시작 2주 전부터 선점 가치
  const out: Gov24Seed[] = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`${EP}?page=${page}&perPage=500&serviceKey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`GOV24_HTTP_${res.status}`);
    const data = (await res.json()) as { data?: Row[] };
    for (const r of data.data ?? []) {
      const name = String(r["서비스명"] ?? "").trim();
      const period = String(r["신청기한"] ?? "").trim();
      if (!name || !period) continue;
      const win = parseApplyWindow(period, now);
      if (!win) continue; // 상시·기간 없음 — 제외(유저 확정)
      const startTs = new Date(`${win.start}T00:00:00+09:00`).getTime();
      if (startTs > soon) continue; // 아직 먼 창 — 다음 스캔에서
      // ★사실상 상시 게이트 — 창이 60일 초과면 '기간제'가 아니라 상시에 가깝다(문화누리카드 2~11월 실측). 단 마감 D-21 이내면 마감 훅 가치로 허용
      const endTs = new Date(`${win.end}T23:59:59+09:00`).getTime();
      const spanDays = (endTs - startTs) / 86400_000;
      const dLeft = (endTs - now.getTime()) / 86400_000;
      if (spanDays > 60 && dLeft > 21) continue;
      // ★기초지자체(구·군) 제외 — 해당 주민만 대상이라 전국 검색 수요 없음(강서구 실측). 시·도 광역은 허용(서울시 출산가구 720만 실증)
      if (/[가-힣]{1,4}(구|군)(?![가-힣])/.test(name)) continue; // 이름 어디든 구·군(실측: 앞머리 앵커라 [인천] 서해구 통과하던 구멍)
      const started = startTs <= now.getTime();
      const mmdd = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
      const summary = String(r["지원내용"] ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
      const target = String(r["지원대상"] ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
      const link = String(r["상세조회URL"] ?? "").trim();
      out.push({
        keyword: `${name.slice(0, 24)} 신청`,
        title: started ? `${name.slice(0, 28)} 신청, ${mmdd(win.end)} 마감` : `${name.slice(0, 28)}, ${mmdd(win.start)}부터 신청`,
        actionStart: win.start, actionEnd: win.end,
        views: Number(r["조회수"] ?? 0),
        newsContext: [
          `- [보조금24 실데이터] ${name} | 신청기한 원문: ${period.slice(0, 120)} | 접수 ${win.start}~${win.end}${target ? ` | 대상: ${target}` : ""}${link ? ` | 상세: ${link}` : ""}`,
          summary ? `- 지원내용(원문): ${summary}` : "",
          `※ 금액·조건은 위 원문 범위 안에서만 서술 — 원문에 없는 수치 추정 절대 금지. 정확한 기준은 '보조금24에서 확인'으로 안내한다.`,
        ].filter(Boolean).join("\n"),
      });
    }
  }
  // 수요(조회수) 상위 우선 — 같은 창이면 마감 임박 우선
  out.sort((a, b) => b.views - a.views || a.actionEnd.localeCompare(b.actionEnd));
  return out.slice(0, 6);
}
