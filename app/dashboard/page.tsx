import { redirect } from "next/navigation";

// 대시보드는 홈(작업공간)으로 흡수됨 — 기존 링크·로그인 콜백 호환용 리다이렉트
export default function DashboardPage() {
  redirect("/");
}
