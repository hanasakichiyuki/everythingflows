"use client";

import { useCallback, useRef } from "react";

type Props = {
  onChange: (html: string) => void;
  placeholder?: string;
};

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({ onChange, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  const sync = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleInput = () => sync();

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
    if (cmd === "formatBlock" && arg) exec(cmd, arg);
    else if (cmd === "createLink") {
      const url = window.prompt("URL");
      if (url) exec("createLink", url);
    } else exec(cmd);
    sync();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap gap-1 border-b border-border bg-black/5 p-2 dark:bg-white/5">
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
      />
    </div>
  );
}
