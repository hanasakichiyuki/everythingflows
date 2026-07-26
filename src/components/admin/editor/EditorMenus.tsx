"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Code,
  Code2,
  Heading2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  Lightbulb,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Underline,
  Undo2,
  Video,
} from "lucide-react";
import {
  EditorBubble,
  EditorBubbleItem,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  useEditor,
} from "novel";
import { Button } from "@/components/ui/button";
import {
  EDITOR_AI_ACTION_LABELS,
  type EditorAiAction,
} from "@/lib/editor/ai";
import { parseBilibiliInput } from "@/lib/editor/bilibili";
import {
  CODE_BLOCK_LANGUAGES,
  isSafeCodeLanguage,
} from "@/lib/editor/code-block";
import { cn } from "@/lib/utils";
import { editorSuggestionItems } from "./slash-command";
import { uploadEditorImage } from "./upload";

type EditorMenusProps = {
  onRequestAi: (action: EditorAiAction) => void;
  aiBusy: boolean;
};

function ToolbarButton({
  label,
  active,
  children,
  onClick,
  disabled,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn("h-7 w-7", active && "bg-primary-soft text-primary")}
    >
      {children}
    </Button>
  );
}

export function EditorToolbar({
  onRequestAi,
  aiBusy,
}: EditorMenusProps) {
  const { editor } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<{
    file: File;
    message: string;
  } | null>(null);

  const uploadAndInsert = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      setUploadError(null);
      try {
        const src = await uploadEditorImage(file);
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      } catch (error) {
        setUploadError({
          file,
          message: error instanceof Error ? error.message : "图片上传失败",
        });
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  useEffect(() => {
    const openImageUpload = () => inputRef.current?.click();
    const requestAi = (event: Event) => {
      const action = (event as CustomEvent<{ action?: EditorAiAction }>).detail
        ?.action;
      if (action) onRequestAi(action);
    };
    window.addEventListener("editor:request-image-upload", openImageUpload);
    window.addEventListener("editor:request-ai", requestAi);
    return () => {
      window.removeEventListener(
        "editor:request-image-upload",
        openImageUpload
      );
      window.removeEventListener("editor:request-ai", requestAi);
    };
  }, [onRequestAi]);

  if (!editor) return null;

  const codeLanguageAttribute = editor.getAttributes("codeBlock").language;
  const currentCodeLanguage = isSafeCodeLanguage(codeLanguageAttribute)
    ? codeLanguageAttribute
    : "plaintext";
  const hasCustomCodeLanguage = !CODE_BLOCK_LANGUAGES.some(
    (option) => option.value === currentCodeLanguage
  );

  const insertBilibili = () => {
    const input = window.prompt("请输入 BV 号、av 号或 Bilibili 视频链接");
    if (!input) return;
    const attrs = parseBilibiliInput(input);
    if (!attrs) {
      window.alert("无法识别该 Bilibili 视频地址");
      return;
    }
    editor.chain().focus().insertBilibili(attrs).run();
  };

  const editLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("链接地址", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: href.trim() })
      .run();
  };

  return (
    <div className="sticky top-0 z-30 flex min-h-10 flex-wrap items-center gap-0.5 border-b border-border/60 bg-background/95 px-3 py-1 backdrop-blur-xl">
      <ToolbarButton
        label="撤销"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton
        label="重做"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="二级标题"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        label="粗体"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="斜体"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="删除线"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarButton>
      <ToolbarButton
        label="链接"
        active={editor.isActive("link")}
        onClick={editLink}
      >
        <LinkIcon />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="无序列表"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="有序列表"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        label="任务列表"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodo />
      </ToolbarButton>
      <ToolbarButton
        label="引用"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote />
      </ToolbarButton>
      <ToolbarButton
        label="分隔线"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="代码块"
        active={editor.isActive("codeBlock")}
        onClick={() =>
          editor
            .chain()
            .focus()
            .toggleCodeBlock({ language: currentCodeLanguage })
            .run()
        }
      >
        <Code2 />
      </ToolbarButton>
      {editor.isActive("codeBlock") && (
        <select
          value={currentCodeLanguage}
          onChange={(event) =>
            editor
              .chain()
              .focus()
              .updateAttributes("codeBlock", {
                language: event.target.value,
              })
              .run()
          }
          className="h-7 rounded-lg border border-border bg-background px-2 text-[11px] outline-none focus:border-primary"
          aria-label="代码语言"
        >
          {hasCustomCodeLanguage && (
            <option value={currentCodeLanguage}>
              {currentCodeLanguage.toUpperCase()}
            </option>
          )}
          {CODE_BLOCK_LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="上传图片"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus />
      </ToolbarButton>
      <ToolbarButton label="插入 Bilibili 视频" onClick={insertBilibili}>
        <Video />
      </ToolbarButton>
      <ToolbarButton
        label="提示块"
        active={editor.isActive("callout")}
        onClick={() => editor.chain().focus().toggleCallout("info").run()}
      >
        <Lightbulb />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <div className="group relative">
        <ToolbarButton
          label="AI 写作"
          disabled={aiBusy}
          onClick={() => onRequestAi("continue")}
        >
          <Sparkles />
        </ToolbarButton>
        <div className="invisible absolute left-0 top-full z-40 mt-1 min-w-28 rounded-lg border border-border bg-background p-1 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
          {(Object.keys(EDITOR_AI_ACTION_LABELS) as EditorAiAction[]).map(
            (action) => (
              <button
                key={action}
                type="button"
                disabled={aiBusy}
                onClick={() => onRequestAi(action)}
                className="block w-full rounded-md px-3 py-1.5 text-left text-xs hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
              >
                {EDITOR_AI_ACTION_LABELS[action]}
              </button>
            )
          )}
        </div>
      </div>
      {uploading && <span className="ml-2 text-xs text-muted">上传中…</span>}
      {uploadError && (
        <div className="ml-2 flex items-center gap-2 text-xs" role="alert" aria-live="assertive">
          <span className="max-w-52 truncate text-destructive" title={uploadError.message}>
            图片未上传：{uploadError.message}
          </span>
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => void uploadAndInsert(uploadError.file)}
          >
            重试
          </button>
          <button
            type="button"
            className="text-muted underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setUploadError(null)}
          >
            关闭
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadAndInsert(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function EditorBubbleMenu({
  onRequestAi,
  aiBusy,
}: EditorMenusProps) {
  const { editor } = useEditor();
  if (!editor) return null;

  const items = [
    {
      label: "粗体",
      icon: <Bold />,
      active: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "斜体",
      icon: <Italic />,
      active: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "下划线",
      icon: <Underline />,
      active: editor.isActive("underline"),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "删除线",
      icon: <Strikethrough />,
      active: editor.isActive("strike"),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "行内代码",
      icon: <Code />,
      active: editor.isActive("code"),
      run: () => editor.chain().focus().toggleCode().run(),
    },
  ];

  return (
    <EditorBubble
      tippyOptions={{ duration: 100 }}
      className="flex items-center gap-0.5 rounded-xl border border-border bg-background p-1 shadow-xl"
    >
      {items.map((item) => (
        <EditorBubbleItem key={item.label} onSelect={item.run}>
          <button
            type="button"
            title={item.label}
            aria-label={item.label}
            className={cn(
              "rounded-lg p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10 [&_svg]:h-4 [&_svg]:w-4",
              item.active && "bg-pink-500/15 text-pink-500"
            )}
          >
            {item.icon}
          </button>
        </EditorBubbleItem>
      ))}
      <EditorBubbleItem
        onSelect={() => {
          const previous = editor.getAttributes("link").href as
            | string
            | undefined;
          const href = window.prompt("链接地址", previous ?? "https://");
          if (href === null) return;
          if (!href.trim()) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: href.trim() })
            .run();
        }}
      >
        <button
          type="button"
          title="链接"
          aria-label="链接"
          className={cn(
            "rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10 [&_svg]:h-4 [&_svg]:w-4",
            editor.isActive("link") && "bg-pink-500/15 text-pink-500"
          )}
        >
          <LinkIcon />
        </button>
      </EditorBubbleItem>
      <span className="mx-0.5 h-5 w-px bg-border" />
      <button
        type="button"
        title="AI 润色"
        aria-label="AI 润色"
        disabled={aiBusy}
        onClick={() => onRequestAi("polish")}
        className="rounded-lg p-2 text-pink-500 hover:bg-pink-500/10 disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4"
      >
        <Sparkles />
      </button>
    </EditorBubble>
  );
}

export function EditorSlashMenu() {
  return (
    <EditorCommand className="z-50 h-auto max-h-80 w-72 overflow-y-auto rounded-xl border border-border bg-background p-1 shadow-xl">
      <EditorCommandEmpty className="px-3 py-2 text-sm text-muted">
        没有匹配的命令
      </EditorCommandEmpty>
      <EditorCommandList>
        {editorSuggestionItems.map((item) => (
          <EditorCommandItem
            key={item.title}
            value={item.title}
            keywords={item.searchTerms}
            onCommand={(value) => item.command?.(value)}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-pink-500/10 aria-selected:text-pink-600"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border">
              {item.icon}
            </span>
            <span>
              <span className="block font-medium">{item.title}</span>
              <span className="block text-xs text-muted">
                {item.description}
              </span>
            </span>
          </EditorCommandItem>
        ))}
      </EditorCommandList>
    </EditorCommand>
  );
}
