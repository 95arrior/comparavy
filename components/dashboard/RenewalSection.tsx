"use client";

// ★갱신 대상 섹션(2026-07-17 전략 회의) — 개정 시즌에 걸린 오래된 발행 글을 검토→다시 쓰기.
//  선정은 크론(revision-scan) 자동, 실행은 유저 검토 후(순위 살아 있는 글을 자동으로 덮어쓰지 않는다).
//  비어 있으면 아무것도 렌더하지 않는다 — 시즌 밖 대부분의 날엔 존재감 0.
import { useEffect, useState } from "react";
import GlassIcon from "@/components/GlassIcon";
import CenterToast from "@/components/dashboard/CenterToast";

interface RenewalItem {
  id: string;
  article_id: string;
  keyword: string;
  title: string | null;
  channel: string | null;
  season_label: string;
  naver_url: string | null;
}

export default function RenewalSection({ onRewritten }: { onRewritten?: (articleId: string, bodyHtml: string) => void }) {
  const [items, setItems] = useState<RenewalItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    let alive = true;
    fetch("/api/renewal")
      .then((r) => r.json())
      .then((d) => { if (alive && d?.enabled && Array.isArray(d.items)) setItems(d.items); })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  if (!items.length) return null;

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id)); // 낙관적 — 실패해도 관대한 쪽(다음 마운트에 다시 보임)
    void fetch("/api/renewal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "dismiss" }) }).catch(() => null);
  };

  const rewrite = async (item: RenewalItem) => {
    if (busy) return;
    setBusy(item.id);
    try {
      const r = await fetch("/api/renewal/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; articleId?: string; channel?: string; body_html?: string; error?: string };
      if (r.ok && d?.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        if (d.articleId && d.body_html) onRewritten?.(String(d.articleId), String(d.body_html));
        notify(d.channel === "naver" ? "최신 기준으로 다시 썼어요 · 아래에서 열어 수정 복붙하세요" : "최신 기준으로 다시 썼어요 · 아래에서 열어 발행하세요");
      } else notify(d?.error ?? "다시 쓰지 못했어요. 잠시 후 다시 시도해 주세요.");
    } catch {
      notify("네트워크 오류예요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(null);
  };

  return (
    <section className="ateflo-page-in mt-5">
      <div className="at-glass overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 px-5 pt-4">
          <GlassIcon name="refresh" tint="blue" size={32} />
          <div className="min-w-0">
            <p className="text-[15px] font-bold" style={{ color: "var(--color-text)" }}>갱신할 때가 된 글</p>
            <p className="text-[12px]" style={{ color: "var(--color-text-weak)" }}>제도 개정 시즌 · 낡은 수치를 최신 기준으로(다시 쓰기 = 글 1편 크레딧)</p>
          </div>
        </div>
        <div className="mt-3 divide-y divide-black/5">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium" style={{ color: "var(--color-text)" }}>{i.title ?? i.keyword}</p>
                <p className="mt-0.5 truncate text-[12px]" style={{ color: "var(--color-text-weak)" }}>{i.season_label}{i.channel === "naver" ? " · 네이버" : " · 워드프레스"}</p>
              </div>
              <button type="button" onClick={() => dismiss(i.id)} disabled={busy != null} className="shrink-0 text-[13px] text-neutral-400 hover:text-neutral-600 disabled:opacity-50">
                무시
              </button>
              <button type="button" onClick={() => rewrite(i)} disabled={busy != null} className="at-press tk-grad-cta shrink-0 rounded-[12px] px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-60">
                {busy === i.id ? "다시 쓰는 중…" : "다시 쓰기"}
              </button>
            </div>
          ))}
        </div>
      </div>
      <CenterToast message={toast} />
    </section>
  );
}
