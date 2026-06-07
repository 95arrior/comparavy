"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

/* ── 아이콘 (라인, currentColor) ─────────────────────────── */
const S = ({ d, fill = false }: { d: string; fill?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IconBold = () => <S d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />;
const IconH2 = () => (
  <svg width="20" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6v12M12 6v12M4 12h8" /><path d="M16 10c0-1.5 1.2-2.5 2.7-2.5S21.5 8.5 21.5 10c0 2.5-5 3-5 6h5" strokeWidth="1.7" /></svg>
);
const IconH3 = () => (
  <svg width="20" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6v12M11 6v12M4 12h7" /><path d="M16 8h4l-2.5 3a2.2 2.2 0 1 1-1.7 3.6" strokeWidth="1.7" /></svg>
);
const IconList = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></svg>;
const IconOrderedList = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11" /><text x="1.5" y="8" fontSize="7" fill="currentColor" stroke="none">1</text><text x="1.5" y="14" fontSize="7" fill="currentColor" stroke="none">2</text><text x="1.5" y="20" fontSize="7" fill="currentColor" stroke="none">3</text></svg>;
const IconLink = () => <S d="M9 15l6-6M10.5 6.5l1.8-1.8a4 4 0 0 1 5.7 5.7L15.5 12M13.5 17.5l-1.8 1.8a4 4 0 0 1-5.7-5.7L8.5 12" />;
const IconImage = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5L5 20" /></svg>;
const IconAlignLeft = () => <S d="M4 6h16M4 12h10M4 18h13" />;
const IconAlignCenter = () => <S d="M4 6h16M7 12h10M5 18h14" />;
const IconAlignRight = () => <S d="M4 6h16M10 12h10M7 18h13" />;
const IconAlignFull = () => <S d="M4 6h16M4 12h16M4 18h16" />;
const IconTrash = () => <S d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />;
const IconTable = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 10h18M3 15h18M9 4v16M15 4v16" /></svg>;
const IconUndo = () => <S d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-1" />;
const IconRedo = () => <S d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h1" />;
const IconOpen = () => <S d="M14 5h5v5M19 5l-8 8M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />;

/* ── 이미지 노드 (정렬 + 하단 설명) ─────────────────────────── */
const ALIGNS = [
  { k: "left", t: "왼쪽", Icon: IconAlignLeft },
  { k: "center", t: "가운데", Icon: IconAlignCenter },
  { k: "right", t: "오른쪽", Icon: IconAlignRight },
  { k: "full", t: "꽉 채움", Icon: IconAlignFull },
] as const;

function ImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { src, align, caption, alt } = node.attrs as { src: string; align: string; caption: string; alt: string };
  return (
    <NodeViewWrapper as="figure" className={`align-${align} group relative`}>
      <span className="relative inline-block max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={caption || alt || ""} className={selected ? "ring-2 ring-blue-500" : ""} />
        <span
          contentEditable={false}
          className={`absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-black/70 px-1 py-0.5 text-white transition ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          {ALIGNS.map(({ k, t, Icon }) => (
            <button key={k} type="button" title={t} onClick={() => updateAttributes({ align: k })} className={`rounded p-1 ${align === k ? "text-white" : "text-white/55 hover:text-white"}`}>
              <Icon />
            </button>
          ))}
          <span className="mx-0.5 h-3.5 w-px bg-white/30" />
          <button type="button" title="삭제" onClick={() => deleteNode()} className="rounded p-1 text-white/55 hover:text-red-300"><IconTrash /></button>
        </span>
      </span>
      <figcaption contentEditable={false}>
        <input
          value={caption ?? ""}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          placeholder="이미지 설명 추가 (SEO에 좋아요)"
          className="w-full border-0 bg-transparent text-center text-sm text-neutral-500 outline-none placeholder:text-neutral-300"
        />
      </figcaption>
    </NodeViewWrapper>
  );
}

const EditorImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") || "",
        renderHTML: (attrs) => ({ "data-caption": attrs.caption }),
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const align = node.attrs.align || "center";
    const caption = node.attrs.caption || "";
    const img = ["img", mergeAttributes(HTMLAttributes, { alt: caption || node.attrs.alt || "" })];
    const children = caption ? [img, ["figcaption", {}, caption]] : [img];
    return ["figure", { class: `align-${align}` }, ...children];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

/* ── 에디터 ───────────────────────────────────────────────── */
export default function ArticleEditor({
  initialHtml,
  onChange,
  title,
  onTitleChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
  title?: string;
  onTitleChange?: (t: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener", target: "_blank" } },
      }),
      EditorImage.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: "내용을 입력하세요…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "ateflo-article" },
      // 붙여넣기 정리: 인라인 스타일/클래스/span·font 제거 (스키마가 나머지 정리)
      transformPastedHTML: (html) =>
        html
          .replace(/ style="[^"]*"/g, "")
          .replace(/ class="[^"]*"/g, "")
          .replace(/<\/?(span|font|o:p)[^>]*>/g, ""),
    },
  });

  if (!editor) return <div className="h-[60vh] rounded-xl border border-neutral-200" />;

  const activeHref = editor.isActive("link") ? ((editor.getAttributes("link").href as string) || "") : null;

  function openLink() {
    setLinkUrl((editor!.getAttributes("link").href as string) || "https://");
    setLinkOpen(true);
  }
  function applyLink() {
    const url = linkUrl.trim();
    if (url === "" || url === "https://") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkOpen(false);
  }
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => editor!.chain().focus().setImage({ src: String(reader.result) }).run();
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const Btn = ({ onClick, active, title, disabled, children }: { onClick: () => void; active?: boolean; title: string; disabled?: boolean; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
        disabled
          ? "cursor-not-allowed text-neutral-300"
          : active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white shadow-md">
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2">
          <Btn title="실행취소 (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><IconUndo /></Btn>
          <Btn title="다시실행 (Ctrl+Shift+Z)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><IconRedo /></Btn>
          <span className="mx-1 h-5 w-px bg-neutral-200" />
          <Btn title="제목" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><IconH2 /></Btn>
          <Btn title="소제목" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><IconH3 /></Btn>
          <Btn title="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><IconBold /></Btn>
          <Btn title="목록" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><IconList /></Btn>
          <Btn title="번호 목록" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><IconOrderedList /></Btn>
          <span className="mx-1 h-5 w-px bg-neutral-200" />
          <Btn title="링크 (텍스트를 드래그한 뒤 클릭)" active={editor.isActive("link")} onClick={openLink}><IconLink /></Btn>
          <Btn title="이미지" onClick={() => fileRef.current?.click()}><IconImage /></Btn>
          <Btn title="표 (3×3)" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><IconTable /></Btn>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
        </div>
        {linkOpen && (
          <div className="flex items-center gap-2 border-t border-neutral-100 px-3 py-2">
            <input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkOpen(false); }}
              placeholder="https://..."
              className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
            <button type="button" onClick={applyLink} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white">적용</button>
            <button type="button" onClick={() => setLinkOpen(false)} className="rounded-md px-2 py-1.5 text-sm text-neutral-400">취소</button>
          </div>
        )}
        {activeHref && !linkOpen && (
          <div className="flex items-center gap-2 border-t border-neutral-100 px-3 py-2 text-sm">
            <span className="truncate text-neutral-500">🔗 {activeHref}</span>
            <a href={activeHref} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs hover:border-neutral-900">
              <IconOpen /> 열기
            </a>
            <button type="button" onClick={openLink} className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">편집</button>
            <button type="button" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()} className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50">해제</button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[720px] px-8 py-8">
        {onTitleChange && (
          <input
            value={title ?? ""}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="제목을 입력하세요 (검색에 노출되는 H1)"
            className={`font-pretendard mb-5 w-full bg-transparent text-3xl font-bold leading-tight text-neutral-900 outline-none placeholder:text-neutral-300 ${
              (title ?? "").trim() === "" ? "rounded-lg border border-dashed border-neutral-300 px-3 py-2" : ""
            }`}
          />
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
