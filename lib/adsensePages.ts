// 애드센스 승인용 '신뢰 페이지' 4종 콘텐츠 생성.
// 구글은 '진짜 운영되는 사이트'(주제·운영자·연락처·개인정보 방침이 명확)인지 보고 승인한다.
// 개인정보처리방침 = 정확성이 중요하므로 검증된 템플릿(데이터만 채움). 소개/운영자/문의 = AI로 사이트에 맞게.
import Anthropic from "@anthropic-ai/sdk";

export interface AdsensePage {
  key: "privacy" | "about" | "author" | "contact";
  title: string;
  slug: string;
  content: string; // 본문 HTML(<h2>,<h3>,<p>,<ul>,<li>,<a>)
}

export interface AdsensePageInput {
  siteName: string; // 블로그/사이트 이름
  email: string;    // 실제 연락 가능한 이메일
  domain?: string;  // 사이트 도메인(있으면)
  field: string;    // 분야(업종/세부) — 사이트 주제
  operator?: string; // 운영자명(없으면 siteName 사용)
}

function privacyHtml(siteName: string, email: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return [
    `<p><strong>${siteName}</strong>(이하 '사이트')은(는) 이용자의 개인정보를 소중히 다루며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 사이트가 어떤 정보를 수집하고 어떻게 이용하는지 안내합니다.</p>`,
    `<h2>1. 수집하는 정보</h2>`,
    `<p>본 사이트는 회원가입을 받지 않으며 이름·연락처 등 개인정보를 직접 수집하지 않습니다. 다만 방문 통계 분석과 광고 제공을 위해 쿠키, 접속 로그, 브라우저·기기 정보 등이 자동으로 수집될 수 있습니다.</p>`,
    `<h2>2. 쿠키 및 광고(구글 애드센스)</h2>`,
    `<p>본 사이트는 제3자 광고 사업자인 구글(Google)의 애드센스(AdSense)를 통해 광고를 게재할 수 있습니다. 구글을 포함한 제3자 광고 사업자는 쿠키를 사용하여 이용자의 이전 방문 기록에 기반한 맞춤형 광고를 제공할 수 있습니다.</p>`,
    `<p>이용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener">구글 광고 설정</a>에서 개인 맞춤 광고를 거부할 수 있으며, <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener">www.aboutads.info</a>에서 제3자 광고 쿠키를 비활성화할 수 있습니다.</p>`,
    `<h2>3. 웹 분석 도구</h2>`,
    `<p>본 사이트는 방문 통계 분석을 위해 구글 애널리틱스 등 웹 분석 도구를 사용할 수 있으며, 이 과정에서 쿠키가 사용됩니다. 수집된 정보는 사이트 개선 목적의 통계 분석에만 이용됩니다.</p>`,
    `<h2>4. 개인정보의 보관 및 파기</h2>`,
    `<p>자동으로 수집된 로그성 정보는 통계·분석 목적을 달성한 후 지체 없이 파기합니다.</p>`,
    `<h2>5. 이용자의 권리와 쿠키 거부</h2>`,
    `<p>이용자는 웹 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만 쿠키 저장을 거부할 경우 광고·통계 등 일부 기능 이용에 제한이 있을 수 있습니다.</p>`,
    `<h2>6. 개인정보 보호 문의</h2>`,
    `<p>개인정보 처리에 관한 문의·불만은 아래 연락처로 접수해 주시기 바랍니다.</p>`,
    `<ul><li>이메일: ${email}</li></ul>`,
    `<p>본 개인정보처리방침은 ${date}부터 시행됩니다.</p>`,
  ].join("\n");
}

const FALLBACK_AI = (siteName: string, field: string, email: string) => ({
  about: `<p><strong>${siteName}</strong>은(는) ${field}에 관한 정보를 다루는 블로그입니다.</p><p>처음 접하는 분도 쉽게 이해할 수 있도록, 직접 경험하고 확인한 내용을 바탕으로 실용적인 정보를 정리해 전합니다.</p><h2>다루는 내용</h2><ul><li>${field}의 기초와 자주 묻는 질문</li><li>실제로 도움이 되는 방법과 주의할 점</li><li>초보자가 흔히 겪는 실수와 해결법</li></ul>`,
  author: `<p>안녕하세요. <strong>${siteName}</strong>을 운영하고 있습니다.</p><p>${field}에 관심을 갖고 직접 경험하며 알게 된 정보를, 같은 고민을 하는 분들과 나누기 위해 이 블로그를 시작했습니다. 과장 없이 솔직하고 도움이 되는 글을 쓰려 노력합니다.</p><p>문의나 제안은 언제든 환영합니다.</p>`,
  contact: `<p>${siteName}에 관한 문의·제안·협업은 아래 이메일로 연락 주세요. 확인 후 최대한 빠르게 답변드리겠습니다.</p><ul><li>이메일: ${email}</li></ul>`,
});

async function aiPages(input: AdsensePageInput): Promise<{ about: string; author: string; contact: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fb = FALLBACK_AI(input.siteName, input.field, input.email);
  if (!apiKey) return fb;
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1400,
      messages: [
        {
          role: "user",
          content:
            `사이트명: ${input.siteName}\n주제(분야): ${input.field}\n운영자: ${input.operator || input.siteName}\n이메일: ${input.email}\n\n` +
            "구글 애드센스 승인을 위한 '신뢰 페이지' 3개의 본문을 써줘. 구글이 '진짜 사람이 운영하는 명확한 사이트'라고 인식하게 하는 게 목적(E-E-A-T)이다.\n" +
            "- about(사이트 소개): 이 블로그가 '주제(분야)'의 세부 영역들(예: 경제라면 주식·대출·부동산·정부 지원금·세금·연금)을 누구를 위해 어떻게 다루는지 <ul>로 명확히 나열. 콘텐츠 기준(공식 자료 확인·기준 시점 표기·과장 금지)을 <h2> '이 블로그가 지키는 것'으로 명시 — 이 기준 문단이 신뢰의 핵심.\n" +
            "- author(운영자 소개): 평범한 직장인/생활인의 시선에서 왜 이 주제를 기록하는지(1인칭, 진솔). 가짜 경력·실명·자격·구체 이력은 절대 지어내지 마 — '전문가가 아니라 직접 알아보고 정리하는 사람'이라는 정직한 포지션이 오히려 신뢰다. 마지막에 '내용 중 사실과 다른 부분은 알려주시면 바로잡겠다'는 문장.\n" +
            "- contact(문의하기): 협업·제보·수정 요청 각각 환영한다는 안내 + 이메일. 회신 기대 시간(며칠 내) 언급.\n" +
            "각 300~600자. ★절대 금지: 자동화·AI 생성 언급, 과장, 수익 보장 표현, 이모지, 해시태그. 허용 태그: <h2>,<h3>,<p>,<ul>,<li>.\n" +
            'JSON으로만: {"about":"<p>...","author":"<p>...","contact":"<p>..."}',
        },
      ],
    });
    const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return fb;
    const raw = JSON.parse(m[0]) as { about?: unknown; author?: unknown; contact?: unknown };
    return {
      about: typeof raw.about === "string" && raw.about.trim() ? raw.about : fb.about,
      author: typeof raw.author === "string" && raw.author.trim() ? raw.author : fb.author,
      contact: typeof raw.contact === "string" && raw.contact.trim() ? raw.contact : fb.contact,
    };
  } catch {
    return fb;
  }
}

export async function buildAdsensePages(input: AdsensePageInput): Promise<AdsensePage[]> {
  const ai = await aiPages(input);
  return [
    { key: "about", title: `${input.siteName} 소개`, slug: "about", content: ai.about },
    { key: "author", title: "운영자 소개", slug: "author", content: ai.author },
    { key: "contact", title: "문의하기", slug: "contact", content: ai.contact + `<p>이메일: <a href="mailto:${input.email}">${input.email}</a></p>` },
    { key: "privacy", title: "개인정보처리방침", slug: "privacy-policy", content: privacyHtml(input.siteName, input.email) },
  ];
}
