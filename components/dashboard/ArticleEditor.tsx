"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";

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

/* 글자 크기: TextStyle에 fontSize 속성 추가 */
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize || null,
        renderHTML: (attrs: { fontSize?: string | null }) =>
          attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },
});

/** 부모가 ref로 호출할 수 있는 에디터 명령 */
export interface ArticleEditorHandle {
  /** 본문 맨 아래에 HTML을 덧붙이고 그 위치로 스크롤 */
  appendContent: (html: string) => void;
  /** 저장 시점의 최신 본문 HTML을 직접 읽는다 (React 상태 지연과 무관) */
  getHTML: () => string | null;
}

/* ── 에디터 ───────────────────────────────────────────────── */
const ArticleEditor = forwardRef<ArticleEditorHandle, {
  initialHtml: string;
  onChange: (html: string) => void;
  title?: string;
  onTitleChange?: (t: string) => void;
  featuredImage?: string | null;
  onFeaturedChange?: (src: string | null) => void;
  originalHtml?: string;
  /** 스크롤 시 툴바가 고정될 상단 오프셋 (상위 고정 바와 겹치지 않게). 예: "top-[57px]" */
  toolbarOffset?: string;
}>(function ArticleEditor({
  initialHtml,
  onChange,
  title,
  onTitleChange,
  featuredImage,
  onFeaturedChange,
  originalHtml,
  toolbarOffset = "top-0",
}, ref) {
  const fileRef = useRef<HTMLInputElement>(null);
  const featRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNofollow, setLinkNofollow] = useState(false);

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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontSize,
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

  // 제목 textarea 높이 자동 조절(여러 줄 줄바꿈, 가로 스크롤 없음).
  // editor를 의존성에 넣어, 에디터 준비 후 텍스트영역이 마운트되면 초기 높이도 잡히게 한다.
  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title, editor]);

  useImperativeHandle(
    ref,
    () => ({
      appendContent: (html: string) => {
        if (!editor) return;
        editor.chain().focus("end").insertContent(html).run();
        // 추가된 위치(맨 끝)로 부드럽게 스크롤
        setTimeout(() => {
          document.querySelector(".ateflo-article")?.scrollIntoView({ block: "end", behavior: "smooth" });
        }, 50);
      },
      getHTML: () => editor?.getHTML() ?? null,
    }),
    [editor],
  );

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
      editor!.chain().focus().extendMarkRange("link").setLink({
        href: url,
        target: "_blank",
        rel: linkNofollow ? "noopener nofollow" : "noopener",
      }).run();
    }
    setLinkOpen(false);
  }
  function restoreOriginal() {
    if (!originalHtml) return;
    if (!window.confirm("지금 내용을 버리고 AI가 처음 쓴 글로 되돌릴까요?")) return;
    editor!.commands.setContent(originalHtml);
    onChange(originalHtml);
  }
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => editor!.chain().focus().setImage({ src: String(reader.result) }).run();
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  function onPickFeatured(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onFeaturedChange) return;
    const reader = new FileReader();
    reader.onload = () => onFeaturedChange(String(reader.result));
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
      <div className={`sticky ${toolbarOffset} z-20 border-b border-neutral-200 bg-white shadow-md`}>
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
          <Btn title="왼쪽 정렬" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><IconAlignLeft /></Btn>
          <Btn title="가운데 정렬" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><IconAlignCenter /></Btn>
          <Btn title="오른쪽 정렬" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><IconAlignRight /></Btn>
          <select
            title="글자 크기"
            value={(editor.getAttributes("textStyle").fontSize as string) ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              editor.chain().focus().setMark("textStyle", { fontSize: v || null }).run();
            }}
            className="ml-1 rounded-md border border-neutral-200 px-1.5 py-1 text-xs text-neutral-600 outline-none"
          >
            <option value="">크기</option>
            <option value="0.9rem">작게</option>
            <option value="1.15rem">크게</option>
            <option value="1.4rem">더 크게</option>
          </select>
          <span className="mx-1 h-5 w-px bg-neutral-200" />
          <Btn title="링크 (텍스트를 드래그한 뒤 클릭)" active={editor.isActive("link")} onClick={openLink}><IconLink /></Btn>
          <Btn title="이미지" onClick={() => fileRef.current?.click()}><IconImage /></Btn>
          <Btn title="표 (3×3)" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><IconTable /></Btn>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          {originalHtml && (
            <button type="button" title="AI가 처음 쓴 글로 되돌리기" onClick={restoreOriginal} className="ml-auto flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100">
              ↺ AI 원본
            </button>
          )}
        </div>
        {linkOpen && (
          <div className="flex flex-col gap-2 border-t border-neutral-100 px-3 py-2 sm:flex-row sm:items-center">
            <input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkOpen(false); }}
              placeholder="https://..."
              inputMode="url"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 sm:flex-1 sm:py-1.5"
            />
            <div className="flex items-center gap-2">
              <label className="mr-auto flex shrink-0 items-center gap-1 text-xs text-neutral-500 sm:mr-0">
                <input type="checkbox" checked={linkNofollow} onChange={(e) => setLinkNofollow(e.target.checked)} />
                nofollow
              </label>
              <button type="button" onClick={applyLink} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white">적용</button>
              <button type="button" onClick={() => setLinkOpen(false)} className="rounded-md px-2 py-1.5 text-sm text-neutral-400">취소</button>
            </div>
          </div>
        )}
        {activeHref && !linkOpen && (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-neutral-500">🔗 {activeHref}</span>
            <a href={activeHref} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs hover:border-neutral-900">
              <IconOpen /> 열기
            </a>
            <button type="button" onClick={openLink} className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">편집</button>
            <button type="button" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()} className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50">해제</button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[720px] px-8 py-8">
        {onFeaturedChange && (
          <div className="mb-4">
            {featuredImage ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featuredImage} alt="대표 이미지" className="max-h-52 rounded-lg" />
                <button type="button" onClick={() => onFeaturedChange(null)} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80">제거</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => featRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-600"
              >
                <IconImage /> 대표 이미지 추가 <span className="text-neutral-300">(선택)</span>
              </button>
            )}
            <input ref={featRef} type="file" accept="image/*" className="hidden" onChange={onPickFeatured} />
          </div>
        )}
        {onTitleChange && (
          <textarea
            ref={titleRef}
            rows={1}
            value={title ?? ""}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="제목을 입력하세요 (검색에 노출되는 H1)"
            style={{ resize: "none", overflow: "hidden" }}
            className={`font-pretendard mb-5 block w-full bg-transparent text-3xl font-bold leading-tight text-neutral-900 outline-none placeholder:text-neutral-300 ${
              (title ?? "").trim() === "" ? "rounded-lg border border-dashed border-neutral-300 px-3 py-2" : ""
            }`}
          />
        )}
        <EditorContent editor={editor} />
      </div>
      <div className="border-t border-neutral-100 px-4 py-2 text-right text-xs text-neutral-400">
        공백 제외 {editor.getText().replace(/\s/g, "").length.toLocaleString()}자
      </div>
    </div>
  );
});

export default ArticleEditor;
