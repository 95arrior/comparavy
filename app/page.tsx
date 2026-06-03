import type { Metadata } from "next";
import ProductHomeFlow from "@/components/product/ProductHomeFlow";

const HOME_TITLE = "AteFlo | 내 상황에 맞는 AI 실행 패키지";
const HOME_DESCRIPTION =
  "지금 막힌 일을 선택하면 먼저 챙기면 좋은 온라인 세팅을 진단하고, 필요한 실행 패키지를 안내합니다.";

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
