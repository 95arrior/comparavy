import type { ReactNode } from "react";
import ProductShell from "@/components/product/ProductShell";

interface ProductChatAssemblyProps {
  readonly children: ReactNode;
}

export default function ProductChatAssembly({
  children,
}: ProductChatAssemblyProps) {
  return (
    <ProductShell maxWidth="4xl">
      <section className="py-3 sm:py-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-teal-700">
            AI 온라인 영업 세팅
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            온라인 영업 세팅을 같이 정리해볼게요
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
            몇 가지만 답하면, 지금 먼저 챙기면 좋은 세팅을 보여드릴게요.
          </p>
        </div>
        {children}
      </section>
    </ProductShell>
  );
}
