"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { SITE_NAME } from "@/lib/site";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError("구글 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setLoading(false);
    if (error) {
      setError("로그인 링크를 보내지 못했습니다. 이메일 주소를 확인해 주세요.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-neutral-900 antialiased">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-lg font-semibold tracking-tight">
          {SITE_NAME}
        </Link>
        <h1 className="mt-8 text-center text-2xl font-semibold tracking-tight">로그인 또는 회원가입</h1>
        <p className="mt-2 text-center text-sm text-neutral-500">
          무료로 시작하세요. 카드 등록이 필요 없습니다.
        </p>

        <button
          onClick={signInWithGoogle}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium transition hover:border-neutral-900"
        >
          구글로 계속하기
        </button>

        <div className="my-6 flex items-center gap-4 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          또는 이메일로
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        {sent ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <strong>{email}</strong> 으로 로그인 링크를 보냈습니다. 메일함을 확인해 주세요.
          </p>
        ) : (
          <form onSubmit={signInWithEmail} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-full border border-neutral-300 px-5 py-3 text-sm outline-none transition focus:border-neutral-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {loading ? "보내는 중…" : "로그인 링크 받기"}
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

        <p className="mt-8 text-center text-xs text-neutral-400">
          계속 진행하면 <Link href="/terms" className="underline">이용약관</Link> 및{" "}
          <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
