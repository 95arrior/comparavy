import { redirect } from "next/navigation";

// 관리자 화면은 홈(연구소) 사이드바의 '관리' 탭으로 일원화됨.
// /admin 단독 페이지는 중복이라 제거 — 옛 링크 호환용으로 홈으로 리다이렉트.
export default function AdminPage() {
  redirect("/");
}
