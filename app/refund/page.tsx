import type { Metadata } from "next";
import LegalLayout, { LegalSection, BusinessInfo } from "@/components/LegalLayout";
import { SITE_NAME } from "@/lib/site";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = { title: "환불정책" };

const UPDATED = "2026년 7월 3일";

export default function RefundPage() {
  return (
    <LegalLayout title="환불정책 및 청약철회" updated={UPDATED}>
      <p>
        {SITE_NAME}(이하 “회사”)는 「전자상거래 등에서의 소비자보호에 관한 법률」(전자상거래법)에 따라 환불 및
        청약철회를 처리합니다.
      </p>

      <LegalSection heading="1. 청약철회 및 환불 (크레딧)">
        <p>크레딧 팩 구매 후 <b>크레딧을 전혀 사용하지 않은 경우</b>, 결제일로부터 7일 이내에 청약철회(전액 환불)를 요청할 수 있습니다.</p>
        <p><b>크레딧을 일부 사용한 경우</b>, 결제일로부터 7일 이내에는 사용한 크레딧에 해당하는 금액(사용 크레딧 비율 × 결제 금액)을 공제한 잔액의 환불을 요청할 수 있습니다.</p>
        <p>결제일로부터 7일이 지난 경우, 「전자상거래법」 제17조 제2항(디지털 콘텐츠 제공 개시)에 따라 청약철회가 제한될 수 있습니다. 다만 서비스 장애 등 회사 귀책 사유가 있는 경우에는 기간과 무관하게 협의하여 환불합니다.</p>
        <p>생성이 정상적으로 완료되지 않아 자동 환급된 크레딧은 '사용'으로 계산하지 않습니다.</p>
      </LegalSection>

      <LegalSection heading="2. 결제 방식 안내">
        <p>크레딧 팩은 1회성 결제이며 정기결제(자동갱신)가 아닙니다. 해지하지 않아 발생하는 추가 청구는 없습니다.</p>
        <p>회원 탈퇴 시 잔여 크레딧은 소멸되며, 탈퇴 전 위 기준에 따라 환불을 먼저 요청할 수 있습니다.</p>
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
