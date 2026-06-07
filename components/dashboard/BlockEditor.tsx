"use client";

import { useRef, useState } from "react";

// 블록형 비주얼 에디터 v1. 문단/소제목/리스트/이미지/링크 블록.
// 블록 사이 hover → + → 이미지/링크 삽입. 텍스트는 그 자리에서 수정.
type Block =
  | { id: string; kind: "text"; tag: "h2" | "h3" | "p"; html: string }
  | { id: string; kind: "list"; html: string }
  | { id: string; kind: "image"; src: string; alt: string }
  | { id: string; kind: "link"; href: string; text: string };

const uid = () => Math.random().toString(36).slice(2);

export function parseHtml(html: string): Block[] {
  if (typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root");
  const blocks: Block[] = [];
  root?.childNodes.forEach((node) => {
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "h2" || tag === "h3" || tag === "p") {
      blocks.push({ id: uid(), kind: "text", tag: tag as "h2" | "h3" | "p", html: el.innerHTML });
    } else if (tag === "ul" || tag === "ol") {
      blocks.push({ id: uid(), kind: "list", html: el.outerHTML });
    } else if (tag === "figure" || tag === "img") {
      const img = el.tagName === "IMG" ? (el as HTMLImageElement) : el.querySelector("img");
      if (img) blocks.push({ id: uid(), kind: "image", src: img.getAttribute("src") ?? "", alt: img.getAttribute("alt") ?? "" });
    } else {
      blocks.push({ id: uid(), kind: "text", tag: "p", html: el.innerHTML });
    }
  });
  return blocks;
}

const esc = (s: string) => s.replace(/"/g, "&quot;");

export function serialize(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.kind === "text") return `<${b.tag}>${b.html}</${b.tag}>`;
      if (b.kind === "list") return b.html;
      if (b.kind === "image") return `<figure><img src="${esc(b.src)}" alt="${esc(b.alt)}" /></figure>`;
      return `<p><a href="${esc(b.href)}" target="_blank" rel="noopener">${b.text}</a></p>`;
    })
    .join("\n");
}

export default function BlockEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseHtml(initialHtml));
  const [menuAt, setMenuAt] = useState<number | null>(null); // 삽입 위치(index)
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingInsert = useRef<number>(0);

  function commit(next: Block[]) {
    setBlocks(next);
    onChange(serialize(next));
  }

  function insertAt(index: number, block: Block) {
    const next = [...blocks];
    next.splice(index, 0, block);
    commit(next);
    setMenuAt(null);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    commit(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  }

  function removeBlock(id: string) {
    commit(blocks.filter((b) => b.id !== id));
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      insertAt(pendingInsert.current, { id: uid(), kind: "image", src: String(reader.result), alt: "" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function addLink(index: number) {
    const text = prompt("링크에 표시할 텍스트");
    if (!text) return;
    const href = prompt("링크 주소 (https://...)");
    if (!href) return;
    insertAt(index, { id: uid(), kind: "link", href, text });
  }

  // 블록 사이 + 인서터
  const Inserter = ({ index }: { index: number }) => (
    <div className="group relative flex h-5 items-center justify-center">
      <div className="h-px w-full bg-transparent transition group-hover:bg-neutral-200" />
      <div className="absolute flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        {menuAt === index ? (
          <>
            <button
              onClick={() => { pendingInsert.current = index; fileRef.current?.click(); }}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs shadow-sm hover:border-neutral-900"
            >
              🖼 이미지
            </button>
            <button
              onClick={() => addLink(index)}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs shadow-sm hover:border-neutral-900"
            >
              🔗 링크
            </button>
            <button onClick={() => setMenuAt(null)} className="px-1 text-xs text-neutral-400">✕</button>
          </>
        ) : (
          <button
            onClick={() => setMenuAt(index)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 shadow-sm hover:border-neutral-900 hover:text-neutral-900"
          >
            +
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
      <Inserter index={0} />
      {blocks.map((b, i) => (
        <div key={b.id}>
          <div className="group/blk relative">
            <button
              onClick={() => removeBlock(b.id)}
              className="absolute -left-6 top-1 hidden text-xs text-neutral-300 hover:text-red-500 group-hover/blk:block"
              title="삭제"
            >
              ✕
            </button>
            {b.kind === "image" ? (
              <figure className="my-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.alt} className="max-h-72 rounded-lg" />
                <input
                  value={b.alt}
                  onChange={(e) => updateBlock(b.id, { alt: e.target.value })}
                  placeholder="이미지 설명(alt) — SEO에 중요"
                  className="mt-1 w-full rounded border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-neutral-900"
                />
              </figure>
            ) : b.kind === "link" ? (
              <p className="my-1 text-sm">
                <a href={b.href} className="text-blue-600 underline" target="_blank" rel="noreferrer">{b.text}</a>
              </p>
            ) : (
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateBlock(b.id, { html: e.currentTarget.innerHTML } as Partial<Block>)}
                dangerouslySetInnerHTML={{ __html: b.kind === "list" ? b.html : b.html }}
                className={
                  b.kind === "list"
                    ? "prose prose-sm max-w-none py-1 outline-none focus:bg-neutral-50"
                    : b.tag === "h2"
                    ? "py-1 text-lg font-semibold outline-none focus:bg-neutral-50"
                    : b.tag === "h3"
                    ? "py-1 text-base font-semibold outline-none focus:bg-neutral-50"
                    : "py-1 text-sm leading-relaxed text-neutral-700 outline-none focus:bg-neutral-50"
                }
              />
            )}
          </div>
          <Inserter index={i + 1} />
        </div>
      ))}
    </div>
  );
}
