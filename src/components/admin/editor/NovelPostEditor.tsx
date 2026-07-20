"use client";

import { useMemo } from "react";
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
  const files = [...transfer.files].filter((file) =>
    file.type.startsWith("image/")
  );
  if (files.length > 0) return files;

  return [...transfer.items]
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

async function uploadAndInsert(
  view: EditorView,
  files: File[],
  position?: number
) {
  try {
    const urls = await Promise.all(files.map(uploadEditorImage));
    for (const [index, src] of urls.entries()) {
      const imageType = view.state.schema.nodes.image;
      if (!imageType || view.isDestroyed) return;
      const node = imageType.create({ src, alt: files[index]?.name ?? "" });
      if (position === undefined) {
        view.dispatch(view.state.tr.replaceSelectionWith(node));
      } else {
        const safePosition = Math.min(position, view.state.doc.content.size);
        view.dispatch(view.state.tr.insert(safePosition, node));
        position = safePosition + node.nodeSize;
      }
    }
    view.focus();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "图片上传失败");
  }
}

export function NovelPostEditor({
  initialContent,
  onChange,
  disabled = false,
}: NovelPostEditorProps) {
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
            void uploadAndInsert(view, files);
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
            void uploadAndInsert(view, files, coordinates?.pos);
            return true;
          },
        }}
      >
        <EditorRuntime />
      </EditorContent>
    </EditorRoot>
  );
}
