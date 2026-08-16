// 관리자 알림 이메일 — Resend HTTP API(추가 의존성 없음, fetch만 사용).
// 활성 조건: RESEND_API_KEY + ADMIN_ALERT_EMAIL(받는 사람). 미설정이면 조용히 건너뛴다(대시보드 안내는 그대로 동작).
//   NOTIFY_FROM 미설정 시 onboarding@resend.dev (Resend 테스트 발신).
export async function sendAdminEmail(subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!key || !to) return false;
  const from = process.env.NOTIFY_FROM || "ateflo <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: to.split(",").map((s) => s.trim()).filter(Boolean), subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
