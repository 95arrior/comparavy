"use client";

// 네이버 발행 복사 유틸 일원화. 모든 클립보드/공유/다운로드 로직은 여기로 모은다.
// 원칙: 반드시 사용자 클릭 핸들러 안에서 호출, HTTPS 필수, Safari 제스처 컨텍스트 보존.

/** 텍스트만 복사(제목 등). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
    return legacyCopyHtml(text.replace(/\n/g, "<br>"));
  } catch {
    return legacyCopyHtml(text.replace(/\n/g, "<br>"));
  }
}

/** HTML+plain 동시 복사(본문). Safari 대응 위해 ClipboardItem에 Promise<Blob>을 넘긴다. */
export async function copyRich(html: string, plain: string): Promise<boolean> {
  try {
    if (typeof window !== "undefined" && "ClipboardItem" in window && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": Promise.resolve(new Blob([html], { type: "text/html" })),
          "text/plain": Promise.resolve(new Blob([plain], { type: "text/plain" })),
        }),
      ]);
      return true;
    }
    return legacyCopyHtml(html);
  } catch {
    return legacyCopyHtml(html);
  }
}

/** 이미지 URL을 PNG로 클립보드에 복사(스크린샷 붙여넣기와 동일). Safari 제스처 보존 위해 Promise<Blob> 패턴. */
export async function copyImage(url: string): Promise<boolean> {
  try {
    if (!(typeof window !== "undefined" && "ClipboardItem" in window && navigator.clipboard?.write)) return false;
    const blobPromise = fetch(url).then(async (res) => {
      const b = await res.blob();
      if (b.type === "image/png") return b;
      const bmp = await createImageBitmap(b);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width; canvas.height = bmp.height;
      canvas.getContext("2d")?.drawImage(bmp, 0, 0);
      return await new Promise<Blob>((ok, no) => canvas.toBlob((x) => (x ? ok(x) : no(new Error())), "image/png"));
    });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
    return true;
  } catch {
    return false;
  }
}

/** 이미지 저장 — 모바일은 공유시트(사진 앱 저장) 우선, 아니면 blob 다운로드. */
export async function saveImage(url: string, name: string): Promise<void> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], name, { type: blob.type || "image/png" });
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch { /* 취소/미지원 -> 다운로드 */ }
    }
    downloadBlob(blob, name);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

/** 여러 이미지를 한 번에 공유시트로(모바일 사진 일괄 저장). 지원 안 하면 false. */
export async function shareImages(urls: string[]): Promise<boolean> {
  try {
    if (!navigator.canShare) return false;
    const files = await Promise.all(urls.map(async (u, i) => {
      const b = await (await fetch(u)).blob();
      return new File([b], `ateflo-${i + 1}.png`, { type: b.type || "image/png" });
    }));
    if (!navigator.canShare({ files })) return false;
    await navigator.share({ files });
    return true;
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, name: string): void {
  const obj = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = obj; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(obj), 4000);
}

// ClipboardItem 미지원 폴백 — 숨김 contenteditable + execCommand.
function legacyCopyHtml(html: string): boolean {
  try {
    const el = document.createElement("div");
    el.contentEditable = "true";
    el.innerHTML = html;
    el.style.position = "fixed"; el.style.left = "-9999px"; el.style.top = "0";
    document.body.appendChild(el);
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges(); sel?.addRange(range);
    const ok = document.execCommand("copy");
    sel?.removeAllRanges();
    el.remove();
    return ok;
  } catch {
    return false;
  }
}
