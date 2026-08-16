"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

/** 로그아웃 후 홈(로그아웃 상태면 랜딩)으로 이동. */
export default function LogoutButton({ className = "" }: { className?: string }) {
  async function out() {
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {
      // 무시
    }
    window.location.href = "/";
  }
  return (
    <button onClick={out} className={className}>
      로그아웃
    </button>
  );
}
