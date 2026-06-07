"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

// 노션식 WYSIWYG 에디터(Tiptap). 실제 블로그 폭으로 보이고, 드래그 후 링크/이미지 삽입.
export default function ArticleEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Tiptap v3 StarterKit에 Link 포함 → 여기서 설정
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener", target: "_blank" } },
      }),
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: "내용을 입력하세요…" }),
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "prose prose-neutral max-w-none min-h-[55vh] focus:outline-none" },
    },
  });

  if (!editor) return <div className="h-[60vh] rounded-xl border border-neutral-200" />;

  function setLink() {
    const prev = (editor!.getAttributes("link").href as string) ?? "";
    const url = window.prompt("링크 주소 (https://...)", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const alt = window.prompt("이미지 설명(alt) — SEO에 중요", "") ?? "";
      editor!.chain().focus().setImage({ src: String(reader.result), alt }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const Btn = ({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-sm transition ${active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {/* 툴바 (상단 고정) */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-white/95 px-3 py-2 backdrop-blur">
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>제목</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>소제목</Btn>
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>굵게</Btn>
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>• 목록</Btn>
        <span className="mx-1 h-4 w-px bg-neutral-200" />
        <Btn onClick={setLink} active={editor.isActive("link")}>🔗 링크</Btn>
        <Btn onClick={() => fileRef.current?.click()}>🖼 이미지</Btn>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
        <span className="ml-auto text-xs text-neutral-400">텍스트를 드래그한 뒤 링크를 누르면 링크가 걸려요</span>
      </div>

      {/* 실제 블로그 폭으로 — 발행 모습 그대로 */}
      <div className="mx-auto max-w-[720px] px-8 py-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
