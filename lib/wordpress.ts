// 워드프레스 REST API 발행 클라이언트.
// 인증: 사이트 사용자명 + 애플리케이션 비밀번호 (Basic Auth).

export interface WordPressCredentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.trim().replace(/\/+$/, "");
}

function authHeader({ username, appPassword }: WordPressCredentials): string {
  // 앱 비밀번호의 공백은 그대로 두어도 워드프레스가 허용한다.
  const token = Buffer.from(`${username}:${appPassword}`).toString("base64");
  return `Basic ${token}`;
}

/** 연결 검증: /wp-json/wp/v2/users/me 호출로 자격증명을 확인한다. */
export async function verifyConnection(
  creds: WordPressCredentials,
): Promise<{ ok: boolean; error?: string }> {
  const base = normalizeSiteUrl(creds.siteUrl);
  try {
    const res = await fetch(`${base}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: authHeader(creds) },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "사용자명 또는 애플리케이션 비밀번호가 올바르지 않습니다." };
    }
    return { ok: false, error: `워드프레스 응답 오류 (${res.status}).` };
  } catch {
    return { ok: false, error: "사이트에 연결할 수 없습니다. 주소를 확인해 주세요." };
  }
}

export interface PublishInput extends WordPressCredentials {
  title: string;
  contentHtml: string;
  /** draft(초안) | publish(공개) | future(예약) */
  status?: "draft" | "publish" | "future";
  /** status가 future일 때 예약 시각 (ISO 8601, 사이트 시간대 기준) */
  date?: string;
  /** SEO 메타 설명 (excerpt로 전달 → SEO 플러그인/검색 스니펫) */
  metaDescription?: string;
  /** FAQ → FAQPage 구조화 데이터(JSON-LD)로 변환해 리치 결과 노출 */
  faq?: { question: string; answer: string }[];
  /** SEO 친화적 슬러그(URL) */
  slug?: string;
}

function jsonLd(obj: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
}

/** Article + FAQPage 구조화 데이터(JSON-LD)를 만든다 — 구글 리치 결과용. */
function buildStructuredData(input: PublishInput): string {
  const blocks: string[] = [
    jsonLd({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: input.title,
      description: input.metaDescription ?? "",
      inLanguage: "ko-KR",
      datePublished: new Date().toISOString(),
    }),
  ];
  if (input.faq && input.faq.length > 0) {
    blocks.push(
      jsonLd({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: input.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }),
    );
  }
  return "\n" + blocks.join("\n");
}

export interface PublishResult {
  id: number;
  link: string;
  status: string;
}

/** 글을 워드프레스에 발행(또는 초안 저장/예약)한다. */
export async function publishPost(input: PublishInput): Promise<PublishResult> {
  const base = normalizeSiteUrl(input.siteUrl);
  const body: Record<string, unknown> = {
    title: input.title,
    // 본문 + 구조화 데이터(JSON-LD) → 검색 리치 결과
    content: input.contentHtml + buildStructuredData(input),
    status: input.status ?? "draft",
  };
  if (input.metaDescription) body.excerpt = input.metaDescription;
  if (input.slug) body.slug = input.slug;
  if (input.status === "future" && input.date) {
    body.date = input.date;
  }

  const res = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: authHeader(input),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `발행 실패 (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = await res.json();
  return { id: data.id, link: data.link, status: data.status };
}
