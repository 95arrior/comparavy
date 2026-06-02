export type KitStatus = "active" | "coming-soon";

export interface KitModule {
  readonly title: string;
  readonly detail: string;
}

export interface KitFaqItem {
  readonly question: string;
  readonly answer: string;
}

export interface AteFloKit {
  readonly slug: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly status: KitStatus;
  readonly isFeatured?: boolean;
  readonly productLabel?: string;
  readonly audience: string;
  readonly outcome: string;
  readonly pain: string;
  readonly oneLinePromise: string;
  readonly whatIsInside: readonly string[];
  readonly modules: readonly KitModule[];
  readonly sampleItems: readonly string[];
  readonly priceLabel: string;
  readonly ctaLabel: string;
  readonly checkoutUrlEnvKey?: string;
  readonly checkoutUrl?: string;
  readonly relatedShortcutSlugs: readonly string[];
  readonly safetyNotes: readonly string[];
  readonly faq: readonly KitFaqItem[];
}

const jobKitCheckoutUrl = process.env.NEXT_PUBLIC_JOB_KIT_CHECKOUT_URL;
const onlineSalesSetupKitCheckoutUrl =
  process.env.NEXT_PUBLIC_ONLINE_SALES_SETUP_KIT_CHECKOUT_URL;

export const kits: readonly AteFloKit[] = [
  {
    slug: "online-sales-setup-kit",
    title: "AI 온라인 영업 세팅 키트",
    shortTitle: "온라인 영업 세팅",
    status: "active",
    isFeatured: true,
    productLabel: "Flagship kit",
    audience:
      "한국 소상공인, 로컬 서비스업, 1인 사업자, 예약 기반 서비스 운영자",
    outcome:
      "홈페이지, 네이버플레이스, 인스타/SNS, 리뷰 답변, 카카오채널/DM, 이벤트 문구, 결제·도메인·분석·SEO 기본 점검을 순서대로 정리하는 온라인 영업 준비 패키지.",
    pain:
      "온라인에서 손님을 받고 싶지만 홈페이지, 채널, 문의 흐름, 결제, 도메인, 분석, SEO 중 무엇부터 해야 할지 막막한 상황.",
    oneLinePromise:
      "가게나 서비스를 온라인에서 손님 받을 준비 상태로 만들기 위한 문구, 채널 세팅, 홍보 흐름, 결제·도메인·분석·SEO 체크리스트를 순서대로 정리해드려요.",
    whatIsInside: [
      "홈페이지 첫 문장, 서비스 소개문, CTA, FAQ, SEO 제목/설명 정리",
      "네이버플레이스 소개문, 대표 서비스 설명, 사진 설명, FAQ, 기본 정보 점검",
      "인스타/SNS 게시글 주제, 캡션, 스토리 문구, CTA, 주간 업로드 흐름",
      "리뷰 답변, 카카오채널/DM 응대, 이벤트·쿠폰 문구 템플릿",
      "Toss Payments 준비, 도메인, GA4, Search Console, Meta Pixel, SEO 기본 점검 체크리스트",
      "7일 오픈 플랜과 항목별 review rules",
    ],
    modules: [
      {
        title: "홈페이지 만들기",
        detail:
          "홈페이지 첫 문장, 서비스 소개문, CTA, FAQ, SEO 제목/설명, 도메인/배포 체크리스트를 정리합니다.",
      },
      {
        title: "네이버플레이스 세팅",
        detail:
          "매장/서비스 소개문, 대표 서비스 설명, 사진 설명 문구, FAQ, 기본 정보 점검 항목을 정리합니다.",
      },
      {
        title: "인스타/SNS 홍보 세트",
        detail:
          "게시글 주제, 캡션, CTA, 스토리 문구, 해시태그 방향, 주간 업로드 흐름을 만듭니다.",
      },
      {
        title: "리뷰 답변 시스템",
        detail:
          "좋은 리뷰, 보통 리뷰, 불만 리뷰 답변과 재방문 유도 문구, 위험 표현 체크리스트를 정리합니다.",
      },
      {
        title: "카카오채널/DM 응대 문구",
        detail:
          "첫 응대, 가격 문의, 예약 문의, 자주 묻는 질문, 상담 종료 문구를 준비합니다.",
      },
      {
        title: "이벤트·쿠폰 문구",
        detail:
          "이벤트 제목, 쿠폰 안내문, 기간 안내문, 주의사항, SNS/플레이스용 홍보 문구를 정리합니다.",
      },
      {
        title: "결제·도메인·분석·SEO 세팅 체크리스트",
        detail:
          "Toss Payments 준비, 도메인 구매, GA4, Search Console, Meta Pixel, 네이버 서치어드바이저, SEO 기본 점검을 체크리스트로 안내합니다.",
      },
      {
        title: "7일 오픈 플랜",
        detail:
          "Day 1부터 Day 7까지 무엇을 쓰고, 어디에 올리고, 무엇을 점검할지 순서대로 정리합니다.",
      },
    ],
    sampleItems: [
      "Input: 업종, 현재 손님을 받는 채널, 가장 필요한 목표",
      "Output: 먼저 챙기면 좋은 세팅 3가지와 잠긴 유료 모듈 preview",
      "Review: 가격, 기간, 운영시간, 가능 여부, 외부 도구 설치 항목은 직접 확인",
    ],
    priceLabel: onlineSalesSetupKitCheckoutUrl ? "Paid kit" : "Early access",
    ctaLabel: onlineSalesSetupKitCheckoutUrl ? "전체 패키지 열기" : "사전 신청하기",
    checkoutUrlEnvKey: "NEXT_PUBLIC_ONLINE_SALES_SETUP_KIT_CHECKOUT_URL",
    checkoutUrl: onlineSalesSetupKitCheckoutUrl,
    relatedShortcutSlugs: ["how-to-write-google-business-profile-posts-with-ai"],
    safetyNotes: [
      "매출, 상위노출, 고객 증가, 예약 증가, 광고 효율, 사업 성장을 보장하지 않습니다.",
      "리뷰 조작, fake testimonials, invented customer stories를 만들지 않습니다.",
      "가격, 할인, 자격, 운영시간, 가능 여부, 서비스 세부사항을 invent하지 않습니다.",
      "결제·도메인·분석·SEO 항목은 V1에서 체크리스트 안내이며 자동 설치가 아닙니다.",
    ],
    faq: [
      {
        question: "이 키트가 매출이나 예약을 보장하나요?",
        answer:
          "아니요. 이 키트는 온라인 영업 준비에 필요한 문구, 흐름, 체크리스트를 정리해주는 실행 패키지이며 매출, 예약, 고객 증가, 상위노출을 보장하지 않습니다.",
      },
      {
        question: "홍보 문구만 만들어주는 서비스인가요?",
        answer:
          "아니요. 홈페이지, 네이버플레이스, 인스타/SNS, 리뷰 답변, 카카오채널/DM, 이벤트 문구, 결제·도메인·분석·SEO 기본 점검까지 순서대로 정리하는 패키지입니다.",
      },
      {
        question: "Toss Payments나 GA4를 자동 설치해주나요?",
        answer:
          "아니요. V1에서는 직접 설치가 필요한 항목을 체크리스트와 준비 순서로 안내합니다. 자동 설치나 결제 연동을 주장하지 않습니다.",
      },
      {
        question: "어떤 업종에 맞나요?",
        answer:
          "네일샵, 카페, 필라테스, 강아지 미용, 학원, 병원·클리닉, 청소·인테리어, 1인 서비스업, 온라인 상담/교육, 예약 기반 서비스에 맞춰 설계합니다.",
      },
      {
        question: "구매 전에는 무엇을 볼 수 있나요?",
        answer:
          "무료 진단에서는 3개의 짧은 질문 뒤 먼저 챙기면 좋은 세팅 3가지를 보여주고, 전체 유료 모듈은 잠긴 preview로 보여줍니다.",
      },
      {
        question: "AI API가 바로 쓰이나요?",
        answer:
          "V1에서는 AI API를 쓰지 않고 template과 checklist 중심으로 시작합니다. AteFlo 내부 생성 기능은 V2에서 추가합니다.",
      },
      {
        question: "결제는 지금 가능한가요?",
        answer:
          "Toss Payments checkout은 추후 연결 예정입니다. checkout URL이 없을 때는 사전 신청 CTA만 사용하며 실제 결제는 발생하지 않습니다.",
      },
      {
        question: "결과물을 그대로 사용해도 되나요?",
        answer:
          "반드시 실제 가격, 운영시간, 기간, 자격, 서비스 가능 여부, 법적·전문적 표현을 직접 확인한 뒤 사용해야 합니다.",
      },
    ],
  },
  {
    slug: "job-application-ai-kit",
    title: "Job Application AI Kit",
    shortTitle: "Job Application Kit",
    status: "active",
    isFeatured: false,
    productLabel: "Secondary kit",
    audience:
      "Job seekers, career switchers, students, freelancers, and people applying to multiple roles.",
    outcome:
      "Turn a job post and real experience notes into application materials you can review, edit, and send.",
    pain:
      "Job applications ask for specific evidence, but generic AI prompts often create vague bullets, invented experience, or cover letters that sound detached from the role.",
    oneLinePromise:
      "Turn job posts and real experience notes into application drafts you can review and edit.",
    whatIsInside: [
      "Input worksheet for job posts, experience notes, role requirements, and tone",
      "Prompt sequence for resume bullets, cover letters, LinkedIn About copy, interview answers, and follow-up emails",
      "Example inputs and outputs so you can see the workflow before using it",
      "Revision prompts for tightening, changing tone, and removing unsupported claims",
      "Final application checklist for facts, dates, claims, and missing details",
    ],
    modules: [
      {
        title: "Job post analyzer",
        detail:
          "Extract responsibilities, required skills, keywords, risks, and evidence gaps from the role description.",
      },
      {
        title: "Resume bullet builder",
        detail:
          "Turn real experience notes into stronger bullets without inventing metrics, titles, tools, or outcomes.",
      },
      {
        title: "Skills match prompt",
        detail:
          "Map your actual skills to the role and flag any missing proof before you apply.",
      },
      {
        title: "Cover letter builder",
        detail:
          "Draft a focused cover letter that connects your experience to the job instead of sounding generic.",
      },
      {
        title: "LinkedIn About rewrite",
        detail:
          "Create a profile summary that supports the direction of your search without overstating experience.",
      },
      {
        title: "Interview answer builder",
        detail:
          "Prepare role-specific answers from your real examples, constraints, and accomplishments.",
      },
      {
        title: "Recruiter follow-up email",
        detail:
          "Write concise follow-ups for after applying, after interviews, and after sending materials.",
      },
      {
        title: "Final application checklist",
        detail:
          "Review every generated output for accuracy, unsupported claims, dates, names, and fit.",
      },
    ],
    sampleItems: [
      "Input: a pasted job post, 5-8 experience notes, target tone, and details to avoid",
      "Output: tailored resume bullet options, a cover letter outline, and a review checklist",
      "Review: confirm every claim, remove invented metrics, and mark weak evidence before sending",
    ],
    priceLabel: jobKitCheckoutUrl ? "Paid kit" : "Early access",
    ctaLabel: jobKitCheckoutUrl ? "Get the kit" : "Get early access",
    checkoutUrlEnvKey: "NEXT_PUBLIC_JOB_KIT_CHECKOUT_URL",
    checkoutUrl: jobKitCheckoutUrl,
    relatedShortcutSlugs: [],
    safetyNotes: [
      "Does not guarantee interviews, hiring, ATS ranking, salary increases, or recruiter responses.",
      "Uses do-not-invent rules for job titles, dates, metrics, credentials, tools, and experience.",
      "Requires human review before sending any application material.",
    ],
    faq: [
      {
        question: "Which AI tools can I use?",
        answer:
          "Use the kit with ChatGPT, Claude, Gemini, Copilot, or another AI chat tool that can work from pasted job posts and experience notes.",
      },
      {
        question: "Is this a resume writing service?",
        answer:
          "No. It is a self-serve AI workflow kit. It gives you prompts, examples, checklists, and revision steps so you can create and review your own materials.",
      },
      {
        question: "Does this guarantee a job?",
        answer:
          "No. The kit helps you structure and review application materials, but it cannot guarantee interviews, offers, recruiter responses, ATS results, or hiring outcomes.",
      },
      {
        question: "Can I use it in Korean and English?",
        answer:
          "Yes. The prompts can ask your AI tool to draft in English, Korean, or both. You should still review tone, facts, and role-specific wording before sending.",
      },
      {
        question: "What do I receive after purchase?",
        answer:
          "The intended kit includes an input worksheet, prompt sequence, example inputs and outputs, revision prompts, and final review checklists.",
      },
      {
        question: "Can I edit the outputs?",
        answer:
          "Yes. The workflow is built for editing. The kit should help you get a safer first draft, then revise it until it sounds accurate and specific to you.",
      },
    ],
  },
  {
    slug: "dating-profile-rewrite-kit",
    title: "Dating Profile Rewrite Kit",
    shortTitle: "Dating Profile Kit",
    status: "coming-soon",
    isFeatured: false,
    audience:
      "People who want a more natural dating profile without sounding generic or AI-written.",
    outcome:
      "Create bio options, prompt answers, opening-line ideas, and a review checklist from real personal details.",
    pain:
      "Generic AI dating copy can sound polished but false, awkward, desperate, or detached from the person using it.",
    oneLinePromise:
      "Turn real personal details into profile options that sound natural, specific, and editable.",
    whatIsInside: [
      "Input worksheet for personality, interests, tone, boundaries, and things to avoid",
      "Prompt sequence for bios, app prompts, opening lines, and tone revisions",
      "Cliche filter and truth-check checklist",
      "Example options that are specific without promising dating results",
    ],
    modules: [
      {
        title: "Profile input worksheet",
        detail: "Collect real details before asking AI to draft anything.",
      },
      {
        title: "Bio option builder",
        detail: "Generate natural options in different tones without invented traits.",
      },
      {
        title: "Cliche and truth check",
        detail: "Remove generic lines and anything that does not sound like the user.",
      },
    ],
    sampleItems: [
      "Input: interests, personality, app style, relationship goal, and boundaries",
      "Output: bio options, prompt answers, and a does-this-sound-like-me checklist",
    ],
    priceLabel: "Coming soon",
    ctaLabel: "View details",
    relatedShortcutSlugs: [
      "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic",
    ],
    safetyNotes: [
      "No guaranteed matches, dates, romantic success, or engagement claims.",
      "No invented personality, lifestyle, job, income, height, or relationship goals.",
    ],
    faq: [
      {
        question: "Will this write a fake profile?",
        answer:
          "No. The intended workflow is built around real details and review prompts so users can remove anything untrue.",
      },
    ],
  },
  {
    slug: "content-repurposing-kit",
    title: "Content Repurposing Kit",
    shortTitle: "Content Repurposing Kit",
    status: "coming-soon",
    isFeatured: false,
    audience:
      "Creators, consultants, and small teams turning one source into multiple content assets.",
    outcome:
      "A repeatable workflow for turning one source into captions, post outlines, newsletter ideas, and review-ready snippets.",
    pain:
      "Repurposing often turns into scattered drafts, repeated phrasing, or platform copy that does not fit the original source.",
    oneLinePromise:
      "Turn one article, transcript, or idea into multiple platform-ready drafts with review steps.",
    whatIsInside: [
      "Source input worksheet",
      "Prompt sequence for summaries, captions, newsletter angles, and post ideas",
      "Platform-fit checklist",
      "Revision prompts for tone, length, and audience",
    ],
    modules: [
      {
        title: "Source Input Worksheet",
        detail: "Capture the original source, audience, claims, and sections to avoid.",
      },
      {
        title: "Repurposing Prompt Sequence",
        detail: "Draft multiple asset types without losing the source meaning.",
      },
      {
        title: "Platform Review Checklist",
        detail: "Check each draft for fit, accuracy, length, and repeated wording.",
      },
    ],
    sampleItems: [
      "Input: article, transcript, or long post plus audience and platforms",
      "Output: caption options, post ideas, newsletter angle, and review checklist",
    ],
    priceLabel: "Coming soon",
    ctaLabel: "View details",
    relatedShortcutSlugs: [],
    safetyNotes: [
      "No guaranteed follower, engagement, traffic, or sales claims.",
      "No invented source facts, quotes, examples, or metrics.",
    ],
    faq: [
      {
        question: "Will this auto-publish content?",
        answer:
          "No. It is planned as a drafting and review workflow, not an automatic publishing system.",
      },
    ],
  },
  {
    slug: "study-notes-ai-kit",
    title: "Study Notes AI Kit",
    shortTitle: "Study Notes Kit",
    status: "coming-soon",
    isFeatured: false,
    audience:
      "Students and self-learners who want structured notes, quizzes, and review checklists from source material.",
    outcome:
      "A study workflow for turning source notes or readings into summaries, quiz questions, and review plans.",
    pain:
      "Generic AI study prompts can skip important details, invent facts, or produce notes that are too broad to review.",
    oneLinePromise:
      "Turn class notes or readings into structured study notes, quiz questions, and review prompts.",
    whatIsInside: [
      "Source input worksheet",
      "Prompt sequence for study notes, quizzes, flashcards, and weak-area review",
      "Do-not-invent source rules",
      "Final study checklist",
    ],
    modules: [
      {
        title: "Source Input Worksheet",
        detail: "Capture the lecture notes, reading sections, exam scope, and unclear topics.",
      },
      {
        title: "Study Notes Builder",
        detail: "Create structured notes from only the provided source material.",
      },
      {
        title: "Quiz and Review Builder",
        detail: "Generate practice questions and review prompts for weak areas.",
      },
    ],
    sampleItems: [
      "Input: class notes, reading sections, exam scope, and weak topics",
      "Output: study notes, quiz questions, and review checklist",
    ],
    priceLabel: "Coming soon",
    ctaLabel: "View details",
    relatedShortcutSlugs: [],
    safetyNotes: [
      "No guaranteed grades, exam scores, or academic outcomes.",
      "No invented facts, citations, assignments, or instructor expectations.",
    ],
    faq: [
      {
        question: "Can it replace studying?",
        answer:
          "No. It is planned as a structured study aid that still requires source review and practice.",
      },
    ],
  },
];

export function getKits(): readonly AteFloKit[] {
  return kits;
}

export function getActiveKits(): readonly AteFloKit[] {
  return kits.filter((kit) => kit.status === "active");
}

export function getFeaturedKit(): AteFloKit {
  const featured = kits.find((kit) => kit.isFeatured) ?? kits[0];

  if (!featured) {
    throw new Error("At least one AteFlo kit is required.");
  }

  return featured;
}

export function getKitBySlug(slug: string): AteFloKit | undefined {
  if (slug === "local-business-ai-visibility-kit") {
    return kits.find((kit) => kit.slug === "online-sales-setup-kit");
  }

  return kits.find((kit) => kit.slug === slug);
}

export function getKitHref(kit: AteFloKit): string {
  if (
    kit.slug === "online-sales-setup-kit" ||
    kit.slug === "job-application-ai-kit"
  ) {
    return `/kits/${kit.slug}`;
  }

  return `/kits#${kit.slug}`;
}

export function getKitCtaHref(kit: AteFloKit): string {
  if (kit.checkoutUrl) {
    return kit.checkoutUrl;
  }

  if (
    kit.slug === "online-sales-setup-kit" ||
    kit.slug === "job-application-ai-kit"
  ) {
    return `/kits/${kit.slug}#early-access`;
  }

  return `/kits#${kit.slug}`;
}

export function kitHasCheckout(kit: AteFloKit): boolean {
  return Boolean(kit.checkoutUrl);
}
