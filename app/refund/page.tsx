import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "@/components/LegalLayout";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "환불정책" };

const UPDATED = "2026년 1월 1일";

export default function RefundPage() {
  return (
    <LegalLayout title="환불정책 및 청약철회" updated={UPDATED}>
      <p>
        {SITE_NAME}(이하 “회사”)는 「전자상거래 등에서의 소비자보호에 관한 법률」(전자상거래법)에 따라 환불 및
        청약철회를 처리합니다.
      </p>

      <LegalSection heading="1. 청약철회">
        <p>이용자는 결제일로부터 7일 이내에 청약철회를 요청할 수 있습니다. 다만 디지털 콘텐츠(생성된 글 등)의 제공이 시작된 경우, 관련 법령이 정하는 범위 내에서 청약철회가 제한될 수 있습니다.</p>
        <p>서비스의 핵심 기능(글 생성)을 실질적으로 사용한 경우, 해당 사용분에 대해서는 환불이 제한될 수 있습니다.</p>
      </LegalSection>

      <LegalSection heading="2. 정기결제(구독)의 해지 및 환불">
        <p>프로 구독은 언제든지 해지할 수 있으며, 해지 시 다음 결제부터 청구가 중단됩니다. 이미 결제된 기간은 해당 기간 종료일까지 정상 이용할 수 있습니다.</p>
        <p>결제 직후 서비스를 사용하지 않은 경우, 7일 이내 요청 시 전액 환불이 가능합니다.</p>
      </LegalSection>

      <LegalSection heading="3. 환불 방법">
        <p>환불은 결제 시 사용한 수단으로 처리되며, 결제대행사(토스페이먼츠)의 정책에 따라 영업일 기준 수 일이 소요될 수 있습니다.</p>
      </LegalSection>

      <LegalSection heading="4. 환불 신청">
        <p>환불은 support@ateflo.com 으로 가입 이메일과 결제 내역을 기재해 요청해 주세요.</p>
      </LegalSection>

      <LegalSection heading="5. 사업자 정보">
        <p>상호: [상호 입력] / 대표자: [대표자 입력]</p>
        <p>사업자등록번호: [번호 입력] / 통신판매업 신고번호: [번호 입력]</p>
        <p>주소: [주소 입력] / 연락처: support@ateflo.com</p>
      </LegalSection>

      <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        본 문서는 일반 템플릿이며 법률 자문이 아닙니다. 사업에 적용하기 전 반드시 전문가(변호사)의 검토를 받으시고,
        대괄호([ ])로 표시된 사업자 정보를 실제 값으로 채워 주세요.
      </p>
    </LegalLayout>
  );
}
