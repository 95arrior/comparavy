"use client";

import { useEffect, useState } from "react";
import { cachedGet } from "@/lib/clientFetchCache";
import type { Article } from "./types";

// ★워드프레스 홈(Phase 2) — 네이버 홈과 완전 분리. 챌린지 톤: 애드센스 코스 게이지 + 오늘 글 승인 + 셋업 체크리스트.
//  80대 규격: 할 일이 항상 위에서 아래로 하나씩.
const ADSENSE_GOAL = 30; // 애드센스 신청 기준 글 수(통설 보수치)

export default function WpHome({ blogName, blogId, articles, credits, onOpenArticle, onAddBlog }: {
  blogName: string;
  blogId: string;
  articles: Article[];
  credits: number;
  onOpenArticle?: (a: Article) => void;
  onAddBlog?: () => void;
}) {
  const pub = articles.filter((a) => a.status === "published").length;
  const pct = Math.min(100, Math.round((pub / ADSENSE_GOAL) * 100));
  const reviewDraft = articles.find((a) => a.status === "draft"); // 아침 승인탭 대기(자동 생성분)
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  async function generateFirstNow() {
    if (genBusy) return;
    setGenBusy(true); setGenErr(null);
    try {
      const r = await fetch("/api/wordpress/generate-now", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setGenErr(d.error ?? "글을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요."); return; }
      window.location.reload(); // 생성된 초안이 히어로(읽어보기/발행하기)로 뜨게
    } catch { setGenErr("네트워크 오류예요. 다시 시도해 주세요."); }
    finally { setGenBusy(false); }
  }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pagesBusy, setPagesBusy] = useState(false);
  const trustKey = `ateflo_trustpages_${blogId ?? ""}`;
  const [pagesDone, setPagesDone] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(trustKey) === "1") { setPagesDone(true); return; } } catch { /* ignore */ }
    // 로컬 기록 없음 — WP 실물 확인(배포 전 완료 유저 소급 처리)
    fetch("/api/wordpress/adsense-pages").then((r) => r.json()).then((d) => {
      if (d?.done) { setPagesDone(true); try { localStorage.setItem(trustKey, "1"); } catch { /* ignore */ } }
    }).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trustKey]);
  async function makeTrustPages() {
    if (pagesBusy) return;
    setPagesBusy(true);
    try {
      const r = await fetch("/api/wordpress/adsense-pages", { method: "POST" });
      const d = await r.json();
      if (r.ok) { setToast(`신뢰 페이지 ${Array.isArray(d.pages) ? d.pages.length : 4}개를 만들었어요 — 사이트에서 확인해 보세요`); setPagesDone(true); try { localStorage.setItem(trustKey, "1"); } catch { /* ignore */ } }
      else setToast(d.error ?? "페이지를 만들지 못했어요");
    } catch { setToast("네트워크 오류예요"); }
    setPagesBusy(false);
  }

  // 블로그 스위처(미니)
  const [blogSheet, setBlogSheet] = useState(false);
  const [blogList, setBlogList] = useState<{ id: string; blog_name: string | null; sub_category: string | null; is_active: boolean }[]>([]);
  async function openSwitcher() {
    setBlogSheet(true);
    try { const d = await cachedGet<{ blogs?: typeof blogList }>("/api/blogs", 60_000); setBlogList(Array.isArray(d.blogs) ? d.blogs : []); } catch { /* ignore */ }
  }

  // 셋업 체크리스트(챌린지) — 블로그별 로컬 체크
  const setupKey = `ateflo_wpsetup_${blogId}`;
  const [setup, setSetup] = useState<Record<string, boolean>>({});
  const [helpOpen, setHelpOpen] = useState<string | null>(null);
  useEffect(() => { try { setSetup(JSON.parse(localStorage.getItem(setupKey) ?? "{}")); } catch { /* ignore */ } }, [setupKey]);
  function toggleSetup(k: string) {
    setSetup((s) => { const n = { ...s, [k]: !s[k] }; try { localStorage.setItem(setupKey, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  }

  async function publishNow() {
    if (!reviewDraft || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/wordpress/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId: reviewDraft.id, status: "publish", addToc: true, addInternalLinks: true }) });
      const d = await r.json();
      if (r.ok) {
      try {
        const link = String(d.link ?? "");
        if (link) {
          const origin = new URL(link).origin + "/";
          window.open(`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(origin)}&url=${encodeURIComponent(link)}`, "_blank"); // ★색인 요청 자동 오픈(2026-07-13 유저: 까먹지 않게) — [색인 생성 요청]만 누르면 끝
        }
      } catch { /* 무해 */ }
        setToast("발행 완료 — 방금 열린 구글 탭에서 [색인 생성 요청]만 눌러주세요");
        setTimeout(() => window.location.reload(), 2200);
      }
      else setToast(d.error ?? "발행하지 못했어요");
    } catch { setToast("네트워크 오류예요"); }
    setBusy(false);
  }

  const SETUP_ITEMS = [
    { k: "gsc", t: "구글에 내 블로그 등록 (검색 노출의 시작)", steps: [
      "구글에서 ‘서치콘솔’을 검색해 열고, 구글 계정으로 로그인해요",
      "‘속성 추가’ → ‘URL 접두어’에 내 블로그 주소(https 포함)를 붙여넣어요",
      "소유 확인에서 ‘HTML 태그’를 고르면 <meta ...> 코드 한 줄을 줘요 — 그걸 복사해요",
      "붙이는 곳: 워드프레스 관리자 → 왼쪽 메뉴 Rank Math → 일반 설정 → ‘웹 마스터 도구’ 탭 → ‘Google 서치 콘솔’ 칸에 붙여넣고 맨 아래 [변경사항 저장]",
      "★저장해도 확인이 안 되면: 관리자 상단 검은 바의 번개 모양(LiteSpeed) → [모두 제거]를 누르고 다시 확인 버튼 — 캐시가 옛 화면을 보여주는 것뿐이에요",
      "확인되면 왼쪽 ‘Sitemaps’ 메뉴에 sitemap_index.xml 이라고 적고 제출해요",
      "— 이후 매주 한 번 ‘실적’만 보세요: 노출이 늘고 있으면 정상 궤도예요",
    ] },
    { k: "naver", t: "네이버에도 내 블로그 등록 (한국 검색의 절반)", steps: [
      "네이버에서 ‘서치어드바이저’를 검색해 열고, 네이버 계정으로 로그인해요",
      "‘웹마스터 도구’ → 사이트 등록에 내 블로그 주소(https 포함)를 넣어요",
      "‘HTML 태그’ 방식을 고르면 <meta name=\"naver-site-verification\" ...> 한 줄을 줘요 — 통째로 복사해요",
      "붙이는 곳: 워드프레스 관리자 → Rank Math → 일반 설정 → ‘웹 마스터 도구’ 탭 → 맨 아래 ‘사용자 정의 웹마스터 태그’ 칸에 통째로 붙여넣고 [변경사항 저장]",
      "★[소유확인]에서 ‘메타태그를 찾을 수 없습니다’가 뜨면: 관리자 상단 번개 모양(LiteSpeed) → [모두 제거] 누르고 다시 [소유확인] — 십중팔구 캐시 때문이에요",
      "확인되면 ‘요청 → 사이트맵 제출’에 sitemap_index.xml 이라고 적고 제출해요",
      "— 워드프레스 글도 네이버 검색에 떠요. 우리 글감은 네이버 수요로 검증된 키워드라 등록만 하면 이중 유입이에요",
    ] },
    { k: "ga4", t: "방문자 통계 연결 (구글 애널리틱스)", steps: [
      "워드프레스 관리자 → 플러그인 → 새로 추가 → ‘Site Kit by Google’ 검색 → 설치 → 활성화 (코드 붙여넣기가 전혀 없는 공식 플러그인이에요)",
      "‘설정 시작’ 마법사가 뜨면 구글 계정으로 로그인하고 권한을 허용해요",
      "Site Kit 대시보드에서 ‘Analytics’ 항목의 [연결]을 눌러요 — 계정이 없으면 그 자리에서 만들어 줘요",
      "★주의: ‘태그 관리자(GTM)’ 코드 붙여넣기 화면이 나오면 잘못 들어간 거예요 — 닫고 위 순서로. ‘Ads 설정’ 카드도 무시하세요(광고비 내는 광고주용 — 우리는 광고를 받는 쪽)",
      "확인: 연결 후 내 사이트를 한 번 열고, 대시보드에 ‘데이터 수집 중’이 뜨면 성공이에요",
      "— 이후 매주 한 번 방문자 추이만 보세요: 처음 몇 달은 낮은 게 정상이에요(구글은 새 사이트를 천천히 믿어요)",
    ] },
    { k: "adsense", t: pub >= ADSENSE_GOAL ? "애드센스 신청하기 (준비 완료!)" : `애드센스 신청 (글 ${ADSENSE_GOAL}편 모이면)`, steps: pub >= ADSENSE_GOAL ? [
      "구글에서 ‘애드센스’를 검색해 열고 ‘시작하기’를 눌러요",
      "내 블로그 주소를 넣고, 안내대로 계정을 만들어요",
      "받은 코드 조각은 워드프레스 관리자 → Site Kit(설치했다면 자동) 또는 호스팅 고객센터 도움으로 넣어요",
      "심사는 보통 2주~한 달 — 그동안 자동 발행은 계속 돌아가요",
      "승인 메일이 오면 광고가 자동으로 붙기 시작해요 — 여기부터 수익이에요",
    ] : [
      `아직 ${Math.max(0, ADSENSE_GOAL - pub)}편 남았어요 — 매일 자동 발행이 쌓아줘요`,
      "글이 모이면 여기서 신청 순서를 단계별로 알려드릴게요",
    ] },
  ];

  return (
    <main className="mx-auto max-w-[520px] px-5 pb-16">
      <button onClick={openSwitcher} className="tk-seq-1 flex items-center gap-1 pt-6 text-[15px] font-semibold text-[color:var(--color-text-sub)]">
        {blogName}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="m6 9 6 6 6-6" /></svg>
        <span className="ml-1 rounded bg-[#1D75F7]/10 px-1.5 py-0.5 text-[10.5px] font-bold text-[#1D75F7]">워드프레스</span>
      </button>

      {/* 애드센스 코스 게이지 — 챌린지 */}
      <div className="tk-seq-1 tk-card-glow mt-3 rounded-[20px] p-6 shadow-[0_2px_12px_-4px_rgba(29,117,247,0.12)]">
        <p className="text-[13px] text-[color:var(--color-text-weak)]">애드센스 신청까지</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="tk-grad-text text-[36px] font-extrabold leading-none tabular-nums">{pub}</span>
          <span className="text-[15px] font-semibold text-[color:var(--color-text-sub)]">/ {ADSENSE_GOAL}편</span>
          <span className="text-[15px] font-semibold tabular-nums text-[color:var(--color-brand)]">{pct}%</span>
        </div>
        <div className="tk-gauge mt-5 h-2.5 w-full rounded-full bg-[#E8EDF7]">
          <div className="tk-gauge-fill" style={{ width: `${Math.max(pct, 3)}%` }} />
        </div>
        <p className="mt-4 text-[13px] text-[color:var(--color-text-sub)]">매일 자동 2편 권장 · 원하면 더 만들 수 있어요 · 크레딧 {credits.toLocaleString("ko-KR")}</p>
      </div>

      {/* 크레딧 부족 — 자동 발행이 멈추기 전에(충전 동선) */}
      {credits < 10 && (
        <button onClick={() => { try { window.location.assign("/pricing"); } catch { /* ignore */ } }} className="tk-seq-2 mt-4 flex w-full items-center justify-between rounded-[16px] bg-amber-50 px-5 py-4 text-left ring-1 ring-amber-100">
          <span>
            <span className="block text-[13.5px] font-bold text-amber-800">크레딧이 부족해 자동 발행이 멈춰요</span>
            <span className="mt-0.5 block text-[12px] text-amber-600/80">충전해두면 매일 아침 글이 계속 쌓여요</span>
          </span>
          <span className="shrink-0 text-[13px] font-bold text-amber-700">충전 →</span>
        </button>
      )}

      {/* 오늘의 글 — 승인 대기 or 예고 */}
      {reviewDraft ? (
        <div className="tk-hero tk-hero-in mt-4 rounded-[24px] p-6 pb-7 text-white">
          <div className="relative z-10">
            <p className="text-[13px] font-semibold text-white/70">오늘의 글이 준비됐어요</p>
            <p className="mt-3 text-[22px] font-extrabold leading-[1.35] text-white">{reviewDraft.title}</p>
            <p className="mt-2 text-[13px] text-white/70">읽어보고 마음에 들면 발행 버튼 한 번이면 끝나요.</p>
            <div className="mt-5 flex gap-2">
              {onOpenArticle && (
                <button onClick={() => onOpenArticle(reviewDraft)} className="at-press flex-1 rounded-[14px] bg-white/15 py-3.5 text-[15px] font-bold text-white backdrop-blur-[2px]">읽어보기</button>
              )}
              <button onClick={publishNow} disabled={busy} className="at-press tk-hero-cta flex-1 rounded-[14px] py-3.5 text-[15px] font-bold disabled:opacity-60">{busy ? "발행 중…" : "발행하기"}</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="tk-seq-2 tk-card-glow mt-4 rounded-[20px] p-6 shadow-[0_2px_12px_-4px_rgba(29,117,247,0.12)]">
          <p className="text-[13px] font-semibold text-[color:var(--color-brand)]">오늘의 글</p>
          <p className="mt-2 text-[15px] font-bold leading-snug text-neutral-900">{pub === 0 ? "내일 아침, 글이 자동으로 준비돼요." : "다음 글이 자동으로 준비돼요. (하루 2편)"}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-400">구글에서 오래 검색될 주제를 데이터가 고르고, 글까지 써둘게요.</p>
          <button onClick={generateFirstNow} disabled={genBusy} className="at-press tk-grad-cta mt-4 w-full rounded-[14px] py-3.5 text-[14.5px] font-bold text-white disabled:opacity-60">
            {genBusy ? <><span className="tk-wand" aria-hidden>✦</span>글을 만들고 있어요… (1~2분)</> : pub === 0 ? "첫 글 지금 만들어보기" : "다음 글 지금 만들어보기"}
          </button>
          {genErr && <p className="mt-2 text-[12.5px] font-medium text-amber-600">{genErr}</p>}
        </div>
      )}

      {/* 셋업 챌린지 — 하나씩 깨기 */}
      <div className="tk-seq-3 mt-8">
        <p className="px-2 text-[13px] font-semibold text-[color:var(--color-text-weak)]">기초 공사 체크리스트</p>
        {pagesDone ? (
          <div className="mt-2 flex items-center justify-between rounded-[14px] bg-emerald-50 px-4 py-3">
            <span className="text-[13px] font-bold text-emerald-700">신뢰 페이지 4종 완료 (소개·운영자·문의·개인정보)</span>
            <button onClick={makeTrustPages} disabled={pagesBusy} className="text-[12px] font-semibold text-emerald-600/70 underline underline-offset-2">{pagesBusy ? "갱신 중…" : "다시 만들기"}</button>
          </div>
        ) : (
        <button onClick={makeTrustPages} disabled={pagesBusy} className="at-press mt-2 flex w-full items-center justify-center gap-1.5 rounded-[14px] tk-grad-cta py-3.5 text-[14px] font-bold text-white disabled:opacity-60">
          {pagesBusy ? <><span className="tk-wand" aria-hidden>✦</span>신뢰 페이지를 짓고 있어요…</> : "✦ 신뢰 페이지 4종 자동 만들기 (소개·운영자·문의·개인정보)"}
        </button>
        )}
        <div className="mt-2 overflow-hidden rounded-[20px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          {SETUP_ITEMS.map((it, i) => (
            <div key={it.k} className={i > 0 ? "border-t border-[color:var(--color-line)]" : ""}>
              <button onClick={() => setHelpOpen(helpOpen === it.k ? null : it.k)} className="flex min-h-[56px] w-full items-center gap-3 px-5 py-4 text-left">
                <span onClick={(e) => { e.stopPropagation(); toggleSetup(it.k); }} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${setup[it.k] ? "tk-grad-cta border-transparent" : "border-neutral-200"}`}>
                  {setup[it.k] && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                </span>
                <span className={`min-w-0 flex-1 text-[14px] font-semibold ${setup[it.k] ? "text-neutral-300 line-through" : "text-[color:var(--color-text)]"}`}>{it.t}</span>
                <svg className={`shrink-0 text-neutral-300 transition-transform ${helpOpen === it.k ? "rotate-180" : ""}`} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {helpOpen === it.k && (
                <ol className="space-y-1.5 px-5 pb-4 pl-14 text-[13px] leading-relaxed text-neutral-500">
                  {it.steps.map((st, j) => <li key={j}><b className="text-neutral-800">{j + 1}.</b> {st}</li>)}
                </ol>
              )}
            </div>
          ))}
        </div>
      </div>

      {toast && <div className="ateflo-fade-in fixed left-1/2 top-6 z-[80] -translate-x-1/2 rounded-full at-glass-strong px-4 py-2.5 text-[13px] font-bold text-neutral-700 shadow-lg">{toast}</div>}

      {/* 블로그 스위처 시트(미니 — Home과 동일 문법) */}
      {blogSheet && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setBlogSheet(false)}>
          <div className="ateflo-sheet-up w-full max-w-md at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <p className="text-[17px] font-bold text-neutral-900">내 블로그</p>
            <div className="mt-3 space-y-2">
              {blogList.map((b) => (
                <button key={b.id} onClick={async () => {
                  if (b.is_active) { setBlogSheet(false); return; }
                  const r = await fetch("/api/blogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activate: b.id }) });
                  if (r.ok) { try { sessionStorage.clear(); } catch { /* ignore */ } window.location.reload(); }
                }} className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-3.5 text-left tk-tr ${b.is_active ? "bg-[color:var(--color-brand-weak)]" : "bg-[#F7F8FA] hover:bg-[#EFF2F6]"}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-[color:var(--color-text)]">{b.blog_name ?? "내 블로그"}</span>
                    {b.sub_category && <span className="mt-0.5 block text-[12px] text-[color:var(--color-text-weak)]">{b.sub_category}</span>}
                  </span>
                  {b.is_active && <span className="shrink-0 text-[12px] font-bold text-[color:var(--color-brand)]">사용 중</span>}
                </button>
              ))}
            </div>
            {onAddBlog && (
              <button onClick={() => { setBlogSheet(false); onAddBlog(); }} className="at-press mt-3 w-full rounded-[14px] border border-dashed border-[color:var(--color-text-weak)]/40 py-3.5 text-[14px] font-semibold text-[color:var(--color-text-sub)]">새 블로그 만들기</button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
