import type { Metadata } from "next";
import LegalLayout, { LegalSection, BusinessInfo } from "@/components/LegalLayout";
import { SITE_NAME } from "@/lib/site";
import { BUSINESS } from "@/lib/business";

export const metadata: Metadata = { title: "개인정보처리방침" };

const UPDATED = "2026년 1월 1일";

export default function PrivacyPage() {
  return (
    <LegalLayout title="개인정보처리방침" updated={UPDATED}>
      <p>
        {SITE_NAME}(이하 “회사”)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 다음과 같이
        처리합니다.
      </p>

      <LegalSection heading="1. 수집하는 개인정보 항목">
        <p>회원 정보: 이메일 주소, 인증 정보(구글 로그인 등).</p>
        <p>서비스 이용 정보: 입력한 키워드, 생성한 글, 연결한 워드프레스 사이트 정보(주소·사용자명·애플리케이션 비밀번호 — 발행을 위해 저장).</p>
        <p>결제 정보: 결제대행사(토스페이먼츠)를 통해 처리되며, 회사는 카드 전체 번호 등 결제 민감정보를 저장하지 않습니다.</p>
      </LegalSection>

      <LegalSection heading="2. 개인정보의 수집·이용 목적">
        <p>서비스 제공 및 운영, 이용자를 대신한 글 생성·발행, 요금 결제 및 정산, 문의 대응, 서비스 개선을 위해 이용합니다. 회사는 개인정보를 판매하지 않습니다.</p>
      </LegalSection>

      <LegalSection heading="3. 보유 및 이용 기간">
        <p>회원 탈퇴 시 또는 수집·이용 목적 달성 시 지체 없이 파기합니다. 다만 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다(예: 전자상거래법에 따른 계약·결제 기록 5년).</p>
      </LegalSection>

      <LegalSection heading="4. 개인정보의 제3자 제공 및 처리위탁">
        <p>회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않으며, 서비스 운영을 위해 아래와 같이 처리를 위탁합니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase(인증·데이터베이스 호스팅) — 미국 등 국외 서버에 데이터가 저장될 수 있습니다.</li>
          <li>Anthropic(AI 글 생성) — 입력 키워드 등이 처리되며 국외로 이전될 수 있습니다.</li>
          <li>토스페이먼츠(결제 처리) — 국내.</li>
        </ul>
        <p className="text-xs text-neutral-500">※ 국외 이전 항목·시점·방법·보유기간은 각 수탁사의 정책에 따르며, 이용자는 국외 이전을 거부할 수 있으나 이 경우 서비스 이용이 제한될 수 있습니다.</p>
      </LegalSection>

      <LegalSection heading="5. 이용자의 권리">
        <p>이용자는 언제든지 개인정보 열람·정정·삭제·처리정지를 요청할 수 있으며, 대시보드에서 워드프레스 연결 해제 및 계정 삭제를 직접 할 수 있습니다.</p>
      </LegalSection>

      <LegalSection heading="6. 개인정보의 안전성 확보 조치">
        <p>회사는 개인정보 보호를 위해 접근 통제, 전송 구간 암호화 등 합리적인 보호조치를 취합니다. 다만 어떤 전송·저장 방식도 완전히 안전하다고 보장할 수는 없습니다.</p>
      </LegalSection>

      <LegalSection heading="7. 개인정보 보호책임자">
        <p>성명: {BUSINESS.privacyOfficer}</p>
        <p>연락처: {BUSINESS.email}</p>
      </LegalSection>

      <LegalSection heading="8. 사업자 정보">
        <BusinessInfo />
      </LegalSection>

      <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        본 문서는 일반 템플릿이며 법률 자문이 아닙니다. 사업에 적용하기 전 반드시 전문가(변호사)의 검토를 받으시길 권합니다.
      </p>
    </LegalLayout>
  );
}
