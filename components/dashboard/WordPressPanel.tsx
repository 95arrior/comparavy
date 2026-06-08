"use client";

import { useState, useEffect } from "react";

const GUIDE_STEPS = [
  "워드프레스 관리자(wp-admin)에 로그인합니다.",
  "‘사용자 → 프로필’ 화면으로 이동합니다.",
  "아래로 스크롤해 ‘애플리케이션 비밀번호’ 섹션을 찾습니다.",
  "이름(예: AteFlo)을 입력하고 ‘새 애플리케이션 비밀번호 추가’를 누릅니다.",
  "생성된 비밀번호(공백 포함)를 복사해 아래에 붙여넣습니다.",
];

export default function WordPressPanel({
  siteUrl,
  onConnected,
  onDisconnected,
  onOpenGuide,
}: {
  siteUrl: string | null;
  onConnected: (siteUrl: string) => void;
  onDisconnected: () => void;
  onOpenGuide?: () => void;
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
        setError(data.error ?? "연결에 실패했습니다.");
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
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">워드프레스 연결됨</h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          {siteUrl}
        </p>
        <p className="mt-4 text-sm text-neutral-500">이제 글 목록에서 글을 열어 바로 발행할 수 있습니다.</p>
        <button
          onClick={disconnect}
          className="mt-6 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium transition hover:border-red-400 hover:text-red-600"
        >
          연결 해제
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">워드프레스 사이트 연결</h2>
      <p className="mt-1 text-sm text-neutral-500">
        애플리케이션 비밀번호로 안전하게 연결합니다. 일반 로그인 비밀번호가 아닙니다.
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
            placeholder="admin"
            className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">애플리케이션 비밀번호</label>
          <input
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "연결 확인 중…" : "사이트 연결하기"}
        </button>
      </form>
    </div>
  );
}
