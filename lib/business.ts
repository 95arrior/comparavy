// 사업자 정보 — 법적 페이지(약관·개인정보·환불) 공용 단일 소스.
// 여기 값만 채우면 세 페이지에 모두 반영됩니다.
// 통신판매업 신고번호(mailOrder)는 신고(변경신고) 후 채우세요. 비워두면 '신고 예정'으로 표시됩니다.

export const BUSINESS = {
  company: "디버깅히어로즈",
  ceo: "박신우",
  bizNumber: "464-73-00436",
  mailOrder: "", // 통신판매업 신고번호 — '더디→디버깅히어로즈' 상호/도메인 변경신고 후 입력. 비우면 '신고 예정'
  address: "경기도 광주시 초월읍 산이길51번길 33-47 106동 301호",
  email: "cs@ateflo.com",
  phone: "010-4015-6751",
  privacyOfficer: "박신우",
} as const;

export const mailOrderText = BUSINESS.mailOrder || "신고 예정";

// 아직 실제 값으로 안 채운 자리표시자가 남아있는지 (배포 전 점검용)
export const businessInfoNeedsFill = Object.values(BUSINESS).some((v) => typeof v === "string" && v.startsWith("["));
