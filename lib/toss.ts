// 토스페이먼츠 빌링(자동결제) 서버 클라이언트.
// 시크릿 키는 서버 전용. 절대 클라이언트에 노출하지 않는다.

const TOSS_API = "https://api.tosspayments.com/v1";

function authHeader(): string {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new Error("TOSS_SECRET_KEY 가 설정되지 않았습니다.");
  // 시크릿 키를 사용자명으로, 비밀번호는 비움.
  const token = Buffer.from(`${secret}:`).toString("base64");
  return `Basic ${token}`;
}

async function tossFetch(path: string, body: unknown) {
  const res = await fetch(`${TOSS_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.message ?? "토스 결제 처리 중 오류가 발생했습니다.";
    throw new Error(message);
  }
  return data;
}

export interface BillingKeyResult {
  billingKey: string;
  customerKey: string;
}

/** 결제창 인증 결과(authKey)로 빌링키를 발급한다. */
export async function issueBillingKey(input: {
  authKey: string;
  customerKey: string;
}): Promise<BillingKeyResult> {
  const data = await tossFetch("/billing/authorizations/issue", {
    authKey: input.authKey,
    customerKey: input.customerKey,
  });
  return { billingKey: data.billingKey, customerKey: data.customerKey };
}

export interface ChargeResult {
  paymentKey: string;
  orderId: string;
  status: string;
  approvedAt?: string;
}

/** 저장된 빌링키로 결제를 청구한다. */
export async function chargeBillingKey(input: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<ChargeResult> {
  const data = await tossFetch(`/billing/${input.billingKey}`, {
    customerKey: input.customerKey,
    amount: input.amount,
    orderId: input.orderId,
    orderName: input.orderName,
  });
  return {
    paymentKey: data.paymentKey,
    orderId: data.orderId,
    status: data.status,
    approvedAt: data.approvedAt,
  };
}

/** 멱등성을 위한 주문번호 생성. */
export function makeOrderId(prefix = "ateflo"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
