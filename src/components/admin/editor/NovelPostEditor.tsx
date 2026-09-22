"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Extension, type Editor } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import {
  createImageUpload,
  EditorContent,
  EditorRoot,
  handleCommandNavigation,
  UploadImagesPlugin,
} from "novel";
import { createEditorExtensions } from "@/lib/editor/extensions";
import {
  EMPTY_TIPTAP_DOCUMENT,
  cloneTiptapDocument,
  type TiptapDocument,
} from "@/lib/editor/types";
import { cn } from "@/lib/utils";
import {
  ClientBilibiliNode,
  ClientCalloutNode,
  ClientCodeBlockNode,
} from "./extensions/client-extensions";
import { EditorRuntime } from "./EditorRuntime";
import { SlashCommand } from "./slash-command";
import { uploadEditorImage } from "./upload";
import { useEditorImageUpload } from "./use-image-upload";

/**
 * 编辑器回传给父组件的节流窗口。
 *
 * 每次按键都 `getJSON()` 会把整篇文档序列化一遍，父组件还会拿它做两次全文遍历
 * （字符数统计、是否为空判断）并整页重渲 —— 文章越长越卡。这里合并成 200ms 一次；
 * `onBlur` 会立刻补一次，所以"打完字马上点保存/发布"不会漏掉最后几次输入。
 */
const CHANGE_THROTTLE_MS = 200;

type NovelPostEditorProps = {
  initialContent?: TiptapDocument | null;
  onChange: (document: TiptapDocument) => void;
  disabled?: boolean;
  /** 本站图片托管域名（origin），由服务端下发；为空则跳过客户端图片校验。 */
  managedImageOrigin?: string | null;
};

function hostOf(src: string): string {
  try {
    return new URL(src, window.location.href).host;
  } catch {
    return src;
  }
}

/** 图片地址是否属于本站托管域名（https + 同源）。 */
function isManagedImageSrc(src: string, origin: string): boolean {
  try {
    const url = new URL(src, window.location.href);
    return url.protocol === "https:" && url.origin === origin;
  } catch {
    return false;
  }
}

/**
 * 摘掉粘贴/拖拽内容里非本站托管的 `<img>`。
 *
 * 公开渲染器只渲染本站托管的图片，放进去等于"后台看得见、发布后消失"。这里就地剔除，
 * 并把被拦下的域名返回给界面提示作者改用"上传图片"。
 * 服务端保存时还有一道同样的校验兜底（见 `app/actions/posts.ts`）。
 */
function stripUnmanagedImages(html: string, origin: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocked: string[] = [];

  doc.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src") ?? "";
    if (!src || isManagedImageSrc(src, origin)) return;
    blocked.push(hostOf(src));
    image.remove();
  });

  return { html: doc.body.innerHTML, blocked };
}

function blockedImageNotice(blocked: string[]): string {
  const hosts = [...new Set(blocked)].join("、");
  return `已忽略 ${blocked.length} 张非本站托管的图片（${hosts}）：只有本站托管的图片才会显示，请用工具栏的“上传图片”重新插入。`;
}

function imageFilesFromTransfer(transfer: DataTransfer | null): File[] {
  if (!transfer) return [];
  const isImageCandidate = (file: File) =>
    file.type.startsWith("image/") ||
    /\.(?:gif|jpe?g|png|webp)$/i.test(file.name);
  const files = [...transfer.files].filter(isImageCandidate);
  if (files.length > 0) return files;

  return [...transfer.items]
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null && isImageCandidate(file));
}

type UploadFailure = {
  view: EditorView;
  files: File[];
  position?: number;
  message: string;
};

/**
 * 把图片节点插入文档，并返回下一张的插入位置。
 *
 * 位置语义与粘贴/拖拽一致：给了位置就插在那里（多张依次排队），否则替换当前选区。
 * 只负责"放节点"这一件事 —— 上传与占位预览由 `createImageUpload` 处理，两条路径
 * 共用同一份插入逻辑，避免重试与首次插入产生不同的 DOM。
 */
function insertImageNode(
  view: EditorView,
  src: string,
  alt: string,
  position?: number
): number | undefined {
  const imageType = view.state.schema.nodes.image;
  if (!imageType) return position;

  const node = imageType.create({ src, alt });
  if (position === undefined) {
    view.dispatch(view.state.tr.replaceSelectionWith(node));
    return undefined;
  }

  const safePosition = Math.min(position, view.state.doc.content.size);
  view.dispatch(view.state.tr.insert(safePosition, node));
  return safePosition + node.nodeSize;
}

export function NovelPostEditor({
  initialContent,
  onChange,
  disabled = false,
  managedImageOrigin = null,
}: NovelPostEditorProps) {
  const [uploadFailure, setUploadFailure] = useState<UploadFailure | null>(null);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const pendingEditorRef = useRef<Editor | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const { scheduleOriginal, flushOriginals } = useEditorImageUpload(setImageNotice);

  const flushChange = useCallback(() => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const pending = pendingEditorRef.current;
    pendingEditorRef.current = null;
    if (!pending || pending.isDestroyed) return;
    onChange(pending.getJSON() as TiptapDocument);
  }, [onChange]);

  const scheduleChange = useCallback(
    (instance: Editor) => {
      pendingEditorRef.current = instance;
      if (flushTimerRef.current !== null) return;
      flushTimerRef.current = window.setTimeout(flushChange, CHANGE_THROTTLE_MS);
    },
    [flushChange]
  );

  /**
   * 逐张上传，彼此不等待。
   *
   * novel 的 `handleImagePaste`/`handleImageDrop` 只取 `files[0]`，一次粘贴多张会丢掉其余
   * 图片，所以这里自己循环；同时每张各自完成即插入，第一张不必等最慢那张。
   * 多张图共用同一个插入位置：占位是 decoration，会随文档变化自动跟随。
   *
   * 上传函数每次调用现建，而不是缓存成组件级常量：`onUpload(file)` 只拿得到文件，而
   * "原图写回"与"失败重试"都需要视图 —— 直接用闭包捕获比在组件上挂一个可变 ref 更干净。
   * `onUpload` 必须 resolve 成**字符串**（展示图地址）：`createImageUpload` 会把非字符串的
   * 结果当成"还没传完"，退回本地 data URL 当 src —— 那样存进正文的就是几 MB 的 base64。
   * 原图补传是 fire-and-forget，不参与这个返回值。
   */
  const startImageUploads = useCallback(
    (view: EditorView, files: File[], position: number) => {
      setUploadFailure(null);
      setImageNotice(null);

      const uploadImage = createImageUpload({
        validateFn: (file: File) => {
          if (
            !file.type.startsWith("image/") &&
            !/\.(?:gif|jpe?g|png|webp)$/i.test(file.name)
          ) {
            throw new Error("只支持 PNG / JPEG / GIF / WebP 图片");
          }
          // novel 的实现是 `if (!validateFn(file)) return`：返回假值会**静默中止**上传
          // （不占位、不上传、也不报错）。它的 TS 类型却声明成 `(file) => void`，
          // 所以这里必须显式返回真值 —— 按类型签名写 void 会让整个功能失效。
          return true;
        },
        onUpload: async (file: File) => {
          try {
            const uploaded = await uploadEditorImage(file);
            scheduleOriginal(view, uploaded);
            return uploaded.displayUrl;
          } catch (error) {
            setUploadFailure({
              view,
              files: [file],
              message:
                error instanceof Error ? error.message : "图片上传失败",
            });
            // 抛回给 novel：它会撤掉那张占位预览。
            throw error;
          }
        },
      });

      for (const file of files) {
        try {
          uploadImage(file, view, position);
        } catch (error) {
          setImageNotice(
            error instanceof Error ? error.message : "图片格式不受支持"
          );
        }
      }
    },
    [scheduleOriginal]
  );

  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
    };
  }, []);
  const extensions = useMemo(
    () => [
      ...createEditorExtensions({
        bilibiliExtension: ClientBilibiliNode,
        calloutExtension: ClientCalloutNode,
        codeBlockExtension: ClientCodeBlockNode,
      }),
      SlashCommand,
      // 上传期间的本地占位预览（decoration，不写入文档）：选完图立刻就能看到图，不必等
      // 上传完成，也就不会出现"卡住几秒"。占位里的 img 用与正文一致的类名，尺寸与圆角
      // 直接沿用 `.prose-blog img`。
      //
      // 包一层 TipTap 扩展是因为 `extensions` 的类型是 `AnyExtension[]`：直接把 novel 的
      // ProseMirror `Plugin` 实例放进数组通不过类型检查（运行期 TipTap 是接受的）。放在
      // memo 内部而不是模块顶层，是为了让每个编辑器实例拿到自己的 plugin 实例。
      Extension.create({
        name: "imageUploadPlaceholder",
        addProseMirrorPlugins() {
          return [UploadImagesPlugin({ imageClass: "tiptap-image" })];
        },
      }),
    ],
    []
  );

  const content = useMemo(
    () =>
      cloneTiptapDocument(initialContent ?? EMPTY_TIPTAP_DOCUMENT),
    [initialContent]
  );

  const retryFailedUploads = () => {
    const failure = uploadFailure;
    if (!failure) return;
    if (failure.view.isDestroyed) {
      setUploadFailure({
        ...failure,
        message: "编辑器已刷新，请重新选择图片上传",
      });
      return;
    }

    const { view, files } = failure;
    let cursor = failure.position;
    setUploadFailure(null);

    void (async () => {
      const remaining: File[] = [];
      let message = "图片上传失败";

      // 与首次上传一致：逐张处理、逐张插入，不设"全部完成"的屏障。
      for (const file of files) {
        try {
          const uploaded = await uploadEditorImage(file);
          if (view.isDestroyed) return;
          cursor = insertImageNode(view, uploaded.displayUrl, file.name, cursor);
          scheduleOriginal(view, uploaded);
        } catch (error) {
          remaining.push(file);
          if (error instanceof Error) message = error.message;
        }
      }

      if (remaining.length > 0) {
        setUploadFailure({ view, files: remaining, position: cursor, message });
      }
    })();
  };

  return (
    <EditorRoot>
      <EditorContent
        className="relative flex min-h-full flex-col bg-transparent"
        initialContent={content}
        extensions={extensions}
        immediatelyRender={false}
        editable={!disabled}
        onUpdate={({ editor }) => {
          // 展示图节点是在上传完成后异步插入的，原图有可能先传完：借这次插入事务补写回。
          flushOriginals(editor.view);
          scheduleChange(editor);
        }}
        onBlur={flushChange}
        editorProps={{
          attributes: {
            class: cn(
              "prose-blog tiptap-editor mx-auto min-h-[calc(100vh-14rem)] w-full max-w-5xl px-6 py-6 outline-none sm:px-10",
              disabled && "cursor-not-allowed opacity-70"
            ),
          },
          handleKeyDown: (_view, event) => handleCommandNavigation(event),
          handlePaste: (view, event) => {
            const html = event.clipboardData?.getData("text/html");
            const files = imageFilesFromTransfer(event.clipboardData);

            // 有富文本就按富文本走（先剔除非本站图片），避免"复制带图段落"只上传图片、丢掉文字。
            if (html && managedImageOrigin) {
              const cleaned = stripUnmanagedImages(html, managedImageOrigin);
              if (cleaned.blocked.length > 0) {
                event.preventDefault();
                if (cleaned.html.trim()) {
                  view.pasteHTML(cleaned.html, event);
                } else if (files.length > 0) {
                  // 剪贴板内容被清空，说明只复制了一张外站图片：改为直接上传，体验更好。
                  startImageUploads(view, files, view.state.selection.from);
                }
                setImageNotice(blockedImageNotice(cleaned.blocked));
                return true;
              }
              // 没有需要拦截的图片：交回编辑器默认处理。
              return false;
            }

            if (files.length === 0) return false;
            event.preventDefault();
            startImageUploads(view, files, view.state.selection.from);
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            if (moved) return false;
            const files = imageFilesFromTransfer(event.dataTransfer);
            if (files.length > 0) {
              event.preventDefault();
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              startImageUploads(
                view,
                files,
                coordinates?.pos ?? view.state.selection.from
              );
              return true;
            }

            // 从其它页面拖进来的图片同样是"非本站"的：直接阻断并提示，而不是插进正文。
            const html = event.dataTransfer?.getData("text/html");
            if (html && managedImageOrigin) {
              const { blocked } = stripUnmanagedImages(html, managedImageOrigin);
              if (blocked.length > 0) {
                event.preventDefault();
                setImageNotice(blockedImageNotice(blocked));
                return true;
              }
            }

            return false;
          },
        }}
      >
        <EditorRuntime />
      </EditorContent>
      {uploadFailure && (
        <div
          className="mx-3 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs"
          role="alert"
          aria-live="assertive"
        >
          <span className="text-destructive">
            {uploadFailure.files.length > 1
              ? `${uploadFailure.files.length} 张图片未上传：`
              : "图片未上传："}
            {uploadFailure.message}
          </span>
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={retryFailedUploads}
          >
            重试
          </button>
          <button
            type="button"
            className="text-muted underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setUploadFailure(null)}
          >
            关闭
          </button>
        </div>
      )}
      {imageNotice && (
        <div
          className="mx-3 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs"
          role="alert"
          aria-live="assertive"
        >
          <span className="text-amber-700 dark:text-amber-300">
            {imageNotice}
          </span>
          <button
            type="button"
            className="text-muted underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setImageNotice(null)}
          >
            关闭
          </button>
        </div>
      )}
    </EditorRoot>
  );
}
