"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Square, X } from "lucide-react";
import { useEditor } from "novel";
import {
  EDITOR_AI_ACTION_LABELS,
  MAX_EDITOR_AI_CONTEXT_CHARS,
  MAX_EDITOR_AI_SELECTION_CHARS,
  type EditorAiAction,
} from "@/lib/editor/ai";
import { plainTextToTiptapContent } from "@/lib/editor/serialization";
import {
  EditorBubbleMenu,
  EditorSlashMenu,
  EditorToolbar,
} from "./EditorMenus";

type AiState = {
  status: "idle" | "streaming" | "ready" | "error";
  action: EditorAiAction;
  text: string;
  error?: string;
};

type SavedSelection = {
  from: number;
  to: number;
  snapshot: string;
};

const INITIAL_AI_STATE: AiState = {
  status: "idle",
  action: "continue",
  text: "",
};

export function EditorRuntime() {
  const { editor } = useEditor();
  const [aiState, setAiState] = useState<AiState>(INITIAL_AI_STATE);
  const selectionRef = useRef<SavedSelection | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /**
   * 用 ref 读"是否正在生成"。
   *
   * 直接把 `aiState.status` 放进 `requestAi` 的依赖里，会让它的身份在每次状态变化时
   * 重建；而它被当作 prop 传给工具栏和浮动菜单，连带触发它们重渲。
   */
  const aiStatusRef = useRef<AiState["status"]>(aiState.status);

  useEffect(() => {
    aiStatusRef.current = aiState.status;
  }, [aiState.status]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const requestAi = useCallback(
    async (action: EditorAiAction) => {
      if (!editor || aiStatusRef.current === "streaming") return;

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, "\n");
      if (action !== "continue" && !selectedText.trim()) {
        setAiState({
          status: "error",
          action,
          text: "",
          error: `请先选择需要${EDITOR_AI_ACTION_LABELS[action]}的文字`,
        });
        return;
      }
      if (selectedText.length > MAX_EDITOR_AI_SELECTION_CHARS) {
        setAiState({
          status: "error",
          action,
          text: "",
          error: "选择的文字过长，请缩小选区",
        });
        return;
      }

      const docSize = editor.state.doc.content.size;
      const contextStart = Math.max(
        0,
        from - MAX_EDITOR_AI_CONTEXT_CHARS + 2_000
      );
      const contextEnd = Math.min(docSize, to + 2_000);
      const context = editor.state.doc
        .textBetween(contextStart, contextEnd, "\n")
        .slice(-MAX_EDITOR_AI_CONTEXT_CHARS);

      selectionRef.current = {
        from: action === "continue" ? to : from,
        to,
        snapshot: JSON.stringify(editor.getJSON()),
      };

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setAiState({ status: "streaming", action, text: "" });

      try {
        const response = await fetch("/api/editor/ai", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, selectedText, context }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const result = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(result?.error ?? "AI 写作请求失败");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        /**
         * 流式内容按帧提交。
         *
         * 每个 chunk 都 setState 会一秒触发几十次 re-render，而每次重渲都会连带
         * 工具栏 / 浮动菜单 / 斜杠菜单。这里先累积，最多每帧刷一次（肉眼无差别）。
         */
        let frame: number | null = null;
        const flushStream = () => {
          frame = null;
          setAiState({ status: "streaming", action, text });
        };
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
            if (frame === null) frame = window.requestAnimationFrame(flushStream);
          }
        } finally {
          if (frame !== null) window.cancelAnimationFrame(frame);
          frame = null;
        }
        text += decoder.decode();
        if (!text.trim()) throw new Error("AI 未返回内容");
        setAiState({ status: "ready", action, text: text.trim() });
      } catch (error) {
        if (controller.signal.aborted) {
          setAiState(INITIAL_AI_STATE);
          return;
        }
        setAiState({
          status: "error",
          action,
          text: "",
          error: error instanceof Error ? error.message : "AI 写作请求失败",
        });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [editor]
  );

  const applyAiResult = () => {
    if (!editor || aiState.status !== "ready" || !selectionRef.current) return;
    const selection = selectionRef.current;
    if (JSON.stringify(editor.getJSON()) !== selection.snapshot) {
      setAiState({
        ...aiState,
        status: "error",
        error: "AI 生成期间文章已发生变化，请重新发起操作",
      });
      return;
    }

    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: selection.from, to: selection.to },
        plainTextToTiptapContent(aiState.text)
      )
      .run();
    selectionRef.current = null;
    setAiState(INITIAL_AI_STATE);
  };

  const stopAi = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    selectionRef.current = null;
    setAiState(INITIAL_AI_STATE);
  };

  const aiBusy = aiState.status === "streaming";

  return (
    <>
      <div className="order-first">
        <EditorToolbar onRequestAi={requestAi} aiBusy={aiBusy} />
      </div>
      <EditorBubbleMenu onRequestAi={requestAi} aiBusy={aiBusy} />
      <EditorSlashMenu />

      {aiState.status !== "idle" && (
        <div className="m-3 rounded-xl border border-primary/25 bg-primary-soft/60 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-medium text-primary">
              {aiBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              AI {EDITOR_AI_ACTION_LABELS[aiState.action]}
            </span>
            <button
              type="button"
              onClick={stopAi}
              className="rounded p-1 text-muted hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={aiBusy ? "停止生成" : "关闭"}
            >
              {aiBusy ? (
                <Square className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
          </div>
          {aiState.error ? (
            <p className="text-destructive">{aiState.error}</p>
          ) : (
            <p className="max-h-52 overflow-y-auto whitespace-pre-wrap leading-7">
              {aiState.text || "正在生成…"}
            </p>
          )}
          {aiState.status === "ready" && (
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={stopAi}
                className="rounded-lg px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/10"
              >
                放弃
              </button>
              <button
                type="button"
                onClick={applyAiResult}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:brightness-95"
              >
                <Check className="h-3.5 w-3.5" />
                应用
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
