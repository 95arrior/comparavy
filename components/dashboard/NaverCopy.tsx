"use client";

import { useState } from "react";

// 네이버 블로그용 복사 — 네이버 에디터는 HTML이 깨져서, 구조(제목·소제목·문단·목록)를
// 살린 '깔끔한 텍스트'로 바꿔 복사한다. (서버 호출 없음·즉시)
function toNaverText(html: string, title: string): string {
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const out: string[] = [];
  if (title.trim()) out.push(title.trim(), "");

  const walk = (el: Element) => {
    for (const node of Array.from(el.children)) {
      const tag = node.tagName.toLowerCase();
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (tag === "ul" || tag === "ol") {
        node.querySelectorAll(":scope > li").forEach((li) => {
          const t = (li.textContent || "").replace(/\s+/g, " ").trim();
          if (t) out.push(`· ${t}`);
        });
        out.push("");
      } else if (tag === "h1" || tag === "h2" || tag === "h3") {
        if (text) out.push("", text, "");
      } else if (tag === "p") {
        if (text) out.push(text, "");
      } else if (tag === "div" || tag === "section") {
        walk(node); // 래퍼면 한 단계 들어감
      } else if (text) {
        out.push(text, "");
      }
    }
  };
  walk(doc.body);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export default function NaverCopy({
  getHtml,
  title,
  onToast,
}: {
  getHtml: () => string;
  title: string;
  onToast: (m: string) => void;
}) {
  const [text, setText] = useState("");

  function build() {
    setText(toNaverText(getHtml(), title));
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      onToast("네이버용 글을 복사했어요. 네이버 글쓰기에 붙여넣으세요.");
    } catch {
      onToast("복사에 실패했어요. 글을 길게 눌러 직접 복사해 주세요.");
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#03C75A] text-[13px] font-black text-white">N</span>
        <p className="text-sm font-bold text-neutral-900">네이버 블로그에 올리기</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">네이버는 글이 깨지기 쉬워서, 보기 좋게 정리한 글로 바꿔드려요.</p>

      {!text ? (
        <button onClick={build} className="mt-3 rounded-xl border border-[#03C75A] px-3.5 py-2 text-sm font-semibold text-[#03C75A] transition hover:bg-[#03C75A]/5 active:scale-95">
          네이버용으로 정리
        </button>
      ) : (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(18, Math.max(8, text.split("\n").length + 1))}
            className="w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[13.5px] leading-relaxed text-neutral-800 focus:border-[#03C75A] focus:outline-none"
          />
          <div className="mt-1.5 flex items-center justify-end gap-2">
            <button onClick={copy} className="rounded-lg bg-[#03C75A] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 active:scale-95">복사하기</button>
            <a
              href="https://blog.naver.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-neutral-300 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-900"
            >
              네이버 블로그 열기 →
            </a>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
            붙여넣은 뒤, 소제목은 굵게 처리하면 보기 좋아요. 사진은 직접 올리세요.
          </p>
        </div>
      )}
    </div>
  );
}
