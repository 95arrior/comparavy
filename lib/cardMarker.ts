// ★구조화 정보 카드 마커 파서(2026-07-08 유저 승인) — [카드: 유형 | ...] → 템플릿 렌더 입력.
//  신뢰 원칙: 카드의 숫자는 본문 실값만 — verifyNumbersInBody가 본문 대조(없는 숫자 = 카드 거부).

export type CardSpec =
  | { kind: "stat"; title: string; value: string; label: string; subs: string[] }
  | { kind: "compare"; title: string; rows: { label: string; before: string; after: string }[] }
  | { kind: "composition"; title: string; items: { label: string; valueText: string; value: number }[] }
  | { kind: "checklist"; title: string; items: string[] };

const KIND_MAP: Record<string, CardSpec["kind"]> = { "수치": "stat", "비교": "compare", "구성": "composition", "체크": "checklist" };

export function parseCardMarker(desc: string): CardSpec | null {
  // desc = "수치 | 제목 | 값 | 라벨 | 보조..." (SLOT_RE가 잡은 [카드: ...] 내부)
  const parts = desc.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const kind = KIND_MAP[parts[0] ?? ""];
  if (!kind) return null;
  const title = (parts[1] ?? "").slice(0, 30);
  if (kind === "stat") {
    if (parts.length < 4) return null;
    return { kind, title, value: (parts[2] ?? "").slice(0, 14), label: (parts[3] ?? "").slice(0, 40), subs: parts.slice(4, 6).map((x) => x.slice(0, 44)) };
  }
  const body = parts.slice(2).join("|");
  const items = body.split(";").map((x) => x.trim()).filter(Boolean);
  if (items.length === 0) return null;
  if (kind === "compare") {
    const rows = items.map((it) => {
      const m = /^(.+?)=(.+?)(?:→|->)(.+)$/.exec(it);
      return m ? { label: (m[1] ?? "").trim().slice(0, 16), before: (m[2] ?? "").trim().slice(0, 18), after: (m[3] ?? "").trim().slice(0, 18) } : null;
    }).filter((x): x is NonNullable<typeof x> => !!x);
    return rows.length ? { kind, title, rows: rows.slice(0, 4) } : null;
  }
  if (kind === "composition") {
    const rows = items.map((it) => {
      const m = /^(.+?)=(.+)$/.exec(it);
      if (!m) return null;
      const valueText = (m[2] ?? "").trim().slice(0, 20);
      const num = parseFloat(valueText.replace(/[^0-9.]/g, ""));
      return { label: (m[1] ?? "").trim().slice(0, 16), valueText, value: Number.isFinite(num) ? num : 0 };
    }).filter((x): x is NonNullable<typeof x> => !!x);
    return rows.length ? { kind, title, items: rows.slice(0, 5) } : null;
  }
  return { kind: "checklist", title, items: items.map((x) => x.slice(0, 40)).slice(0, 6) };
}

/** 카드 숫자가 본문에 실재하는지 대조 — 본문에 없는 숫자가 하나라도 있으면 그 숫자 목록 반환(빈 배열 = 통과). */
export function verifyNumbersInBody(spec: CardSpec, bodyHtml: string): string[] {
  const bodyDigits = bodyHtml.replace(/<[^>]+>/g, " ").replace(/[,\s]/g, "");
  const texts: string[] = [];
  if (spec.kind === "stat") texts.push(spec.value, ...spec.subs);
  else if (spec.kind === "compare") for (const r of spec.rows) texts.push(r.before, r.after);
  else if (spec.kind === "composition") for (const i of spec.items) texts.push(i.valueText);
  else texts.push(...spec.items);
  const missing: string[] = [];
  for (const t of texts) {
    for (const num of t.match(/[0-9][0-9,.]*/g) ?? []) {
      const n = num.replace(/[,.]$/, "").replace(/,/g, "");
      if (n.length >= 2 && !bodyDigits.includes(n)) missing.push(num);
    }
  }
  return [...new Set(missing)];
}

/* ── 차트 마커(2026-07-09 유저 확정 — 숫자 무결성 최우선) ──
   형식: [차트: {"kind":"trend"|"bars","label":"주담대 연체율","unit":"%","points":[{"x":"25.3Q","y":"0.24"}],"conclusion":"...","source_sentence":"..."}]
   또는 bars: {"kind":"bars","label":...,"series":["규제 전","2단계"],"groups":[{"label":"소득 5천","values":["6억","4.5억"]}]}
   원칙: 렌더러는 이 JSON을 그대로 그린다(중간 AI 재서술 금지), y·values는 본문 원문 문자열 그대로(반올림·단위 변환 금지). */
export type ChartSpec =
  | { kind: "trend"; label: string; unit?: string; points: { x: string; y: string }[]; conclusion?: string; source_sentence?: string }
  | { kind: "bars"; label: string; unit?: string; series: string[]; groups: { label: string; values: string[] }[]; source_sentence?: string };

export function parseChartMarker(desc: string): ChartSpec | null {
  // ★평탄 포맷(정식 — JSON의 ]가 슬롯 정규식과 충돌해 마커 잔해 노출, 실측):
  //   추이: "추이 | 라벨 | 단위 | 25.3Q=0.24 ; 25.4Q=0.28 ; 26.1Q=0.31 | 결론 | 근거문장"
  //   비교: "비교 | 라벨 | 단위 | 시리즈A, 시리즈B | 그룹1: 6억, 4.5억 ; 그룹2: 10억, 6억 | 근거문장"
  {
    const parts = desc.replace(/^\[?차트:?\s*/, "").split("|").map((x) => x.trim());
    if ((parts[0] === "추이" || parts[0] === "trend") && parts.length >= 4) {
      const points = (parts[3] ?? "").split(";").map((x) => x.trim()).map((x) => {
        const m = /^(.+?)=(.+)$/.exec(x);
        return m ? { x: (m[1] ?? "").trim().slice(0, 12), y: (m[2] ?? "").trim().slice(0, 14) } : null;
      }).filter((v): v is { x: string; y: string } => !!v).slice(0, 5);
      if (points.length >= 3) return { kind: "trend", label: (parts[1] ?? "").slice(0, 30), unit: (parts[2] ?? "").slice(0, 8) || undefined, points, conclusion: (parts[4] ?? "").slice(0, 40) || undefined, source_sentence: (parts[5] ?? "").slice(0, 200) || undefined };
    }
    if ((parts[0] === "비교" || parts[0] === "bars") && parts.length >= 5) {
      const series = (parts[3] ?? "").split(",").map((x) => x.trim().slice(0, 12)).filter(Boolean).slice(0, 3);
      const groups = (parts[4] ?? "").split(";").map((x) => x.trim()).map((g) => {
        const m = /^(.+?):(.+)$/.exec(g);
        return m ? { label: (m[1] ?? "").trim().slice(0, 12), values: (m[2] ?? "").split(",").map((v) => v.trim().slice(0, 14)).filter(Boolean).slice(0, 3) } : null;
      }).filter((v): v is { label: string; values: string[] } => !!v && v.values.length > 0).slice(0, 3);
      if (groups.length >= 2 && series.length > 0) return { kind: "bars", label: (parts[1] ?? "").slice(0, 30), unit: (parts[2] ?? "").slice(0, 8) || undefined, series, groups, source_sentence: (parts[5] ?? "").slice(0, 200) || undefined };
    }
  }
  const jstart = desc.indexOf("{");
  if (jstart < 0) return null;
  try {
    const o = JSON.parse(desc.slice(jstart)) as Record<string, unknown>;
    if (o.kind === "trend" && Array.isArray(o.points)) {
      const points = (o.points as { x?: unknown; y?: unknown }[]).map((p) => ({ x: String(p.x ?? "").slice(0, 12), y: String(p.y ?? "").slice(0, 14) })).filter((p) => p.x && p.y).slice(0, 5);
      if (points.length < 3) return null;
      return { kind: "trend", label: String(o.label ?? "").slice(0, 30), unit: o.unit ? String(o.unit).slice(0, 8) : undefined, points, conclusion: o.conclusion ? String(o.conclusion).slice(0, 40) : undefined, source_sentence: o.source_sentence ? String(o.source_sentence).slice(0, 200) : undefined };
    }
    if (o.kind === "bars" && Array.isArray(o.groups)) {
      const series = (Array.isArray(o.series) ? o.series : []).map((x) => String(x).slice(0, 12)).slice(0, 3);
      const groups = (o.groups as { label?: unknown; values?: unknown }[]).map((g) => ({ label: String(g.label ?? "").slice(0, 12), values: (Array.isArray(g.values) ? g.values : []).map((v) => String(v).slice(0, 14)).slice(0, 3) })).filter((g) => g.label && g.values.length > 0).slice(0, 3);
      if (groups.length < 2 || series.length === 0) return null;
      return { kind: "bars", label: String(o.label ?? "").slice(0, 30), unit: o.unit ? String(o.unit).slice(0, 8) : undefined, series, groups, source_sentence: o.source_sentence ? String(o.source_sentence).slice(0, 200) : undefined };
    }
    return null;
  } catch { return null; }
}

/** 차트 수치 역검증 — 모든 수치가 본문에 '문자열 그대로' 존재해야(반올림·변환은 오류 지점 — 유저 확정). 불일치 목록 반환. */
export function verifyChartNumbers(spec: ChartSpec, bodyHtml: string): string[] {
  const bodyDigits = bodyHtml.replace(/<[^>]+>/g, " ").replace(/[,\s]/g, "");
  const texts: string[] = spec.kind === "trend" ? spec.points.map((p) => p.y) : spec.groups.flatMap((g) => g.values);
  const missing: string[] = [];
  for (const t of texts) {
    const n = t.replace(/[,\s]/g, "").replace(/[^0-9.억조만%~+-]/g, "");
    const core = n.match(/[0-9][0-9.]*/)?.[0] ?? "";
    if (core && !bodyDigits.includes(core)) missing.push(t);
  }
  return [...new Set(missing)];
}
