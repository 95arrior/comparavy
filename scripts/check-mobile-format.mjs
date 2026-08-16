// 모바일(390px) 문단 줄 수 검사 — 6줄 초과 문단이 0개여야 통과.
//   실행: npx tsx scripts/check-mobile-format.mjs
// 390px 프레임(좌우 패딩 20px씩 = 본문폭 350px), 본문 15px 기준 한글 폭 약 15px -> 줄당 약 23자.
const CHARS_PER_LINE = 23;
const MAX_LINES = 4; // 중앙정렬·짧은문단 전제로 강화

// 샘플: 규칙 준수 글(짧은 문단) vs 위반 글(벽돌 문단)
const good = `<h2>청년 지원금, 이번에 확대됐어요</h2>
<p>이번 달부터 대상이 넓어졌어요.</p>
<p>월 소득 기준이 완화됐거든요.</p>
<p>그래서 지금 다시 확인해볼 만해요.</p>
<h2>누가 받을 수 있나요</h2>
<p>만 19세부터 34세까지가 기본이에요.</p>
<p>소득 구간에 따라 금액이 달라져요.</p>`;

const bad = `<h2>청년 지원금 총정리</h2>
<p>청년 지원금은 정부가 청년의 자산 형성을 돕기 위해 만든 제도로 매월 일정 금액을 납입하면 정부가 소득 구간에 따라 기여금을 더해주고 만기에 목돈을 받을 수 있는 구조인데 올해부터는 대상 소득 기준이 완화되고 기여금 비율도 조정되어 더 많은 사람이 혜택을 받을 수 있게 바뀌었기 때문에 기존에 신청을 못 했던 분들도 이번 기회에 자격을 다시 확인해보는 것이 좋습니다.</p>`;

function lineCountPerParagraph(html) {
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
  );
  return paras.map((t) => ({ text: t.slice(0, 30), lines: Math.max(1, Math.ceil(t.length / CHARS_PER_LINE)) }));
}

function check(name, html) {
  const rows = lineCountPerParagraph(html);
  const over = rows.filter((r) => r.lines > MAX_LINES);
  console.log(`\n[${name}] 문단 ${rows.length}개, 최대 ${Math.max(...rows.map((r) => r.lines))}줄`);
  rows.forEach((r) => console.log(`   ${r.lines}줄  ${r.text}...`));
  console.log(over.length === 0 ? "  통과 (4줄 초과 0개)" : `  실패 (4줄 초과 ${over.length}개)`);
  return over.length === 0;
}

const p1 = check("규칙 준수 글", good);
const p2 = check("벽돌 글(위반 예시)", bad);
console.log(`\n요약: 규칙준수=${p1 ? "통과" : "실패"}, 벽돌글=${p2 ? "통과" : "실패(정상 — 위반이 잡혀야 함)"}`);
// 규칙 준수 글은 통과, 벽돌 글은 잡혀야(=실패) 정상. 스크립트 자체 검증.
process.exit(p1 && !p2 ? 0 : 1);
