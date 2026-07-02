"use client";

import { useState, useEffect } from "react";
import { ONLINE_CATEGORIES } from "@/lib/bloggerTypes";
import { defaultBlogName } from "@/lib/blogName";
import LoadingScreen from "@/components/LoadingScreen";
import type { BlogProfile } from "@/lib/blogProfile";

// ★온보딩 4막 — 화면이 아니라 '수익형 블로그 전략 세션'.
//  1막 주제 탐색: 주제를 고르면 실시간 검색 데이터로 시장을 판정해준다 (첫인상 = "얘네 데이터 있네")
//  2막 플랜: 선택 주제 기준 개인화 20일 승인 준비 플랜 + 첫 공략 키워드 미리보기
//  3막 세팅: 네이버 블로그 개설·설정 체크리스트(검증된 것만 확정 톤) + 블로그 아이디 연결
//  4막 시작: 프로필 저장 → 코스 D-1로
// 정직 원칙: 수익·승인을 보장하는 문구 금지. '시작점으로 최적' 프레임(시장 특성)까지만.

type Step = "topic" | "verdict" | "plan" | "setup" | "done";

// 주제별 수익성 참고 등급 — 광고 단가·상업성 기준(자료: 주제 수익성 맵). 보장 아님, 참고용.
const PROFIT: Record<string, { grade: "상" | "중상" | "중"; note: string }> = {
  "재테크·투자": { grade: "상", note: "광고 단가가 높은 대표 주제" },
  "IT·디지털·리뷰": { grade: "상", note: "제품 리뷰·제휴와 궁합이 좋아요" },
  "자동차": { grade: "상", note: "소재가 풍부하고 단가가 높아요" },
  "부업·N잡": { grade: "상", note: "검색 수요가 꾸준히 커요" },
  "쇼핑·제품리뷰": { grade: "중상", note: "체험단·제휴로 이어지기 좋아요" },
  "건강·다이어트": { grade: "중상", note: "수요 크지만 과장 표현 주의(우리가 자동 검토)" },
  "교육·정보": { grade: "중", note: "꾸준한 검색, 경쟁도 무난" },
  "살림·인테리어": { grade: "중", note: "생활 밀착형, 체험단 기회 많음" },
  "자기계발": { grade: "중", note: "팬이 쌓이면 강한 주제" },
  "여행": { grade: "중", note: "시즌을 타지만 사진 자산에 유리" },
};

interface KwLite { keyword: string; monthlyMobileQcCnt: number; compIdx: string }
interface Verdict { total: number; goldenCount: number; preview: KwLite[]; volumeSum: number }

// 한글 초성 검색
const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
function toCho(s: string): string {
  return [...s].map((ch) => {
    const code = ch.charCodeAt(0) - 0xac00;
    return code >= 0 && code <= 11171 ? CHO[Math.floor(code / 588)] : ch;
  }).join("");
}
function matchSub(chip: string, q: string): boolean {
  const query = q.replace(/\s/g, "");
  if (!query) return true;
  const c = chip.replace(/\s/g, "");
  if (c.includes(query)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(query)) return toCho(c).includes(query);
  return false;
}
function isGarbageInput(raw: string): boolean {
  const k = (raw ?? "").trim();
  const meaningful = k.match(/[가-힣a-zA-Z]/g) ?? [];
  if (meaningful.length < 2) return true;
  if (new Set(meaningful.map((c) => c.toLowerCase())).size < 2) return true;
  if (/^[a-zA-Z\s]+$/.test(k) && !/[aeiou]/i.test(k)) return true;
  return false;
}

export default function Onboarding({ onSaved, onCancel }: { onSaved: (p: BlogProfile) => void; onCancel?: () => void }) {
  const [step, setStep] = useState<Step>("topic");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [sub, setSub] = useState("");
  const [customSub, setCustomSub] = useState("");
  const [customErr, setCustomErr] = useState("");
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [blogName, setBlogName] = useState("");
  const [naverId, setNaverId] = useState("");
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<BlogProfile | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const inputCls = "w-full rounded-xl bg-neutral-100 px-4 py-3.5 text-base outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30";
  const primaryBtn = "at-press w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50";
  const ghostBtn = "mt-2 w-full py-2 text-sm font-medium text-neutral-400 transition hover:text-neutral-600 disabled:opacity-50";

  const order: Step[] = ["topic", "verdict", "plan", "setup", "done"];
  const idx = order.indexOf(step);
  const dots = order.filter((s) => s !== "done");
  const goBack = () => { setDir("back"); setStep(order[Math.max(idx - 1, 0)]); };

  // 1막 → 주제 선택 시 실시간 데이터 판정
  async function pickTopic(s: string) {
    setSub(s);
    setBlogName(defaultBlogName(s));
    setDir("fwd");
    setStep("verdict");
    setChecking(true);
    setVerdict(null);
    try {
      const res = await fetch("/api/keywords/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: s }),
      });
      const data = await res.json();
      const kws: KwLite[] = Array.isArray(data.keywords) ? data.keywords : [];
      const golden = kws.filter((k) => k.compIdx === "낮음");
      const preview = (golden.length >= 3 ? golden : kws).slice(0, 3);
      setVerdict({
        total: kws.length,
        goldenCount: golden.length,
        preview,
        volumeSum: kws.reduce((t, k) => t + (k.monthlyMobileQcCnt || 0), 0),
      });
    } catch {
      setVerdict({ total: 0, goldenCount: 0, preview: [], volumeSum: 0 });
    } finally {
      setChecking(false);
    }
  }
  function submitCustom() {
    const v = customSub.trim();
    if (!v) return;
    if (isGarbageInput(v)) { setCustomErr("그건 주제로 보기 어려워요. 다시 입력해 주세요."); return; }
    setCustomErr("");
    pickTopic(v);
  }

  async function save() {
    if (saving || !sub) return;
    setSaving(true); setError(null);
    try {
      // 네이버 블로그 아이디 — 발행 직행용(기기 저장)
      const id = naverId.trim().replace(/^https?:\/\//, "").replace(/^m\./, "").replace(/^blog\.naver\.com\//, "").replace(/[/?#].*$/, "").trim();
      try { if (id) localStorage.setItem("ateflo_naver_blogid", id); } catch { /* ignore */ }
      const res = await fetch("/api/blog-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical: "online", sub_category: sub, blog_name: blogName.trim() || defaultBlogName(sub), publish_mode: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "저장하지 못했어요."); return; }
      setSavedProfile(data.profile as BlogProfile);
      setDir("fwd"); setStep("done");
    } catch { setError("네트워크 오류예요. 잠시 후 다시 시도해 주세요."); }
    finally { setSaving(false); }
  }

  const profit = PROFIT[sub] ?? null;

  const footer =
    step === "verdict" && !checking ? (
      <>
        <button onClick={() => { setDir("fwd"); setStep("plan"); }} className={primaryBtn}>이 주제로 시작할게요</button>
        <button onClick={goBack} className={ghostBtn}>다른 주제 볼래요</button>
      </>
    ) : step === "plan" ? (
      <button onClick={() => { setDir("fwd"); setStep("setup"); }} className={primaryBtn}>좋아요, 이대로 갈게요</button>
    ) : step === "setup" ? (
      <>
        <button onClick={save} disabled={saving} className={primaryBtn}>{saving ? "준비 중…" : "설정 끝, 시작할게요"}</button>
        <button onClick={save} disabled={saving} className={ghostBtn}>블로그는 나중에 만들게요</button>
      </>
    ) : step === "done" ? (
      <button onClick={() => savedProfile && onSaved(savedProfile)} className={primaryBtn}>D-1 시작하기</button>
    ) : null;

  return (
    <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md px-6 pt-7 pb-4">
          {onCancel && step !== "done" && (
            <div className="mb-2 flex justify-end">
              <button onClick={onCancel} className="text-sm font-medium text-neutral-400 transition hover:text-neutral-700">취소</button>
            </div>
          )}

          {step !== "done" && (
            <div className="mb-8 flex items-center justify-center gap-1.5">
              {dots.map((s) => (
                <span key={s} className={`h-1.5 rounded-full transition-all ${s === step ? "w-5 bg-[#1D75F7]" : dots.indexOf(s) < dots.indexOf(step) ? "w-1.5 bg-[#1D75F7]/40" : "w-1.5 bg-neutral-200"}`} />
              ))}
            </div>
          )}

          {step !== "topic" && step !== "done" && (
            <button onClick={goBack} className="mb-3 -ml-1 flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-700">
              <span className="text-base leading-none">←</span> 뒤로
            </button>
          )}

          <div key={step} className={`min-h-[300px] ${dir === "back" ? "ateflo-slide-back" : "ateflo-slide-fwd"}`}>
            {/* ═══ 1막. 주제 탐색 ═══ */}
            {step === "topic" && (
              <div>
                <p className="at-label">수익형 블로그 전략 세션</p>
                <h2 className="at-headline mt-1 whitespace-pre-line">{"어떤 주제로\n수익을 낼까요?"}</h2>
                <p className="mt-2 text-sm text-neutral-500">주제를 고르면 실제 검색 데이터로 시장을 확인해드려요.</p>
                <div className="relative mt-4">
                  <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                  <input
                    value={customSub}
                    onChange={(e) => { setCustomSub(e.target.value); if (customErr) setCustomErr(""); }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const f = ONLINE_CATEGORIES.filter((s) => matchSub(s, customSub));
                      if (f.length === 1) pickTopic(f[0]);
                      else if (customSub.trim() && !ONLINE_CATEGORIES.includes(customSub.trim())) submitCustom();
                    }}
                    placeholder="검색 또는 직접 입력 (예: 재테크 · 캠핑)"
                    maxLength={40}
                    className={`${inputCls} pl-10`}
                  />
                </div>
                {customErr && <p className="mt-2 text-xs font-medium text-amber-600">{customErr}</p>}
                {(() => {
                  const filtered = ONLINE_CATEGORIES.filter((s) => matchSub(s, customSub));
                  const q = customSub.trim();
                  return (
                    <div className="no-scrollbar mt-3 max-h-[46vh] overflow-y-auto">
                      {filtered.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {filtered.map((s) => {
                            const g = PROFIT[s];
                            return (
                              <button key={s} onClick={() => pickTopic(s)} className="at-press flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-[#1D75F7] hover:bg-[#1D75F7]/[0.03]">
                                {s}
                                {g && g.grade === "상" && <span className="rounded bg-[#1D75F7]/10 px-1 py-0.5 text-[10px] font-bold text-[#1D75F7]">수익성 상</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {q && !ONLINE_CATEGORIES.includes(q) && (
                        <button onClick={submitCustom} className="at-press mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-[#1D75F7]/40 bg-[#1D75F7]/[0.04] px-4 py-3 text-left text-sm font-semibold text-[#1D75F7] transition hover:bg-[#1D75F7]/[0.07]">
                          ＋ ‘{q}’ 데이터 확인해보기
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ═══ 1.5막. 시장 판정 ═══ */}
            {step === "verdict" && (
              <div>
                <p className="at-label">시장 확인</p>
                <h2 className="at-headline mt-1">‘{sub}’</h2>
                {checking ? (
                  <div className="at-ai-swap mt-5 rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
                    <div className="ateflo-skel h-5 w-2/3 rounded" />
                    <div className="ateflo-skel mt-2.5 h-4 w-1/2 rounded" />
                    <p className="mt-3 text-[12px] font-semibold text-[#8b7cf7]">네이버 검색 데이터를 확인하고 있어요…</p>
                  </div>
                ) : verdict && (
                  <div className="mt-5 space-y-3">
                    {/* 판정 카드 */}
                    <div className="at-rise rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11.5px] font-semibold text-neutral-400">월 검색 규모</p>
                          <p className="mt-0.5 text-[19px] font-extrabold tracking-tight text-[color:var(--at-grey-900)]">
                            {verdict.volumeSum > 0 ? `${verdict.volumeSum.toLocaleString("ko-KR")}회+` : "확인 중"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11.5px] font-semibold text-neutral-400">경쟁 낮은 키워드</p>
                          <p className="mt-0.5 text-[19px] font-extrabold tracking-tight text-emerald-600">
                            {verdict.goldenCount > 0 ? `${verdict.goldenCount}개 발견` : verdict.total > 0 ? "확장 탐색 필요" : "데이터 준비 중"}
                          </p>
                        </div>
                      </div>
                      {profit && (
                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#1D75F7]/[0.05] px-3.5 py-2.5">
                          <span className="rounded-md bg-[#1D75F7] px-1.5 py-0.5 text-[11px] font-bold text-white">수익성 {profit.grade}</span>
                          <span className="text-[12.5px] font-medium text-neutral-600">{profit.note}</span>
                        </div>
                      )}
                    </div>
                    {/* 미리보기 키워드 */}
                    {verdict.preview.length > 0 && (
                      <div className="at-rise at-d2 rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
                        <p className="text-[12px] font-bold text-neutral-400">시작하면 이런 키워드를 노려요</p>
                        <div className="mt-2.5 space-y-2">
                          {verdict.preview.map((k) => (
                            <div key={k.keyword} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1D75F7]" />
                              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-neutral-800">{k.keyword}</span>
                              <span className="shrink-0 text-[11.5px] text-neutral-400">월 {(k.monthlyMobileQcCnt || 0).toLocaleString("ko-KR")}회</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {verdict.total === 0 && (
                      <p className="text-[12.5px] leading-relaxed text-neutral-400">지금 데이터를 못 불러왔어요 — 시작하면 글감 추천에서 계속 찾아드려요.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══ 2막. 당신의 플랜 — 하나씩 크게, 순차 등장 (모바일 텍스트 과다 방지) ═══ */}
            {step === "plan" && (
              <div>
                <p className="at-label">{sub}</p>
                <h2 className="at-headline mt-1 whitespace-pre-line">{"당신의\n승인 준비 플랜"}</h2>
                <div className="mt-7 space-y-7">
                  {[
                    { n: "1", t: "매일 1편만 쓰면 돼요", s: "글감부터 완성까지 우리가 준비해요" },
                    { n: "2", t: "48시간 안에 검색 확인", s: "글 제목 그대로 검색하면 색인을 알 수 있어요" },
                    { n: "3", t: "20일 뒤, 승인 신청", s: "반려돼도 쌓다가 다시 신청하면 돼요" },
                  ].map((x, i) => (
                    <div key={x.n} className="at-rise flex items-start gap-4" style={{ animationDelay: `${0.25 + i * 0.5}s` }}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D75F7]/10 text-[16px] font-extrabold text-[#1D75F7]">{x.n}</span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[19px] font-extrabold leading-snug tracking-tight text-[color:var(--at-grey-900)]">{x.t}</p>
                        <p className="mt-1 text-[13px] text-neutral-400">{x.s}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="at-rise mt-9 px-1 text-[12px] leading-relaxed text-neutral-400" style={{ animationDelay: "1.8s" }}>
                  승인·수익은 심사와 노출에 따라 달라질 수 있어요. 우리는 확률을 높이는 준비를 함께해요.
                </p>
              </div>
            )}

            {/* ═══ 3막. 블로그 세팅 ═══ */}
            {step === "setup" && (
              <div>
                <p className="at-label">마지막 준비</p>
                <h2 className="at-headline mt-1 whitespace-pre-line">{"네이버 블로그를\n준비할게요"}</h2>
                <p className="mt-2 text-sm text-neutral-500">이미 있다면 아이디만 넣으면 돼요.</p>
                <div className="mt-4 space-y-2.5">
                  {[
                    { t: "네이버 블로그 만들기", s: `blog.naver.com에서 개설하고, 블로그 주제를 ‘${sub}’ 계열로 설정해요.` },
                    { t: "블로그 이름 정하기", s: "아래 추천 이름을 그대로 써도 좋아요." },
                    { t: "공개 설정 켜기", s: "관리 → 기본 설정에서 ‘검색 허용’ 등 공개 옵션을 전부 켜요. 글은 항상 전체공개로." },
                  ].map((x, i) => (
                    <button key={i} onClick={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))} className={`at-press flex w-full items-start gap-3 rounded-2xl p-4 text-left ring-1 transition ${checks[i] ? "bg-[#1D75F7]/[0.05] ring-[#1D75F7]/30" : "bg-white ring-black/[0.04]"}`}>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${checks[i] ? "bg-[#1D75F7] text-white" : "bg-neutral-100 text-transparent"}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-bold text-[color:var(--at-grey-900)]">{x.t}</span>
                        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-neutral-500">{x.s}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mb-1.5 mt-5 px-1 text-[12px] font-semibold text-neutral-400">블로그 이름 (추천)</p>
                <input value={blogName} onChange={(e) => setBlogName(e.target.value)} maxLength={60} className={inputCls} />
                <p className="mb-1.5 mt-3 px-1 text-[12px] font-semibold text-neutral-400">네이버 블로그 아이디 <span className="font-normal">— 발행할 때 바로 열어드려요</span></p>
                <input value={naverId} onChange={(e) => setNaverId(e.target.value)} placeholder="blog.naver.com/여기부분" maxLength={40} className={inputCls} />
              </div>
            )}

            {/* ═══ 4막. 완료 ═══ */}
            {step === "done" && (
              <div className="flex min-h-[58vh] flex-col items-center justify-center text-center">
                <span className="ateflo-circle-pop flex h-20 w-20 items-center justify-center rounded-full bg-[#1D75F7] text-white shadow-[0_12px_44px_rgba(29,117,247,0.45)]">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="ateflo-check-draw" d="M5 13l4 4L19 7" /></svg>
                </span>
                <h2 className="at-headline mt-6">전략 준비 완료</h2>
                <p className="mt-2.5 text-[15px] leading-relaxed text-neutral-600">‘{sub}’로 승인 준비 코스를 시작해요.<br />오늘 첫 글이 D-1이에요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {footer && (
        <div className="sticky bottom-0 z-20 border-t border-neutral-100 bg-white/95 px-6 pt-3.5 backdrop-blur" style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom))" }}>
          <div className="mx-auto max-w-md">{footer}</div>
        </div>
      )}
      {saving && <LoadingScreen label="전략을 저장하고 있어요" />}
    </div>
  );
}
