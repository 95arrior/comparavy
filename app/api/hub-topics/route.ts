// ★허브 글감 배정(2026-07-29 유저 요청) — 유입 검색어를 붙여넣으면 뭉친 주제를 찾아 '허브 글감'을 제안한다.
//  네이버는 서치콘솔 같은 API가 없어 유입 검색어를 자동으로 못 가져온다 → 붙여넣기 1회가 입력.
//  판정(클러스터링)은 코드가, 제목 짓기는 LLM이, 최종 검문은 기존 finalGate가 한다(게이트 중앙화 원칙).
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { parseQueryText, clusterQueries, type HubCluster } from "@/lib/hubTopics";
import { finalGate } from "@/lib/cardFinalGate";
import { nearDuplicate } from "@/lib/diversity";
import { logUsage } from "@/lib/usageLog";

export const maxDuration = 120;

interface HubTopic { core: string; keyword: string; title: string; why: string; queries: string[]; share: number }

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const text = String(body.text ?? "");
  if (!text.trim()) return NextResponse.json({ error: "유입 검색어를 붙여넣어 주세요." }, { status: 400 });

  const rows = parseQueryText(text);
  if (rows.length < 3) return NextResponse.json({ error: "검색어가 너무 적어요. 한 줄에 하나씩, 여러 개 붙여넣어 주세요." }, { status: 400 });
  const clusters = clusterQueries(rows, 3).slice(0, 5);
  if (clusters.length === 0) {
    return NextResponse.json({ clusters: [], topics: [], note: "아직 한 주제로 뭉친 검색어가 없어요. 롱테일이 3개 이상 겹치면 허브를 세울 때예요." });
  }

  // 이미 쓴 글과 겹치는 허브는 제안하지 않는다(중복 글 절대 금지 원칙)
  const { data: mine } = await supabase.from("articles").select("keyword, title").eq("user_id", user.id).limit(300);
  const written = (mine ?? []).map((a) => `${a.keyword ?? ""} ${a.title ?? ""}`.trim());

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ clusters, topics: [] });

  let topics: HubTopic[] = [];
  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 1200,
      messages: [{ role: "user", content: [
        `블로그의 '유입 검색어'를 주제별로 묶었다. 각 묶음은 이 블로그가 그 주제의 롱테일(꼬리 질문)을 이미 여러 개 먹고 있다는 뜻이다.`,
        `할 일: 묶음마다 '허브 글감' 1개를 제안하라. 허브 글이란 그 주제의 꼬리 질문들을 한 글에서 전부 받아내는 상위 글이다 —`,
        `꼬리 글들이 내부링크로 이 허브를 밀어주면 머리 키워드로 올라간다.`,
        `규칙: ①keyword는 그 주제의 '머리 키워드'(꼬리 질문이 아니라 사람들이 가장 많이 치는 상위 검색어, 2~5어절)`,
        `②title은 꼬리 질문들을 한 글이 다 답한다는 게 보이는 제목(20~35자, 과장·낚시·총정리류 금지)`,
        `③why는 왜 이 묶음이 허브를 세울 때인지 한 문장(근거는 아래 꼬리 질문에서만)`,
        `④지어내지 마라 — 묶음에 없는 주제로 확장 금지.`,
        clusters.map((c, i) => `[${i}] 핵심어 "${c.core}" · 꼬리 질문 ${c.queries.length}개: ${c.queries.slice(0, 12).join(" / ")}`).join("\n"),
        `출력: JSON 배열 한 줄만. [{"i":0,"keyword":"...","title":"...","why":"..."}]`,
      ].join("\n") }],
    });
    void logUsage({ userId: user.id, model: "claude-sonnet-4-6", kind: "hub_topics", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const t = res.content.find((b) => b.type === "text")?.text ?? "[]";
    const arr = JSON.parse(/\[[\s\S]*\]/.exec(t)?.[0] ?? "[]") as { i?: number; keyword?: string; title?: string; why?: string }[];
    topics = arr
      .map((x) => {
        const c: HubCluster | undefined = clusters[Number(x.i ?? -1)];
        if (!c || !x.keyword || !x.title) return null;
        return { core: c.core, keyword: String(x.keyword).trim(), title: String(x.title).trim(), why: String(x.why ?? "").trim(), queries: c.queries, share: c.share };
      })
      .filter((x): x is HubTopic => !!x);
  } catch { /* LLM 실패 — 클러스터만 반환(유저가 직접 판단) */ }

  // ★최종 검문 — 글감 게이트(중앙화) + 이미 쓴 글과 근접 중복 배제
  const gate = finalGate(topics.map((t) => ({ keyword: t.keyword, title: t.title })));
  const dropped = new Set(gate.drops.map((d) => d.keyword));
  const passed = topics
    .filter((t) => !dropped.has(t.keyword))
    .filter((t) => !written.some((w) => nearDuplicate(`${t.keyword} ${t.title}`, w)));

  return NextResponse.json({ clusters, topics: passed, dropped: gate.drops });
}
