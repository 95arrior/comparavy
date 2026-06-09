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
  /** 카테고리 이름 (없으면 WP에서 새로 생성). 미지정 시 '미분류'로 올라가 SEO에 불리 → 가급적 지정 */
  categoryName?: string | null;
  /** 워드프레스 태그 이름들 (없으면 새로 생성) */
  tags?: string[];
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Article 구조화 데이터(JSON-LD). FAQ는 본문 마이크로데이터로 따로 넣는다(아래 renderFaqSection). */
function buildStructuredData(input: PublishInput): string {
  return (
    "\n" +
    jsonLd({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: input.title,
      description: input.metaDescription ?? "",
      inLanguage: "ko-KR",
      datePublished: new Date().toISOString(),
    })
  );
}

/**
 * FAQ를 '보이는 HTML + schema.org 마이크로데이터'로 렌더한다.
 * - <script> JSON-LD는 워드프레스가 자주 제거하지만, 마이크로데이터(itemprop 등 HTML 속성)는 살아남아
 *   구글 FAQ 리치결과가 안정적으로 붙는다. 플러그인(Yoast·Rank Math) 없이도 동작.
 */
function renderFaqSection(faq: { question: string; answer: string }[]): string {
  const items = faq
    .map(
      (f) =>
        `<div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">` +
        `<h3 itemprop="name">${escapeHtml(f.question)}</h3>` +
        `<div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">` +
        `<p itemprop="text">${escapeHtml(f.answer)}</p>` +
        `</div></div>`,
    )
    .join("\n");
  return `\n<section itemscope itemtype="https://schema.org/FAQPage">\n<h2>자주 묻는 질문</h2>\n${items}\n</section>`;
}

/**
 * 본문에 이미 들어있는 '평문 FAQ'(편집기에서 ＋추가로 넣은 것)를 제거한다.
 * → 발행 시 마이크로데이터 FAQ를 새로 붙이므로 중복을 막는다.
 * 매칭: '자주 묻는 질문' H2와, FAQ 질문과 같은 텍스트의 H3 + 바로 뒤 P.
 */
function stripExistingFaq(html: string, faq: { question: string; answer: string }[]): string {
  let out = html;
  const questions = new Set(faq.map((f) => f.question.trim()));
  // '자주 묻는 질문' 제목 제거
  out = out.replace(/<h2[^>]*>\s*자주\s*묻는\s*질문\s*<\/h2>/gi, "");
  // 질문 H3 + 다음 P 제거
  out = out.replace(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>[\s\S]*?<\/p>/gi, (m, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    return questions.has(text) ? "" : m;
  });
  return out;
}

/** 분류(category)·태그(tag) 용어를 찾거나 없으면 만들어 term id를 돌려준다. */
async function findOrCreateTerm(
  base: string,
  creds: WordPressCredentials,
  taxonomy: "categories" | "tags",
  name: string,
): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  try {
    // 이미 있으면 그 id 사용 (정확히 같은 이름)
    const sr = await fetch(`${base}/wp-json/wp/v2/${taxonomy}?search=${encodeURIComponent(trimmed)}&per_page=100`, {
      headers: { Authorization: authHeader(creds) },
    });
    if (sr.ok) {
      const list = (await sr.json()) as { id: number; name: string }[];
      const exact = list.find((t) => (t.name || "").trim().toLowerCase() === trimmed.toLowerCase());
      if (exact) return exact.id;
    }
    // 없으면 생성
    const cr = await fetch(`${base}/wp-json/wp/v2/${taxonomy}`, {
      method: "POST",
      headers: { Authorization: authHeader(creds), "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (cr.ok) {
      const data = await cr.json();
      if (data?.id) return data.id as number;
    } else {
      // 동시 생성 충돌(term_exists) 시 응답에 기존 id가 담겨 옴
      const data = await cr.json().catch(() => null);
      const existing = data?.data?.term_id ?? data?.additional_data?.[0];
      if (typeof existing === "number") return existing;
    }
  } catch {
    // 무시 (분류 실패해도 발행 자체는 진행)
  }
  return null;
}

export interface PublishResult {
  id: number;
  link: string;
  status: string;
}

/** 이미지(base64 data URI 또는 http(s) URL) 1개를 WP 미디어로 업로드. 실패 시 null. */
async function uploadMedia(source: string, creds: WordPressCredentials): Promise<{ id: number; url: string } | null> {
  const base = normalizeSiteUrl(creds.siteUrl);
  try {
    let buffer: Buffer;
    let mime: string;
    if (source.startsWith("data:")) {
      const comma = source.indexOf(",");
      mime = source.slice(5, comma).split(";")[0] || "image/png";
      buffer = Buffer.from(source.slice(comma + 1), "base64");
    } else {
      // 스토리지 등 URL → 내려받아 업로드
      const r = await fetch(source);
      if (!r.ok) return null;
      mime = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
      buffer = Buffer.from(await r.arrayBuffer());
    }
    const ext = (mime.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
    const res = await fetch(`${base}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: authHeader(creds),
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="ateflo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}"`,
      },
      body: new Uint8Array(buffer),
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

/**
 * 본문 이미지를 WP 미디어 라이브러리로 옮기고 URL로 교체한다.
 * - base64 data URI
 * - 우리 Supabase 스토리지(article-images) URL
 * → 발행 후 글이 우리 스토리지에 의존하지 않고, 사용자 WP 안에 이미지가 보관된다.
 */
async function uploadInlineImages(html: string, creds: WordPressCredentials): Promise<string> {
  const dataUris = html.match(/data:image\/[A-Za-z0-9.+-]+;base64,[^"')\s]+/g) ?? [];
  const storageUrls =
    html.match(/https?:\/\/[^"')\s]*\/storage\/v1\/object\/public\/article-images\/[^"')\s]+/g) ?? [];
  const sources = Array.from(new Set([...dataUris, ...storageUrls]));
  for (const src of sources) {
    const media = await uploadMedia(src, creds);
    if (media) html = html.split(src).join(media.url);
  }
  return html;
}

/** 글을 워드프레스에 발행(또는 초안 저장/예약)한다. */
export async function publishPost(input: PublishInput): Promise<PublishResult> {
  const base = normalizeSiteUrl(input.siteUrl);
  // 본문 이미지(base64·스토리지 URL)를 WP 미디어로 옮기고 URL로 교체
  let contentHtml = await uploadInlineImages(input.contentHtml, input);
  // 워드프레스가 글 제목을 H1으로 렌더하므로, 본문의 H1은 H2로 강등 (H1 중복 방지)
  contentHtml = contentHtml.replace(/<h1(\s[^>]*)?>/gi, "<h2>").replace(/<\/h1>/gi, "</h2>");
  // 이미지가 본문 폭을 넘어 거대해지거나 가로 스크롤이 생기지 않게 제약 → 편집 화면과 동일하게 보이도록(WYSIWYG)
  contentHtml = constrainImages(contentHtml);
  // FAQ: 본문의 평문 FAQ는 제거하고, 마이크로데이터가 붙은 FAQ 섹션을 맨 끝에 한 번만 넣는다(구글 FAQ 리치결과).
  if (input.faq && input.faq.length > 0) {
    contentHtml = stripExistingFaq(contentHtml, input.faq) + renderFaqSection(input.faq);
  }
  const body: Record<string, unknown> = {
    title: input.title,
    // 본문 + Article 구조화 데이터(JSON-LD)
    content: contentHtml + buildStructuredData(input),
    status: input.status ?? "draft",
  };
  if (input.metaDescription) body.excerpt = input.metaDescription;
  if (input.slug) body.slug = input.slug;

  // 카테고리: 지정되면 찾거나 생성해 연결 (미지정 시 '미분류'로 올라가 SEO 불리)
  if (input.categoryName) {
    const catId = await findOrCreateTerm(base, input, "categories", input.categoryName);
    if (catId) body.categories = [catId];
  }
  // 태그: 각 이름을 찾거나 생성해 id로 연결
  if (input.tags && input.tags.length > 0) {
    const ids: number[] = [];
    for (const name of input.tags.slice(0, 8)) {
      const id = await findOrCreateTerm(base, input, "tags", name);
      if (id) ids.push(id);
    }
    if (ids.length) body.tags = ids;
  }
  // 대표 이미지 업로드 → featured_media (base64·스토리지 URL 모두 지원, 안 고르면 없이 발행)
  if (input.featuredImage) {
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
