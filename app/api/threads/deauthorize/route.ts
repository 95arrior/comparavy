import { NextResponse } from "next/server";

// 메타 요구: 사용자가 앱 승인을 취소할 때 메타가 호출(제거 콜백). 받기만 하면 됨.
export async function POST() {
  return NextResponse.json({ ok: true });
}
export async function GET() {
  return NextResponse.json({ ok: true });
}
