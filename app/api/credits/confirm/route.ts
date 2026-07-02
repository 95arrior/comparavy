import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { confirmPayment } from "@/lib/toss";
import { addCredits } from "@/lib/credits";
import { packByKey } from "@/lib/creditPacks";

// 크레딧 팩 단건 결제 승인 — 흐름: 결제창(클라) → successUrl → 이 라우트에서 토스 최종 승인 → 크레딧 지급.
// 안전장치: ①금액은 쿼리를 믿지 않고 orderId에 박힌 팩 정의로 재계산 ②지급은 add_credits 멱등(ref=orderId, 중복 승인/재시도에도 1회만).

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const paymentKey = String(body.paymentKey ?? "").trim();
  const orderId = String(body.orderId ?? "").trim();
  const amount = Number(body.amount);
  if (!paymentKey || !orderId || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "결제 정보가 올바르지 않아요." }, { status: 400 });
  }

  // orderId 규격: crd_{packKey}_{uid8}_{random} — 팩·주문자 검증의 단일 근거
  const m = /^crd_([a-z]+)_([a-f0-9]{8})_[A-Za-z0-9]+$/.exec(orderId);
  const pack = m ? packByKey(m[1]) : undefined;
  if (!pack) return NextResponse.json({ error: "알 수 없는 상품이에요." }, { status: 400 });
  if (m![2] !== user.id.replace(/-/g, "").slice(0, 8)) {
    return NextResponse.json({ error: "주문자 정보가 일치하지 않아요." }, { status: 403 });
  }
  // ★금액 검증 — 정가 또는 할인가만 허용. 다르면 승인 자체를 거부(변조 차단).
  const validAmounts = [pack.price, ...(pack.salePrice ? [pack.salePrice] : [])];
  if (!validAmounts.includes(amount)) {
    return NextResponse.json({ error: "결제 금액이 상품 가격과 달라요." }, { status: 400 });
  }

  try {
    const result = await confirmPayment({ paymentKey, orderId, amount });
    if (result.status !== "DONE") {
      return NextResponse.json({ error: "결제가 완료되지 않았어요." }, { status: 402 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "결제 승인에 실패했어요.";
    return NextResponse.json({ error: msg }, { status: 402 });
  }

  // 지급 — 멱등(ref=orderId): 새로고침·중복 호출에도 1회만 지급
  const balance = await addCredits(user.id, pack.credits, "purchase", orderId);
  if (balance === null) {
    // 이미 지급된 주문(멱등 충돌) 또는 일시 오류 — 잔액 재조회로 구분 없이 현재 잔액 반환
    const { data } = await supabase.from("users").select("credits").eq("id", user.id).single();
    return NextResponse.json({ ok: true, credits: data?.credits ?? 0, already: true });
  }
  return NextResponse.json({ ok: true, credits: balance, pack: pack.key });
}
