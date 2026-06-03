import type { Metadata } from "next";
import ProductHomeFlow from "@/components/product/ProductHomeFlow";

const HOME_TITLE = "AteFlo | 온라인 영업 세팅 무료 진단";
const HOME_DESCRIPTION =
  "몇 가지 질문에 답하면 지금 먼저 챙기면 좋은 온라인 영업 세팅 3가지를 확인하고, 전체 실행 패키지를 준비할 수 있습니다.";

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export const revalidate = 0;

export default function Home() {
  return <ProductHomeFlow />;
}
