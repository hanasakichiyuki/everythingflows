"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
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
import { isSafeLinkHref } from "@/lib/editor/types";
import {
  CODE_BLOCK_LANGUAGES,
  isSafeCodeLanguage,
} from "@/lib/editor/code-block";
import { cn } from "@/lib/utils";
import { EditorInputDialog } from "./EditorInputDialog";
import { editorSuggestionItems } from "./slash-command";
import { uploadEditorImage } from "./upload";
import { useEditorImageUpload } from "./use-image-upload";

type EditorMenusProps = {
  onRequestAi: (action: EditorAiAction) => void;
  aiBusy: boolean;
};

type EditorInputDialogKind = "link" | "bilibili";

/** 当前链接地址（用于回填输入框）；没有链接时给一个可直接编辑的默认值。 */
function readLinkHref(editor: Editor): string {
  const href = editor.getAttributes("link").href;
  return typeof href === "string" && href.length > 0 ? href : "https://";
}

/**
 * 提交链接：留空表示移除链接，非法协议就地报错。
 * 工具栏与浮动菜单共用同一份逻辑，避免两处校验漂移。
 */
function applyLink(editor: Editor, input: string): string | null {
  const href = input.trim();
  if (!href) {
    editor.chain().focus().unsetLink().run();
    return null;
  }
  if (!isSafeLinkHref(href)) {
    return "链接格式无效：仅支持 http(s)、mailto、站内路径（/）与锚点（#）";
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  return null;
}

/** 提交 Bilibili 视频：解析失败就地报错，不插入。 */
function applyBilibili(editor: Editor, input: string): string | null {
  const attrs = parseBilibiliInput(input);
  if (!attrs) return "无法识别该地址，请输入 BV 号、av 号或视频链接";
  editor.chain().focus().insertBilibili(attrs).run();
  return null;
}

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
  const [dialog, setDialog] = useState<EditorInputDialogKind | null>(null);
  const [uploadError, setUploadError] = useState<{
    file: File;
    message: string;
  } | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const { scheduleOriginal } = useEditorImageUpload(setUploadNotice);

  const uploadAndInsert = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      setUploadError(null);
      setUploadNotice(null);
      try {
        const uploaded = await uploadEditorImage(file);
        editor
          .chain()
          .focus()
          .setImage({ src: uploaded.displayUrl, alt: file.name })
          .run();
        // 节点已经插入，原图在后台补传并写回 originalSrc —— 与粘贴/拖拽走同一条链路，
        // 否则从工具栏插入的图片永远没有原图。
        scheduleOriginal(editor.view, uploaded);
      } catch (error) {
        setUploadError({
          file,
          message: error instanceof Error ? error.message : "图片上传失败",
        });
      } finally {
        setUploading(false);
      }
    },
    [editor, scheduleOriginal]
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

  /**
   * 工具栏的激活态必须**订阅**编辑器状态。
   *
   * `useEditor()`（= tiptap 的 `useCurrentEditor`）只读 context、不订阅 transaction；
   * 以前按钮高亮能刷新，是因为父组件每次输入都重渲把它顺带带了起来 —— 既脆弱又昂贵
   * （等于把菜单绑死在"每按一个键整页重渲"上）。改为按需订阅后，输入路径才能安全节流
   * 而不会让高亮失灵。
   */
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      const language = current.getAttributes("codeBlock").language;

      return {
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
        heading2: current.isActive("heading", { level: 2 }),
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        strike: current.isActive("strike"),
        link: current.isActive("link"),
        bulletList: current.isActive("bulletList"),
        orderedList: current.isActive("orderedList"),
        taskList: current.isActive("taskList"),
        blockquote: current.isActive("blockquote"),
        codeBlock: current.isActive("codeBlock"),
        callout: current.isActive("callout"),
        codeLanguage: isSafeCodeLanguage(language) ? language : "plaintext",
      };
    },
  });

  if (!editor) return null;

  const currentCodeLanguage = toolbarState?.codeLanguage ?? "plaintext";
  const hasCustomCodeLanguage = !CODE_BLOCK_LANGUAGES.some(
    (option) => option.value === currentCodeLanguage
  );

  return (
    <div className="sticky top-0 z-30 flex min-h-10 flex-wrap items-center gap-0.5 border-b border-border/60 bg-background/95 px-3 py-1 backdrop-blur-xl">
      <ToolbarButton
        label="撤销"
        disabled={!toolbarState?.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton
        label="重做"
        disabled={!toolbarState?.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="二级标题"
        active={toolbarState?.heading2}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        label="粗体"
        active={toolbarState?.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="斜体"
        active={toolbarState?.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="删除线"
        active={toolbarState?.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarButton>
      <ToolbarButton
        label="链接"
        active={toolbarState?.link}
        onClick={() => setDialog("link")}
      >
        <LinkIcon />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="无序列表"
        active={toolbarState?.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="有序列表"
        active={toolbarState?.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        label="任务列表"
        active={toolbarState?.taskList}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodo />
      </ToolbarButton>
      <ToolbarButton
        label="引用"
        active={toolbarState?.blockquote}
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
        active={toolbarState?.codeBlock}
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
      {toolbarState?.codeBlock && (
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
      <ToolbarButton
        label="插入 Bilibili 视频"
        onClick={() => setDialog("bilibili")}
      >
        <Video />
      </ToolbarButton>
      <ToolbarButton
        label="提示块"
        active={toolbarState?.callout}
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
      {/* 仅"原图被放弃/补传失败"这类不影响正文的提示，故用 status 而非 alert。 */}
      {uploadNotice && (
        <div
          className="ml-2 flex items-center gap-2 text-xs"
          role="status"
          aria-live="polite"
        >
          <span className="max-w-72 text-amber-700 dark:text-amber-300">
            {uploadNotice}
          </span>
          <button
            type="button"
            className="text-muted underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setUploadNotice(null)}
          >
            关闭
          </button>
        </div>
      )}
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
      {dialog === "bilibili" && (
        <EditorInputDialog
          title="插入 Bilibili 视频"
          description="支持 BV 号、av 号，或直接粘贴视频链接。"
          label="视频编号或链接"
          placeholder="BV1xx411c7mD / av170001 / 视频链接"
          onSubmit={(value) => applyBilibili(editor, value)}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "link" && (
        <EditorInputDialog
          title="插入链接"
          description="留空并确认可移除当前链接。"
          label="链接地址"
          placeholder="https://example.com"
          defaultValue={readLinkHref(editor)}
          onSubmit={(value) => applyLink(editor, value)}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}

export function EditorBubbleMenu({
  onRequestAi,
  aiBusy,
}: EditorMenusProps) {
  const { editor } = useEditor();

  // 与工具栏同理：浮动菜单的激活态也要订阅编辑器状态（见 EditorToolbar 的说明）。
  const bubbleState = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            underline: current.isActive("underline"),
            strike: current.isActive("strike"),
            code: current.isActive("code"),
            link: current.isActive("link"),
          }
        : null,
  });

  const [dialog, setDialog] = useState<EditorInputDialogKind | null>(null);

  if (!editor) return null;

  const items = [
    {
      label: "粗体",
      icon: <Bold />,
      active: bubbleState?.bold ?? false,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "斜体",
      icon: <Italic />,
      active: bubbleState?.italic ?? false,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "下划线",
      icon: <Underline />,
      active: bubbleState?.underline ?? false,
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "删除线",
      icon: <Strikethrough />,
      active: bubbleState?.strike ?? false,
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "行内代码",
      icon: <Code />,
      active: bubbleState?.code ?? false,
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
      <EditorBubbleItem onSelect={() => setDialog("link")}>
        <button
          type="button"
          title="链接"
          aria-label="链接"
          className={cn(
            "rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10 [&_svg]:h-4 [&_svg]:w-4",
            bubbleState?.link && "bg-pink-500/15 text-pink-500"
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
      {/* BubbleMenu 的子元素始终挂载（只切 CSS 可见性），对话框放这里不会被卸载 */}
      {dialog === "link" && (
        <EditorInputDialog
          title="插入链接"
          description="留空并确认可移除当前链接。"
          label="链接地址"
          placeholder="https://example.com"
          defaultValue={readLinkHref(editor)}
          onSubmit={(value) => applyLink(editor, value)}
          onCancel={() => setDialog(null)}
        />
      )}
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
