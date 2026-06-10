import { createSupabaseAdminClient } from "./supabase-server";

// 클로드(생성) 헬스 기록 — 크레딧 소진/결제 문제로 글·카드 생성이 멈추면 관리자 대시보드에 표시.
// 일시적 네트워크 오류는 무시하고, '크레딧/결제/한도' 류 오류만 빨간 배너로 띄운다.
function isCreditError(msg: string): boolean {
  return /credit balance|too low|billing|insufficient|quota|payment required|402/i.test(msg);
}

/** 생성 성공/실패를 기록. 성공이면 healthy로 복구, 크레딧 오류면 down으로 표시. */
export async function recordAiResult(ok: boolean, message?: string): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    if (ok) {
      await admin.from("ai_health").upsert({ id: 1, ok: true, last_error: null, updated_at: new Date().toISOString() });
    } else if (message && isCreditError(message)) {
      await admin.from("ai_health").upsert({ id: 1, ok: false, last_error: message.slice(0, 300), updated_at: new Date().toISOString() });
    }
  } catch {
    // ai_health 테이블 없거나 기록 실패해도 본 기능엔 영향 없음
  }
}
