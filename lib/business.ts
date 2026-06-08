// 사업자 정보 — 법적 페이지(약관·개인정보·환불) 공용 단일 소스.
// 여기 값만 채우면 세 페이지에 모두 반영됩니다.
// 통신판매업 신고번호(mailOrder)는 신고 후 채우세요. 비워두면 '신고 예정'으로 표시됩니다.

export const BUSINESS = {
  company: "[상호]",
  ceo: "[대표자명]",
  bizNumber: "[사업자등록번호]",
  mailOrder: "", // 통신판매업 신고번호 (신고 후 입력) — 비우면 '신고 예정'
  address: "[사업장 주소]",
  email: "support@ateflo.com",
  phone: "[연락처]",
  privacyOfficer: "[개인정보 보호책임자 성명]",
} as const;

export const mailOrderText = BUSINESS.mailOrder || "신고 예정";

// 아직 실제 값으로 안 채운 자리표시자가 남아있는지 (배포 전 점검용)
export const businessInfoNeedsFill = Object.values(BUSINESS).some((v) => typeof v === "string" && v.startsWith("["));
