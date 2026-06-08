"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isDisposableEmail } from "@/lib/disposableEmail";
import Brand from "@/components/Brand";

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
    if (isDisposableEmail(email)) {
      setError("일회용 이메일 주소는 사용할 수 없습니다. 사용 중인 이메일로 가입해 주세요.");
      return;
    }
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
        <Link href="/" className="flex justify-center">
          <Brand />
        </Link>
        <h1 className="mt-8 text-center text-2xl font-semibold tracking-tight">로그인 또는 회원가입</h1>
        <p className="mt-2 text-center text-sm text-neutral-500">
          무료로 시작하세요. 카드 등록이 필요 없습니다.
        </p>

        <button
          onClick={signInWithGoogle}
          className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium transition hover:border-neutral-900"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
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
