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
  /** 대표 이미지(선택, data:base64) → WP featured_media */
  featuredImage?: string | null;
  /** 이미 발행한 글의 워드프레스 글 ID. 있으면 새 글을 만들지 않고 그 글을 수정(재발행)한다 → 중복 글 방지 */
  postId?: number | null;
}

/**
 * 발행 본문의 모든 <img>를 편집 화면과 똑같이 보이도록 제약한다.
 * - 거대한 원본 크기를 강제하는 width/height 속성 제거
 * - max-width:100%; height:auto 로 본문 폭에 맞춤 (가로 스크롤·레이아웃 깨짐 방지)
 */
function constrainImages(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (_m, attrsRaw: string) => {
    let attrs = attrsRaw.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|\d+)/gi, "");
    const fit = "max-width:100%;height:auto;";
    if (/style\s*=/.test(attrs)) {
      attrs = attrs.replace(/style\s*=\s*"([^"]*)"/i, (_s, css: string) => `style="${css.replace(/;?\s*$/, ";")}${fit}"`);
      return `<img${attrs}>`;
    }
    return `<img${attrs} style="${fit}">`;
  });
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

/** data:base64 이미지 1개를 WP 미디어로 업로드. 실패 시 null. */
async function uploadMedia(dataUri: string, creds: WordPressCredentials): Promise<{ id: number; url: string } | null> {
  const base = normalizeSiteUrl(creds.siteUrl);
  try {
    const comma = dataUri.indexOf(",");
    const mime = dataUri.slice(5, comma).split(";")[0];
    const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
    const buffer = Buffer.from(dataUri.slice(comma + 1), "base64");
    const res = await fetch(`${base}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: authHeader(creds),
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="ateflo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}"`,
      },
      body: buffer,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.source_url) return { id: data.id, url: data.source_url };
    }
  } catch {
    // 무시
  }
  return null;
}

/** 본문의 base64 이미지를 WP 미디어로 업로드하고 URL로 교체한다. */
async function uploadDataImages(html: string, creds: WordPressCredentials): Promise<string> {
  const uris = Array.from(new Set(html.match(/data:image\/[A-Za-z0-9.+-]+;base64,[^"')\s]+/g) ?? []));
  for (const uri of uris) {
    const media = await uploadMedia(uri, creds);
    if (media) html = html.split(uri).join(media.url);
  }
  return html;
}

/** 글을 워드프레스에 발행(또는 초안 저장/예약)한다. */
export async function publishPost(input: PublishInput): Promise<PublishResult> {
  const base = normalizeSiteUrl(input.siteUrl);
  // base64 이미지를 WP 미디어로 업로드해 본문을 깔끔한 URL로 교체
  let contentHtml = await uploadDataImages(input.contentHtml, input);
  // 워드프레스가 글 제목을 H1으로 렌더하므로, 본문의 H1은 H2로 강등 (H1 중복 방지)
  contentHtml = contentHtml.replace(/<h1(\s[^>]*)?>/gi, "<h2>").replace(/<\/h1>/gi, "</h2>");
  // 이미지가 본문 폭을 넘어 거대해지거나 가로 스크롤이 생기지 않게 제약 → 편집 화면과 동일하게 보이도록(WYSIWYG)
  contentHtml = constrainImages(contentHtml);
  const body: Record<string, unknown> = {
    title: input.title,
    // 본문 + 구조화 데이터(JSON-LD) → 검색 리치 결과
    content: contentHtml + buildStructuredData(input),
    status: input.status ?? "draft",
  };
  if (input.metaDescription) body.excerpt = input.metaDescription;
  if (input.slug) body.slug = input.slug;
  // 대표 이미지 업로드 → featured_media (선택, 안 고르면 없이 발행)
  if (input.featuredImage?.startsWith("data:")) {
    const media = await uploadMedia(input.featuredImage, input);
    if (media) body.featured_media = media.id;
  }
  if (input.status === "future" && input.date) {
    body.date = input.date;
  }

  // 이미 발행한 글이면(postId 있음) 그 글을 수정 → 같은 글을 또 만드는 중복 발행 방지(재발행).
  // 워드프레스에서 그 글이 삭제됐으면(404) 새 글로 생성하도록 폴백한다.
  const create = () =>
    fetch(`${base}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: { Authorization: authHeader(input), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  let res: Response;
  if (input.postId) {
    res = await fetch(`${base}/wp-json/wp/v2/posts/${input.postId}`, {
      method: "POST",
      headers: { Authorization: authHeader(input), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // 워드프레스 쪽에서 글이 삭제됨 → 새 글로 발행
    if (res.status === 404) res = await create();
  } else {
    res = await create();
  }

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
