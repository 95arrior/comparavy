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
