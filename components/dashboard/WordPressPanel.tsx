"use client";

import { useState, useEffect } from "react";

const GUIDE_STEPS = [
  "워드프레스 관리자(wp-admin)에 로그인해요.",
  "‘사용자 → 프로필’ 화면으로 가요.",
  "아래로 내려 ‘애플리케이션 비밀번호’ 칸을 찾아요.",
  "이름(예: AteFlo)을 적고 ‘새 애플리케이션 비밀번호 추가’를 눌러요.",
  "만들어진 비밀번호(공백 포함)를 복사해 아래에 붙여넣어요.",
];

export default function WordPressPanel({
  siteUrl,
  onConnected,
  onDisconnected,
  onOpenGuide,
  onOpenSitemapGuide,
}: {
  siteUrl: string | null;
  onConnected: (siteUrl: string) => void;
  onDisconnected: () => void;
  onOpenGuide?: () => void;
  onOpenSitemapGuide?: () => void;
}) {
  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 시작 가이드 진행 상태 (중간에 나갔다 오면 '진행 중' 표시)
  const [guideDone, setGuideDone] = useState(0);
  const [guideTotal, setGuideTotal] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ateflo_wp_guide_progress");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          setGuideTotal(arr.length);
          setGuideDone(arr.filter(Boolean).length);
        }
      }
    } catch {
      // 무시
    }
  }, []);
  const guideInProgress = guideTotal > 0 && guideDone > 0 && guideDone < guideTotal;

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/wordpress/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: site, username, appPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "연결하지 못했어요. 입력 정보를 확인하고 다시 시도해 주세요.");
        return;
      }
      onConnected(data.siteUrl);
      setSite("");
      setUsername("");
      setAppPassword("");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    await fetch("/api/wordpress/connect", { method: "DELETE" });
    onDisconnected();
  }

  if (siteUrl) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">워드프레스 연결됨</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            {siteUrl}
          </p>
          <p className="mt-4 text-sm text-neutral-500">이제 글 목록에서 글을 열어 바로 발행할 수 있어요.</p>
          <button
            onClick={disconnect}
            className="mt-6 rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium transition active:scale-95 hover:border-red-400 hover:text-red-600"
          >
            연결 해제
          </button>
        </div>

        {/* 구글 등록(사이트맵) 안내 — 글을 써도 구글이 모르면 검색에 안 뜸 */}
        {onOpenSitemapGuide && (
          <button
            onClick={onOpenSitemapGuide}
            className="flex w-full items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-5 text-left shadow-sm transition active:scale-[0.99] hover:border-neutral-300"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3f91ff]/10 text-[#3f91ff]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-3.5-3.5M8 11h6M11 8v6" /></svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-neutral-900">구글에 내 블로그 등록하기</span>
              <span className="mt-0.5 block text-xs text-neutral-500">한 번만 등록하면 검색에 잡혀요. 따라하기 가이드 →</span>
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">워드프레스 사이트 연결</h2>
      <p className="mt-1 text-sm text-neutral-500">
        애플리케이션 비밀번호로 안전하게 연결해요. 일반 로그인 비밀번호가 아니에요.
      </p>

      {/* 워드프레스가 없는 사람을 위한 시작 가이드 버튼 → 풀페이지 가이드 */}
      {onOpenGuide && (
        <button
          type="button"
          onClick={onOpenGuide}
          className="mt-5 flex w-full items-center justify-between gap-3 rounded-xl border border-[#3f91ff]/30 bg-[#3f91ff]/5 px-4 py-3.5 text-left transition hover:bg-[#3f91ff]/10"
        >
          <span>
            <span className="block text-sm font-medium text-neutral-900">
              {guideInProgress ? "아직 진행 중이세요! 이어서 하기" : "워드프레스가 아직 없으세요?"}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">
              {guideInProgress ? `시작 가이드 ${guideDone}/${guideTotal}단계 완료` : "처음이어도 5분이면 끝, 따라하기 가이드"}
            </span>
          </span>
          <span className="shrink-0 text-lg" style={{ color: "#3f91ff" }}>→</span>
        </button>
      )}

      <ol className="mt-5 space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600">
        {GUIDE_STEPS.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs text-white">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <form onSubmit={connect} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">사이트 주소</label>
          <input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="https://myblog.com"
            className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">워드프레스 사용자명</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="예: admin, myblog"
            className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            워드프레스 관리자(wp-admin)에 로그인할 때 쓰는 아이디예요. (사람마다 달라요 — admin이 아닐 수 있어요)
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium">애플리케이션 비밀번호</label>
          <input
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            로그인 비밀번호가 <span className="font-medium">아니에요.</span> ‘사용자 → 프로필’에서 발급한 앱 비밀번호를 넣어주세요.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "연결 확인 중…" : "사이트 연결하기"}
        </button>
      </form>
    </div>
  );
}
