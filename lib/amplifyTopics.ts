import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usageLog";
import type { TrendTopic } from "./trendTopics";


// ★트렌드 씨앗 × 개인화 증식 — 유한한 씨앗을 유저 데이터로 곱해 1만 명 무중복.
//  스케일: 검증(momentum·gap)은 씨앗 층(공유·크론)에서 끝났고, 증식은 그 안전성을 '상속'받는다
//  (저경쟁 씨앗의 롱테일은 더 저경쟁 → 유저별 네이버 API 재호출 불필요 = 쿼터 안전).
//  최신성: 씨앗의 시의성 코어 단어를 반드시 보존(홈판 노출 생명선).

export interface AmplifiedTopic {
  keyword: string;
  title: string;
  newsContext: string | null; // 씨앗에서 상속(최신성 근거)
}

// FNV — userId → 결정적 난수(같은 유저 같은 날 같은 결과, 유저 간 상이)
function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// 개인화에 쓰는 프로필 필드(부분 select 허용)
export interface AmplifyProfile {
  sub_category?: string | null;
  audience?: string[] | null;
  target?: string | null;
  biz_address?: string | null;
}

// 온보딩 데이터 → 개인화 축 문자열(우리 데이터 해자)
function userAxis(profile: AmplifyProfile | null): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.sub_category) parts.push(`세부 주제: ${profile.sub_category}`);
  const aud = Array.isArray(profile.audience) ? profile.audience.filter((a) => a && a !== "전체") : [];
  if (aud.length) parts.push(`대상 독자: ${aud.join("·")}`);
  if (profile.target) parts.push(`타깃: ${profile.target}`);
  if (profile.biz_address) {
    // 시/구 단위만(개인정보 최소)
    const region = String(profile.biz_address).split(/\s+/).slice(0, 2).join(" ");
    if (region) parts.push(`지역: ${region}`);
  }
  return parts.join(" / ");
}

/**
 * 신선·검증된 씨앗들 × 유저 개인화 → 무중복 글감 N개.
 * 씨앗의 시의성 코어를 보존하면서 유저 관점으로 각도를 튼다. 실패 시 [].
 */
export async function amplifyForUser(
  seeds: TrendTopic[],
  profile: AmplifyProfile | null,
  userId: string,
  want = 3,
): Promise<AmplifiedTopic[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || seeds.length === 0) return [];

  const axis = userAxis(profile);
  // 유저별 씨앗 회전 — 같은 카테고리라도 유저마다 다른 씨앗 조합에서 출발
  const uh = fnv(userId + new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10));
  const rotated = [...seeds].sort((a, b) => (fnv(a.keyword + userId) % 997) - (fnv(b.keyword + userId) % 997));
  const picks = rotated.slice(0, Math.min(6, rotated.length));
  // 씨앗별 실검증 롱테일(자동완성 = 실제 검색어). 증식은 이 안에서만 keyword를 고른다(유령 키워드 차단).
  const seedList = picks.map((s, i) => {
    const lts = (s.longtails ?? []).map((l) => l.kw).slice(0, 6);
    const ltStr = lts.length ? ` / 실검증검색어=[${lts.join(", ")}]` : "";
    return `${i + 1}. 씨앗키워드="${s.keyword}" / 제목="${s.title}"${ltStr}`;
  }).join("\n");
  // 전체 롱테일 실존 집합(코드 검증용)
  const validLongtails = new Set<string>();
  for (const s of picks) for (const l of (s.longtails ?? [])) validLongtails.add(l.kw.replace(/\s+/g, ""));

  const client = new Anthropic({ apiKey });
  const prompt = `아래는 '지금 뜨는' 트렌드 씨앗들이다. 이 블로그 운영자에게 맞춘 글감 ${want}개를 만들어라.

★keyword는 반드시 각 씨앗의 '실검증검색어' 목록 안에서 그대로 골라 쓴다(새 검색어를 지어내지 않는다 — 아무도 안 치는 유령 키워드 방지). 실검증검색어가 없는 씨앗은 씨앗키워드를 쓴다.

[운영자 개인화 축]
${axis || "(일반)"}

[트렌드 씨앗 — 지금 뜨는 것]
${seedList}

★규칙(반드시):
- 각 글감은 씨앗 하나를 골라 운영자 축(대상·지역·타깃·세부주제)으로 각도를 튼다.
- ★씨앗의 '시의성 코어'(확대·개편·신설·인상·마감·2026·이번 등 '지금인 이유')는 제목에 반드시 살린다. 이걸 지우면 최신성이 죽는다.
- 서로 다른 씨앗/각도를 써서 ${want}개가 겹치지 않게.
- keyword=사람들이 실제 칠 검색어(롱테일 OK), title=클릭할 블로그 제목.
- 개인화 축이 비어 있으면(일반) 씨앗을 살짝 구체화만 한다.
- 다양성 시드값 ${uh % 100} 를 참고해 매번 다른 각도로.
- JSON 배열만: [{"keyword":"...","title":"...","seedIndex":1}]`;

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });
    void logUsage({ userId, model: "claude-haiku-4-5", kind: "amplify", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    const text = res.content[0]?.type === "text" ? res.content[0].text : "";
    const m = /\[[\s\S]*\]/.exec(text);
    if (!m) return [];
    const parsed = JSON.parse(m[0]) as { keyword?: string; title?: string; seedIndex?: number }[];
    const out: AmplifiedTopic[] = [];
    const seen = new Set<string>();
    for (const it of parsed) {
      let kw = (it.keyword ?? "").trim().slice(0, 60);
      const ti = (it.title ?? "").trim().slice(0, 80);
      if (!kw || !ti) continue;
      const seed = picks[(Number(it.seedIndex) || 1) - 1] ?? picks[0];
      // ★코드 검증 — LLM이 고른 keyword가 실검증 롱테일 풀에 없으면(지어냄) 씨앗의 실제 롱테일로 폴백.
      if (validLongtails.size > 0 && !validLongtails.has(kw.replace(/\s+/g, ""))) {
        const fallback = (seed?.longtails ?? []).find((l) => !seen.has(l.kw.replace(/\s+/g, "")));
        kw = fallback ? fallback.kw : (seed?.keyword ?? kw);
      }
      const nk = kw.replace(/\s+/g, "");
      if (seen.has(nk)) continue;
      seen.add(nk);
      out.push({ keyword: kw, title: ti, newsContext: seed?.newsContext ?? null });
      if (out.length >= want) break;
    }
    return out;
  } catch {
    return [];
  }
}
