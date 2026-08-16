import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// 주소 → 좌표(위경도) 변환. 카카오 로컬 REST API 사용.
// KAKAO_REST_API_KEY 없거나 결과 없으면 {lat:null,lng:null} (주소는 좌표 없이도 저장되게 graceful).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 로그인 사용자만(남용 방지). 키는 서버에만 둔다.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ lat: null, lng: null, error: "로그인이 필요해요." }, { status: 401 });

  const query = new URL(request.url).searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ lat: null, lng: null });

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return NextResponse.json({ lat: null, lng: null, note: "KAKAO_REST_API_KEY 미설정 — 좌표 없이 주소만 저장돼요." });

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
      { headers: { Authorization: `KakaoAK ${key}` } },
    );
    if (!res.ok) return NextResponse.json({ lat: null, lng: null });
    const data = await res.json();
    const doc = data?.documents?.[0];
    if (!doc) return NextResponse.json({ lat: null, lng: null });
    // 카카오: x=경도(lng), y=위도(lat)
    const lat = Number(doc.y);
    const lng = Number(doc.x);
    return NextResponse.json({
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    });
  } catch {
    return NextResponse.json({ lat: null, lng: null });
  }
}
