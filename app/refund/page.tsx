import type { Metadata } from "next";
import LegalLayout, { LegalSection, BusinessInfo } from "@/components/LegalLayout";
import { SITE_NAME } from "@/lib/site";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = { title: "환불정책" };

const UPDATED = "2026년 6월 9일";

export default function RefundPage() {
  return (
    <LegalLayout title="환불정책 및 청약철회" updated={UPDATED}>
      <p>
        {SITE_NAME}(이하 “회사”)는 「전자상거래 등에서의 소비자보호에 관한 법률」(전자상거래법)에 따라 환불 및
        청약철회를 처리합니다.
      </p>

      <LegalSection heading="1. 청약철회 및 환불">
        <p>회사는 무료 3편을 먼저 제공하여, 결제 전에 서비스를 충분히 체험할 수 있도록 하고 있습니다.</p>
        <p>유료 결제 후 <b>글을 한 편도 생성하지 않은 경우</b>, 결제일로부터 7일 이내에 청약철회(전액 환불)를 요청할 수 있습니다.</p>
        <p><b>글 생성(디지털 콘텐츠의 제공)이 시작된 경우</b>에는 「전자상거래법」 제17조 제2항에 따라 이미 제공된 부분에 대한 청약철회가 제한됩니다.</p>
      </LegalSection>

      <LegalSection heading="2. 정기결제(구독)의 해지 및 환불">
        <p>프로 구독은 대시보드에서 언제든지 해지할 수 있으며, 해지 시 다음 결제부터 청구가 중단됩니다. 이미 결제된 기간은 종료일까지 정상 이용할 수 있습니다.</p>
        <p>회원 탈퇴 시 구독은 즉시 해지되어 추가 청구가 발생하지 않습니다. 다만 이미 결제·이용이 시작된 구독료는 위 청약철회 기준에 따라 환불이 제한될 수 있습니다.</p>
      </LegalSection>

      <LegalSection heading="3. 환불 방법">
        <p>환불은 결제 시 사용한 수단으로 처리되며, 결제대행사(토스페이먼츠)의 정책에 따라 영업일 기준 수 일이 소요될 수 있습니다.</p>
      </LegalSection>

      <LegalSection heading="4. 환불 신청">
        <p>환불은 {BUSINESS.email} 으로 가입 이메일과 결제 내역을 기재해 요청해 주세요.</p>
      </LegalSection>

      <LegalSection heading="5. 사업자 정보">
        <BusinessInfo />
      </LegalSection>

      <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        본 문서는 일반 템플릿이며 법률 자문이 아닙니다. 사업에 적용하기 전 반드시 전문가(변호사)의 검토를 받으시길 권합니다.
      </p>
    </LegalLayout>
  );
}
