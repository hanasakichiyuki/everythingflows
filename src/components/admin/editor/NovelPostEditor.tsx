"use client";

import { useMemo, useState } from "react";
import type { EditorView } from "@tiptap/pm/view";
import { EditorContent, EditorRoot, handleCommandNavigation } from "novel";
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

type NovelPostEditorProps = {
  initialContent?: TiptapDocument | null;
  onChange: (document: TiptapDocument) => void;
  disabled?: boolean;
};

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

async function uploadAndInsert(
  view: EditorView,
  files: File[],
  position?: number,
  onFailure?: (failure: UploadFailure) => void
) {
  const results = await Promise.allSettled(files.map(uploadEditorImage));
  const failedFiles: File[] = [];
  let failureMessage = "图片上传失败";

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      failedFiles.push(files[index]!);
      failureMessage =
        result.reason instanceof Error ? result.reason.message : failureMessage;
      continue;
    }

    const imageType = view.state.schema.nodes.image;
    if (!imageType || view.isDestroyed) return;
    const node = imageType.create({ src: result.value, alt: files[index]?.name ?? "" });
    if (position === undefined) {
      view.dispatch(view.state.tr.replaceSelectionWith(node));
    } else {
      const safePosition = Math.min(position, view.state.doc.content.size);
      view.dispatch(view.state.tr.insert(safePosition, node));
      position = safePosition + node.nodeSize;
    }
  }

  if (failedFiles.length > 0) {
    onFailure?.({ view, files: failedFiles, position, message: failureMessage });
  }
  view.focus();
}

export function NovelPostEditor({
  initialContent,
  onChange,
  disabled = false,
}: NovelPostEditorProps) {
  const [uploadFailure, setUploadFailure] = useState<UploadFailure | null>(null);
  const extensions = useMemo(
    () => [
      ...createEditorExtensions({
        bilibiliExtension: ClientBilibiliNode,
        calloutExtension: ClientCalloutNode,
        codeBlockExtension: ClientCodeBlockNode,
      }),
      SlashCommand,
    ],
    []
  );

  const content = useMemo(
    () =>
      cloneTiptapDocument(initialContent ?? EMPTY_TIPTAP_DOCUMENT),
    [initialContent]
  );

  const retryFailedUploads = () => {
    if (!uploadFailure) return;
    if (uploadFailure.view.isDestroyed) {
      setUploadFailure({
        ...uploadFailure,
        message: "编辑器已刷新，请重新选择图片上传",
      });
      return;
    }
    setUploadFailure(null);
    void uploadAndInsert(
      uploadFailure.view,
      uploadFailure.files,
      uploadFailure.position,
      setUploadFailure
    );
  };

  return (
    <EditorRoot>
      <EditorContent
        className="relative flex min-h-full flex-col bg-transparent"
        initialContent={content}
        extensions={extensions}
        immediatelyRender={false}
        editable={!disabled}
        onUpdate={({ editor }) =>
          onChange(editor.getJSON() as TiptapDocument)
        }
        editorProps={{
          attributes: {
            class: cn(
              "prose-blog tiptap-editor mx-auto min-h-[calc(100vh-14rem)] w-full max-w-5xl px-6 py-6 outline-none sm:px-10",
              disabled && "cursor-not-allowed opacity-70"
            ),
          },
          handleKeyDown: (_view, event) => handleCommandNavigation(event),
          handlePaste: (view, event) => {
            if (event.clipboardData?.types.includes("text/html")) return false;
            const files = imageFilesFromTransfer(event.clipboardData);
            if (files.length === 0) return false;
            event.preventDefault();
            setUploadFailure(null);
            void uploadAndInsert(view, files, undefined, setUploadFailure);
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            if (moved) return false;
            const files = imageFilesFromTransfer(event.dataTransfer);
            if (files.length === 0) return false;
            event.preventDefault();
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            setUploadFailure(null);
            void uploadAndInsert(
              view,
              files,
              coordinates?.pos,
              setUploadFailure
            );
            return true;
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
    </EditorRoot>
  );
}
