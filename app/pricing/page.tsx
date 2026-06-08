import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import Brand from "@/components/Brand";
import PricingClient from "@/components/PricingClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "요금" };

export default async function PricingPage() {
  let loggedIn = false;
  let currentPlan: "free" | "pro" = "free";
  let customerKey: string | null = null;
  let email = "";

  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      loggedIn = true;
      email = user.email ?? "";
      customerKey = `user_${user.id.replace(/-/g, "")}`;
      const row = await ensureUserRow(supabase, user.id);
      currentPlan = row.plan;
    }
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/"><Brand /></Link>
          <Link href={loggedIn ? "/" : "/login"} className="text-sm text-neutral-500 transition hover:text-neutral-900">
            {loggedIn ? "내 작업공간" : "로그인"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">요금제</h1>
        <p className="mt-3 text-center text-neutral-500">무료로 시작하고, 본격적으로 발행할 때 업그레이드하세요.</p>

        <PricingClient
          loggedIn={loggedIn}
          currentPlan={currentPlan}
          customerKey={customerKey}
          email={email}
        />
      </main>
    </div>
  );
}
