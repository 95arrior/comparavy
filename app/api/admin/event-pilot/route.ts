// ★사건 글 파일럿 주입(2026-08-07 유저: "ateflo의 글감으로 넣어주세요. 이렇게 해서는 안 돼요").
//
//  손으로 쓴 글을 채팅으로 건네는 방식은 기각됐다 — 파이프(게이트·마감·이미지·태그)를 하나도
//  안 거치기 때문이다. 사건 카드를 정식 글감 풀(trend_topics)에 넣어 평소 흐름 그대로 태운다:
//  글감 새로받기 → 카드 선택 → 생성 → 발행.
//
//  ★이 라우트는 파일럿 전용이다. 사건 3편+수요 1편의 정식 수확기는 사건 밀도 계측(3일)이
//   쌓인 뒤 컷과 함께 만든다 — 지금 자동화하면 '재보고 정한다'를 스스로 어기는 것이다.
//  ★카드 사실은 2026-08-07 아침 실보도에서만 가져왔다(네이버 뉴스 API 실측).
//   확정 안 된 것은 전부 '알려졌다' 전언으로 박았고, 본문 지시에도 단정 금지를 실었다.
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const CARD = {
  keyword: "부동산 공급대책",
  title: "그린벨트 풀리나… 오늘 오후 2시, 공급대책 윤곽 나온다는데",
  news_context: [
    "[사건 파일럿 — 2026-08-07 실보도만 사용. 아래에 없는 수치·날짜·지명은 절대 지어내지 마라]",
    "- 이재명 대통령이 8월 7일(오늘) 오후 2시 청와대에서 '부동산 정책 점검 2차 회의'를 비공개로 연다. 수도권 주택 공급 확대 방안을 점검한다.",
    "- 8월 3일 1차 회의는 7시간 넘게 진행됐다. 대통령 지시: \"가용한 주택 공급 물량을 최대한 확보하라\" + 기존 공급 대책 전면 재점검.",
    "- 청와대 공식 입장: \"구체적인 공급대책의 내용이나 발표 시기는 확정된 바 없다. 2차 회의 이후 후속 설명이 가능할 것.\"",
    "- 대책 뼈대 3축(★언론 보도로 '알려진' 것 — 전언형으로만 쓸 것): ①인허가 속도전 ②신규 택지 발굴 ③비아파트(빌라·오피스텔) 금융 지원. 비아파트는 청년·1인 가구 주거 사다리 구상.",
    "- 그린벨트: 과천경마장 부지는 해제 절차 진행 중, 용산 등 서울 쪽은 진통(보도). 발표는 '이달 중순께'로 알려짐(확정 아님).",
    "- LH 사장(8/6 간담회): 강남 LH 서울지역본부 부지를 청년 주거로 쓰겠다고 밝힘. '실거주 유예 확대' 언급도 보도됨.",
    "- 여당 일부: 세제 개편이 전월세 시장에 전가될 수 있다는 우려 제기(비거주 1주택자 이중부담 논의).",
    "★이 글의 임무: 뉴스 재방송이 아니라 '그래서 내 상황엔 무슨 일이 생기나'다. 사건은 입구 한 번만 — 본문은 제도 해석과 독자별 체크포인트로 채운다.",
    "★독자 조건 분기 필수: ①청약 준비 무주택자(신규 택지→청약 일정) ②청년·1인 가구(비아파트 금융 지원 조건) ③전월세 세입자(전가 우려·실거주 유예). 각각 '발표문에서 뭘 확인하면 되는지'까지.",
    "★용어는 첫 등장 직후 한 문장 통역: 인허가·그린벨트·비아파트.",
    "★주의 박스: '아직 확정된 것 없음(청와대 공식)'을 빨간 강조로 — 발표 전 소문만 보고 계약 등 큰 결정 금지.",
    "★마무리: 발표(이달 중순께로 알려짐)가 나오면 택지 위치·청약 일정·지원 조건을 다시 정리하겠다고 예고(후속 글 자리).",
    "★금지: 투자 판단 부추김(사라·팔아라·오른다·수익률), 확정 단정, 위 사실 목록에 없는 수치.",
  ].join("\n"),
};

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("blog_profiles")
    .select("vertical, sub_category").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const category = (prof as { sub_category?: string | null } | null)?.sub_category
    ?? (prof as { vertical?: string } | null)?.vertical ?? null;
  if (!category) return NextResponse.json({ error: "활성 블로그 프로필이 없다" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  // ★풀과 같은 모양으로(카테고리+키워드 유니크). 오늘 저녁이면 사건이 식으니 수명은 짧게 둔다.
  const { error } = await admin.from("trend_topics").upsert([{
    category,
    keyword: CARD.keyword,
    title: CARD.title,
    news_context: CARD.news_context,
    longtails: [],
    source: "event",
    created_at: new Date().toISOString(), // 방금 태어난 카드 — 신선도 정렬에서 맨 앞에 선다
    expires_at: new Date(Date.now() + 14 * 3600_000).toISOString(),
  }], { onConflict: "category,keyword" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    넣은곳: category,
    카드: CARD.title,
    다음: "앱에서 '글감 새로 받기'를 누르면 이 카드가 보드에 선다. 카드를 열어 평소처럼 생성·발행하면 된다.",
  });
}
