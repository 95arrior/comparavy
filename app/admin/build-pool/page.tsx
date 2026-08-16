import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { VERTICAL_SUBS } from "@/lib/verticalSubs";
import BuildPoolDriver from "./BuildPoolDriver";

export const metadata = { title: "키워드 풀 적재 (관리자)" };

// 관리자 전용 드라이버 페이지. 브라우저가 per-sub 라우트(/api/admin/build-pool)를
// sub 단위로 순차 호출 → 각 호출 단일 sub(~12초)라 Vercel 300초 타임아웃 무관.
export default async function BuildPoolPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/"); // 비관리자 차단

  return <BuildPoolDriver subsByVertical={VERTICAL_SUBS} />;
}
