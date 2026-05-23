"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  onChange: (html: string) => void;
  placeholder?: string;
  supabaseMode?: boolean;
  initialContent?: string;
};

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

async function uploadImageFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json.url as string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function RichTextEditor({ onChange, placeholder, supabaseMode, initialContent }: Props) {
  const t = useTranslations("admin");
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [uploading, setUploading] = useState(false);
  const initializedRef = useRef(false);

  // Set initial content once when mounted
  useEffect(() => {
    if (editorRef.current && initialContent && !initializedRef.current) {
      initializedRef.current = true;
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  const sync = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const debouncedSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(sync, 50);
  }, [sync]);

  // Save cursor position before async operation
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  // Restore cursor after async operation
  const restoreSelection = useCallback(() => {
    const range = savedRangeRef.current;
    if (!range || !editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    savedRangeRef.current = null;
  }, []);

  const insertHtml = useCallback(
    (html: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();

      try {
        document.execCommand("insertHTML", false, html);
      } catch {
        // Fallback: insert at end if execCommand fails
        el.insertAdjacentHTML("beforeend", html);
      }
      sync();
    },
    [sync]
  );

  const insertImage = useCallback(
    async (file: File) => {
      saveSelection();
      setUploading(true);
      try {
        let url: string;
        if (supabaseMode) {
          url = await uploadImageFile(file);
        } else {
          url = await fileToBase64(file);
        }
        restoreSelection();
        insertHtml(
          `<img src="${url}" alt="" class="max-w-full rounded-lg my-4" loading="lazy" />`
        );
      } catch (e) {
        alert(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [supabaseMode, insertHtml, saveSelection, restoreSelection]
  );

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems: DataTransferItem[] = [];
    let hasHtml = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        imageItems.push(item);
      } else if (item.type === "text/html") {
        hasHtml = true;
      }
    }

    // If pasting HTML with images, let default paste handle it (preserves text + img tags)
    if (imageItems.length === 0 || hasHtml) return;

    e.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (file) await insertImage(file);
    }
  };

  const handleInput = useCallback(() => debouncedSync(), [debouncedSync]);

  const toolbar = [
    { label: "B", cmd: "bold", title: "Bold" },
    { label: "I", cmd: "italic", title: "Italic" },
    { label: "H2", cmd: "formatBlock", arg: "h2", title: "Heading 2" },
    { label: "H3", cmd: "formatBlock", arg: "h3", title: "Heading 3" },
    { label: "•", cmd: "insertUnorderedList", title: "Bullet list" },
    { label: "1.", cmd: "insertOrderedList", title: "Numbered list" },
    { label: "❝", cmd: "formatBlock", arg: "blockquote", title: "Quote" },
  ] as const;

  const run = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    try {
      if (cmd === "formatBlock" && arg) exec(cmd, arg);
      else if (cmd === "createLink") {
        const url = window.prompt("URL");
        if (url) exec("createLink", url);
      } else exec(cmd);
    } catch {
      // ignore execCommand errors from invalid selection state
    }
    sync();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-black/5 p-2 dark:bg-white/5">
        {toolbar.map((item) => (
          <button
            key={item.label}
            type="button"
            title={item.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(item.cmd, "arg" in item ? item.arg : undefined)}
            className="min-w-[2rem] rounded px-2 py-1 text-sm font-medium hover:bg-black/10 dark:hover:bg-white/10"
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          title="Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("createLink")}
          className="rounded px-2 py-1 text-sm hover:bg-black/10 dark:hover:bg-white/10"
        >
          Link
        </button>
        <button
          type="button"
          title={t("insertImage")}
          disabled={uploading}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="rounded px-2 py-1 text-sm hover:bg-black/10 disabled:opacity-50 dark:hover:bg-white/10"
        >
          {uploading ? "…" : t("insertImage")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void insertImage(file);
            e.target.value = "";
          }}
        />
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        className="prose-blog min-h-[280px] px-4 py-3 outline-none empty:before:text-muted empty:before:content-[attr(data-placeholder)]"
        onInput={handleInput}
        onPaste={handlePaste}
      />
    </div>
  );
}
