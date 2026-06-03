import type { Metadata } from "next";
import OnlineSalesSetupDiagnostic from "@/components/assembly/OnlineSalesSetupDiagnostic";
import ProductChatAssembly from "@/components/product/ProductChatAssembly";
import { getKitBySlug, getKitCtaHref, kitHasCheckout } from "@/data/kits";

const KIT_SLUG = "online-sales-setup-kit";
const kit = getKitBySlug(KIT_SLUG);

if (!kit) {
  throw new Error("AI 온라인 영업 세팅 키트 data is missing.");
}

const kitCtaHref = getKitCtaHref(kit);
const hasKitCheckout = kitHasCheckout(kit);

export const metadata: Metadata = {
  title: "온라인 영업 세팅 진단 | AteFlo Kit Studio",
  description:
    "업종, 채널, 목표, 지역 맥락을 바탕으로 지금 먼저 챙기면 좋은 온라인 영업 세팅 3가지를 확인하세요.",
};

export const revalidate = 0;

export default function OnlineSalesSetupAssemblyPage() {
  return (
    <ProductChatAssembly>
      <OnlineSalesSetupDiagnostic
        ctaHref={kitCtaHref}
        hasCheckout={hasKitCheckout}
      />
    </ProductChatAssembly>
  );
}
