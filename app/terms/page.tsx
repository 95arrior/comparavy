import type { Metadata } from "next";
import LegalLayout, { LegalSection } from "@/components/LegalLayout";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "이용약관" };

const UPDATED = "2026년 1월 1일";

export default function TermsPage() {
  return (
    <LegalLayout title="이용약관" updated={UPDATED}>
      <p>
        본 약관은 {SITE_NAME}(이하 “회사”)가 제공하는 AI 글 생성·발행 서비스(이하 “서비스”)의 이용 조건을 정합니다.
        이용자는 서비스에 가입함으로써 본 약관에 동의한 것으로 봅니다.
      </p>

      <LegalSection heading="1. 서비스 내용">
        <p>회사는 이용자가 입력한 키워드를 바탕으로 한국어 SEO 글을 생성하고, 이용자가 연결한 워드프레스 사이트에 발행할 수 있는 기능을 제공합니다.</p>
      </LegalSection>

      <LegalSection heading="2. 회원가입 및 계정">
        <p>이용자는 본인의 계정 정보를 안전하게 관리할 책임이 있으며, 계정의 부정 사용에 대한 책임은 이용자에게 있습니다.</p>
      </LegalSection>

      <LegalSection heading="3. 유료 서비스 및 정기결제(자동갱신)">
        <p>프로 요금제는 월 단위 정기결제로 제공되며, 이용자가 해지하지 않는 한 매 결제 주기마다 자동으로 갱신·청구됩니다.</p>
        <p>이용자는 대시보드 또는 고객센터를 통해 언제든지 다음 결제 갱신을 해지할 수 있으며, 해지 시 이미 결제된 이용 기간이 끝날 때까지 서비스를 이용할 수 있습니다.</p>
        <p>요금 및 정책이 변경될 경우 회사는 사전에 공지하며, 변경은 다음 결제 주기부터 적용됩니다.</p>
      </LegalSection>

      <LegalSection heading="4. 생성 콘텐츠에 대한 책임">
        <p>서비스가 생성한 글은 이용자가 검토한 후 발행해야 합니다. 생성된 글의 최종 발행·사용에 대한 책임은 이용자에게 있으며, 회사는 콘텐츠의 정확성·적법성을 보증하지 않습니다.</p>
      </LegalSection>

      <LegalSection heading="5. 금지 행위">
        <p>이용자는 법령을 위반하거나 타인의 권리를 침해하는 목적, 스팸·불법 콘텐츠 생성 등에 서비스를 이용해서는 안 됩니다.</p>
      </LegalSection>

      <LegalSection heading="6. 서비스의 변경 및 중단">
        <p>회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 중대한 변경은 사전에 공지합니다.</p>
      </LegalSection>

      <LegalSection heading="7. 책임의 제한">
        <p>회사는 천재지변, 제3자 서비스(Supabase·Anthropic·워드프레스 등)의 장애 등 회사의 통제를 벗어난 사유로 인한 손해에 대해 책임을 지지 않습니다.</p>
      </LegalSection>

      <LegalSection heading="8. 준거법 및 분쟁 해결">
        <p>본 약관은 대한민국 법률에 따라 해석되며, 분쟁은 관련 법령이 정한 절차에 따릅니다.</p>
      </LegalSection>

      <LegalSection heading="9. 사업자 정보">
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
