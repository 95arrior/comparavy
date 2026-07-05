"use client";

import { useState } from "react";
import CategoryPicker from "./CategoryPicker";


// ★워드프레스 블로그 온보딩(Phase 2) — 네이버 온보딩과 완전 분리(무변경 원칙).
//  80대 규격: 한 화면 한 질문, 모르는 말은 그 자리에서 접이식 설명. 토스식 카피.
type Step = "topic" | "hosting" | "mode" | "connect" | "done";

export default function WpOnboarding({ onSaved, onCancel }: { onSaved: (p: unknown) => void; onCancel: () => void }) {
  const [step, setStep] = useState<Step>("topic");
  const [sub, setSub] = useState("");
  const [blogName, setBlogName] = useState("");
  const [mode, setMode] = useState<"review" | "daily">("review");
  const [hour, setHour] = useState(7);
  const [siteUrl, setSiteUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [appPw, setAppPw] = useState("");
  const [pwHelp, setPwHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      // ① 블로그(프로필) 생성 — WP 채널
      const res = await fetch("/api/blog-profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical: "online", sub_category: sub, blog_name: blogName.trim() || `${sub} 블로그`, publish_mode: "manual", createNew: true, channel: "wordpress", auto_publish: mode, auto_publish_hour: hour }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d?.error ?? "저장하지 못했어요."); setBusy(false); return; }
      // ② WP 연결(새 활성 블로그에 귀속)
      const c = await fetch("/api/wordpress/connect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: siteUrl.trim(), username: wpUser.trim(), appPassword: appPw.trim() }),
      });
      const cd = await c.json();
      if (!c.ok) { setError(cd?.error ?? "워드프레스에 연결하지 못했어요. 주소·아이디·앱 비밀번호를 확인해 주세요."); setBusy(false); return; }
      setStep("done");
      setTimeout(() => { onSaved(d.profile); try { window.location.reload(); } catch { /* ignore */ } }, 1600);
    } catch { setError("네트워크 오류예요. 잠시 후 다시 시도해 주세요."); }
    setBusy(false);
  }

  const primaryBtn = "at-press w-full rounded-xl tk-grad-cta py-3.5 text-[15px] font-semibold text-white transition disabled:opacity-50";
  const ghostBtn = "mt-2 w-full py-2 text-center text-[13px] font-medium text-neutral-400 transition hover:text-neutral-600";

  return (
    <div className="mx-auto max-w-md px-5 pb-16 pt-8">
      {step === "topic" && (
        <div className="at-rise">
          <p className="text-[22px] font-bold leading-snug text-neutral-900">워드프레스 블로그,<br />어떤 주제로 키울까요?</p>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">구글에서 오래 검색되는 자산이 돼요. 네이버 블로그와 다른 주제를 추천해요.</p>
          <div className="mt-5"><CategoryPicker value={sub} onSelect={(s) => setSub(s.value)} /></div>
          {sub && <p className="mt-2 text-[13px] font-bold text-[#1D75F7]">{sub} 주제로 시작할게요</p>}
          <input value={blogName} onChange={(e) => setBlogName(e.target.value.slice(0, 40))} placeholder="블로그 이름 (비우면 자동)"
            className="mt-4 w-full rounded-xl bg-neutral-100 px-4 py-3.5 text-base outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30" />
          <button onClick={() => setStep("hosting")} disabled={!sub} className={`${primaryBtn} mt-5`}>다음</button>
          <button onClick={onCancel} className={ghostBtn}>취소</button>
        </div>
      )}

      {step === "hosting" && (
        <div className="at-rise">
          <p className="text-[22px] font-bold leading-snug text-neutral-900">워드프레스 사이트가<br />이미 있나요?</p>
          <div className="mt-5 space-y-2">
            <button onClick={() => setStep("mode")} className="at-press w-full rounded-2xl bg-white p-4 text-left ring-1 ring-black/[0.05] transition hover:ring-[#1D75F7]/40">
              <span className="block text-[15px] font-bold text-neutral-900">네, 있어요</span>
              <span className="mt-0.5 block text-[12.5px] text-neutral-400">바로 연결할게요</span>
            </button>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/[0.05]">
              <span className="block text-[15px] font-bold text-neutral-900">아직 없어요</span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-neutral-500">10분이면 만들 수 있어요. 순서대로 따라 하세요.</span>
              <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-neutral-600">
                <li><b className="text-neutral-900">1.</b> 카페24에서 <b className="text-neutral-900">‘매니지드 워드프레스’</b>를 검색해 신청해요 (월 5천 원대)</li>
                <li><b className="text-neutral-900">2.</b> 도메인(내 주소)을 함께 고르라고 나오면 원하는 이름으로 정해요</li>
                <li><b className="text-neutral-900">3.</b> 신청이 끝나면 워드프레스가 자동으로 설치돼요 — 관리자 아이디·비밀번호를 꼭 메모하세요</li>
                <li><b className="text-neutral-900">4.</b> 설치 완료 문자·메일이 오면 여기로 돌아오세요</li>
              </ol>
              <a href="https://hosting.cafe24.com/?controller=new_product_wp" target="_blank" rel="noopener" className="at-press mt-3 block w-full rounded-xl bg-neutral-100 py-2.5 text-center text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-200">카페24 열기</a>
              <button onClick={() => setStep("mode")} className="at-press mt-2 w-full rounded-xl bg-[#1D75F7]/[0.07] py-2.5 text-center text-[13px] font-bold text-[#1D75F7]">만들고 왔어요</button>
            </div>
          </div>
          <button onClick={() => setStep("topic")} className={ghostBtn}>이전</button>
        </div>
      )}

      {step === "mode" && (
        <div className="at-rise">
          <p className="text-[22px] font-bold leading-snug text-neutral-900">글은 이렇게<br />자동으로 올라가요</p>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">매일 정한 시간에 글이 준비돼요. 방식만 골라주세요.</p>
          <div className="mt-5 space-y-2">
            {[
              { k: "review" as const, t: "아침에 확인하고 발행 (추천)", d: "준비된 글을 읽어보고 버튼 한 번으로 발행해요 — 품질을 지키는 방식이에요." },
              { k: "daily" as const, t: "완전 자동", d: "확인 없이 매일 자동 발행돼요. 편하지만 가끔 검토를 권해요." },
            ].map((o) => (
              <button key={o.k} onClick={() => setMode(o.k)} className={`at-press w-full rounded-2xl p-4 text-left transition ${mode === o.k ? "bg-[#1D75F7]/[0.06] ring-1 ring-[#1D75F7]" : "bg-white ring-1 ring-black/[0.05]"}`}>
                <span className="block text-[15px] font-bold text-neutral-900">{o.t}</span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-neutral-500">{o.d}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[13px] font-bold text-neutral-700">글이 준비되는 시간</p>
          <div className="mt-2 flex gap-1.5">
            {[6, 7, 8, 9].map((h) => (
              <button key={h} onClick={() => setHour(h)} className={`at-press flex-1 rounded-[10px] py-2 text-[13px] font-bold transition ${hour === h ? "bg-[#1D75F7]/[0.08] text-[#1D75F7] ring-1 ring-[#1D75F7]/40" : "bg-neutral-50 text-neutral-500"}`}>아침 {h}시</button>
            ))}
          </div>
          <button onClick={() => setStep("connect")} className={`${primaryBtn} mt-5`}>다음</button>
          <button onClick={() => setStep("hosting")} className={ghostBtn}>이전</button>
        </div>
      )}

      {step === "connect" && (
        <div className="at-rise">
          <p className="text-[22px] font-bold leading-snug text-neutral-900">내 워드프레스를<br />연결할게요</p>
          <div className="mt-5 space-y-2.5">
            <input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="사이트 주소 (예: https://myblog.com)"
              className="w-full rounded-xl bg-neutral-100 px-4 py-3.5 text-[15px] outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30" />
            <input value={wpUser} onChange={(e) => setWpUser(e.target.value)} placeholder="워드프레스 아이디"
              className="w-full rounded-xl bg-neutral-100 px-4 py-3.5 text-[15px] outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30" />
            <input value={appPw} onChange={(e) => setAppPw(e.target.value)} placeholder="응용 프로그램 비밀번호"
              className="w-full rounded-xl bg-neutral-100 px-4 py-3.5 text-[15px] outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30" />
          </div>
          <button onClick={() => setPwHelp((v) => !v)} className="mt-3 text-[13px] font-bold text-[#1D75F7]">응용 프로그램 비밀번호가 뭐죠?</button>
          {pwHelp && (
            <ol className="mt-2 space-y-1.5 rounded-xl bg-neutral-50 p-4 text-[13px] leading-relaxed text-neutral-600">
              <li><b className="text-neutral-900">1.</b> 내 워드프레스 관리자(주소 뒤에 /wp-admin)에 로그인해요</li>
              <li><b className="text-neutral-900">2.</b> 왼쪽 메뉴에서 <b className="text-neutral-900">사용자 → 프로필</b>을 눌러요</li>
              <li><b className="text-neutral-900">3.</b> 아래로 내려 <b className="text-neutral-900">‘응용 프로그램 비밀번호’</b>를 찾아요</li>
              <li><b className="text-neutral-900">4.</b> 이름에 ‘ateflo’라고 적고 <b className="text-neutral-900">추가</b>를 눌러요</li>
              <li><b className="text-neutral-900">5.</b> 화면에 나온 비밀번호를 복사해 위 칸에 붙여넣어요 (띄어쓰기 포함 그대로)</li>
            </ol>
          )}
          {error && <p className="mt-3 text-[12.5px] font-medium text-amber-600">{error}</p>}
          <button onClick={finish} disabled={!siteUrl.trim() || !wpUser.trim() || !appPw.trim() || busy} className={`${primaryBtn} mt-5`}>
            {busy ? "연결하는 중…" : "연결하고 시작하기"}
          </button>
          <button onClick={() => setStep("mode")} className={ghostBtn}>이전</button>
        </div>
      )}

      {step === "done" && (
        <div className="at-rise pt-16 text-center">
          <p className="text-[22px] font-bold text-neutral-900">연결 완료!</p>
          <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">내일 아침 {hour}시에 첫 글이 준비돼요.<br />남은 설정(구글 검색 등록)은 홈에서 하나씩 안내할게요.</p>
        </div>
      )}
    </div>
  );
}
