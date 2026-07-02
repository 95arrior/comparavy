import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import Brand from "@/components/Brand";
import PricingClient from "@/components/PricingClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "크레딧 충전" };

export default async function PricingPage() {
  let loggedIn = false;
  let userIdFragment: string | null = null;
  let email = "";
  let credits = 0;

  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      loggedIn = true;
      email = user.email ?? "";
      userIdFragment = user.id.replace(/-/g, "").slice(0, 8);
      await ensureUserRow(supabase, user.id);
      const { data: row } = await supabase.from("users").select("credits").eq("id", user.id).single();
      credits = row?.credits ?? 0;
    }
  }

  return (
    <div className="at-app-bg min-h-screen text-neutral-900 antialiased">
      <header>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/"><Brand /></Link>
          <Link href={loggedIn ? "/" : "/login"} className="text-sm text-neutral-500 transition hover:text-neutral-900">
            {loggedIn ? "내 작업공간" : "로그인"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-12 pb-24">
        <h1 className="at-rise text-center text-3xl font-extrabold tracking-tight">크레딧 충전</h1>
        <p className="at-rise at-d1 mt-2 text-center text-neutral-500">필요한 만큼만, 1회 결제로.</p>
        <Suspense>
          <PricingClient loggedIn={loggedIn} userIdFragment={userIdFragment} email={email} credits={credits} />
        </Suspense>
      </main>
    </div>
  );
}
