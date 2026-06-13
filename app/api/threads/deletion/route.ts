import { NextResponse } from "next/server";

// 메타 요구: 데이터 삭제 요청 콜백. 메타 스펙대로 { url, confirmation_code } 반환.
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const code = `del_${Date.now().toString(36)}`;
  return NextResponse.json({ url: `${origin}/api/threads/deletion?code=${code}`, confirmation_code: code });
}

// 사용자가 삭제 상태를 확인하는 페이지(코드와 함께 접근)
export async function GET() {
  return NextResponse.json({ ok: true, message: "데이터 삭제 요청이 접수되어 처리됩니다." });
}
