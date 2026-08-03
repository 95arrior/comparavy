// ★증식 진단 전용 주소(2026-08-04 유저 요청) — /api/topics?debug=1은 증식·홈판 LLM을 다 돌려
//  60초를 넘겨 504가 난다(유저 실측). 진단만 보려고 생성 파이프 전체를 돌릴 이유가 없다.
//  ★여기는 저장된 값을 읽기만 한다 — LLM 호출 0, 즉시 응답.
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createSupabaseAdminClient();
  const { data } = await db.from("api_cache").select("value").eq("key", "diag:amp-funnel").maybeSingle();
  const v = (data?.value ?? null) as null | {
    seeds: number; want: number; briefs: number; parsed: number; out: number; at?: string;
    drop: { placeholder: number; noBrief: number; dupKeyword: number; orphan: number; titleTail: number };
  };
  if (!v) {
    return NextResponse.json({
      상태: "아직 기록 없음",
      안내: "글감을 한 번 새로 받으면(트렌드 증식이 돌면) 여기에 기록됩니다. 캐시가 살아 있으면 증식이 안 돌 수 있어요.",
    });
  }

  const 손실 = v.want - v.out;
  return NextResponse.json({
    잰시각: v.at ?? null,
    흐름: `씨앗 ${v.seeds} → 요청 ${v.want} → 브리프 ${v.briefs} → 모델 반환 ${v.parsed} → 카드 ${v.out}`,
    잃은수: 손실,
    탈락사유: {
      "자리표시(OO만원 류)": v.drop.placeholder,
      "브리프 없음": v.drop.noBrief,
      "키워드 중복": v.drop.dupKeyword,
      "혈통 미상(씨앗 못 찾음)": v.drop.orphan,
      "제목 규격 미달": v.drop.titleTail,
    },
    // ★어디를 봐야 하는지까지 적어 준다 — 숫자만 주면 다시 물어봐야 한다
    해석: v.parsed < v.briefs
      ? `모델이 ${v.briefs}개 요청에 ${v.parsed}개만 반환했다 — 출력이 잘렸거나 모델이 스스로 줄인 것이다. max_tokens·배치 크기를 본다.`
      : 손실 > v.want * 0.5
      ? "탈락 사유 중 가장 큰 항목이 병목이다 — 그 게이트의 문턱을 실측으로 조정한다."
      : "증식 손실은 크지 않다 — 병목은 그 다음(수요컷·게이트·밴드)에 있다.",
  });
}
