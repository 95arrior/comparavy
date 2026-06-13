import BillingSuccess from "@/components/BillingSuccess";

export const dynamic = "force-dynamic";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ authKey?: string; customerKey?: string }>;
}) {
  const { authKey, customerKey } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-neutral-900 antialiased">
      <BillingSuccess authKey={authKey ?? null} customerKey={customerKey ?? null} />
    </div>
  );
}
