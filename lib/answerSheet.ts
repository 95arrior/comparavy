// 답안지(크리에이터 어드바이저 '주제별 인기유입검색어') 붙여넣기 파서.
// 설계 근거: docs/answer-sheet-lane.md — 어제 실제로 블로그 유입을 만든 검색어(실측)를 씨앗 최상위 소스로 쓴다.
// 유저는 어드바이저 화면을 전체 복사해 그대로 붙여넣는다 — 여기서 검색어만 골라낸다(뇌빼기: 정리는 코드 몫).

/** 어드바이저 화면의 UI 문구(붙여넣기에 섞여 들어오는 것들) — 정확일치로 거른다. */
const CHROME_EXACT = new Set([
  "검색 유입 트렌드", "메인 유입 트렌드", "주제별 비교", "주제별 트렌드",
  "주제별 인기유입검색어", "성별,연령별 인기유입검색어", "성별, 연령별 인기유입검색어",
  "유입순 보기", "설정순 보기", "비즈니스·경제", "비즈니스-경제", "통계", "일간현황 : 순위",
]);

/** 포함만 돼도 UI 안내문인 패턴(문장형 안내·날짜·순위표 머리말). */
const CHROME_PARTIAL = [
  /블로그 게시글로 유입/, /클립.?\s*콘텐츠로 유입/, /제공합니다/, /포함하지 않습니다/,
  /^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.?$/, /게시물 조회수 순위/, /^순위$/, /^제목$/, /^조회수$/, /^타입$/, /^글$/,
];

/** 순위 변동 마커·순수 숫자만 있는 줄. */
const MARKER_ONLY = /^(?:new|-|▲\s*\d+|▼\s*\d+|\d+(?:위)?)$/i;

/** 키워드 꼬리에 붙어 온 변동 마커 제거("민생지원금 ▲5" → "민생지원금"). */
function stripMarkers(line: string): string {
  return line
    .replace(/\s*(?:▲|▼)\s*\d+\s*$/g, "")
    .replace(/\s+new\s*$/i, "")
    .replace(/\s+-\s*$/g, "")
    .replace(/^\d+\s*위\s+/, "")
    .trim();
}

/**
 * 붙여넣기 원문 → 검색어 후보 목록(등장 순서 = 어드바이저 유입순 = 수요 순).
 * ★쉼표 포함 줄은 뉴스 헤드라인형("서장훈, 서초 건물 450억 매물로")이라 후보에서 뺀다 —
 *  검색어가 아니라 기사 제목이고, 순간형 뉴스는 이 레인이 버리기로 한 유형이다.
 */
export function parseAnswerSheet(text: string): { keywords: string[]; droppedNewsy: string[] } {
  const keywords: string[] = [];
  const droppedNewsy: string[] = [];
  const seen = new Set<string>();
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || MARKER_ONLY.test(line)) continue;
    if (CHROME_EXACT.has(line)) continue;
    if (CHROME_PARTIAL.some((re) => re.test(line))) continue;
    line = stripMarkers(line);
    if (line.length < 2 || line.length > 40) continue;
    if (!/[가-힣a-zA-Z]/.test(line)) continue;
    const key = line.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (line.includes(",")) { droppedNewsy.push(line); continue; }
    keywords.push(line);
    if (keywords.length >= 30) break;
  }
  return { keywords, droppedNewsy };
}

/** 어제까지의 기록에서 이 키워드가 며칠 등장했는지(오늘 포함 안 함 — 호출측이 +1 해서 'N일째'로 쓴다). */
export function daysSeenIn(keyword: string, history: { date: string; keywords: string[] }[]): number {
  const key = keyword.replace(/\s+/g, " ").toLowerCase();
  let days = 0;
  for (const day of history) {
    if ((day.keywords ?? []).some((k) => String(k).replace(/\s+/g, " ").toLowerCase() === key)) days += 1;
  }
  return days;
}
