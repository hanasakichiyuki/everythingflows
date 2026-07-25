"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createConversationAction,
  listConversationsAction,
  updateConversationAction,
  deleteConversationAction,
  getMessagesAction,
  getAvailableModelsAction,
  getCurrentUserAction,
} from "@/app/actions/chat";
import { getAvailableModels } from "@/lib/services/ai/models";
import type { Conversation, Message } from "@/types/chat";

export interface AvailableModel {
  id: string;
  name: string;
  isFree: boolean;
  description: string;
}

export interface ChatError {
  message: string;
  code: "auth" | "not_found" | "server" | "unknown";
}

/** 创建一个本地虚拟对话（立即可用，不等待 server action） */
function createLocalConversation(modelId?: string): Conversation {
  const now = new Date().toISOString();
  const freeModel = getAvailableModels().find((m) => m.isFree);
  return {
    id: crypto.randomUUID(),
    userId: "",
    title: "新对话",
    modelId: modelId ?? freeModel?.id ?? "glm-4.7-flash",
    systemPrompt: null,
    createdAt: now,
    updatedAt: now,
  };
}

const LOCAL_CONVS_KEY = "ef:chat:conversations";
const LOCAL_MSGS_KEY = "ef:chat:messages";

function loadLocalConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CONVS_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function saveLocalConversations(convs: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CONVS_KEY, JSON.stringify(convs));
  } catch {}
}

function loadLocalMessages(convId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_MSGS_KEY);
    const map: Record<string, Message[]> = raw ? JSON.parse(raw) : {};
    return map[convId] ?? [];
  } catch {
    return [];
  }
}

function saveLocalMessages(convId: string, messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_MSGS_KEY);
    const map: Record<string, Message[]> = raw ? JSON.parse(raw) : {};
    map[convId] = messages;
    localStorage.setItem(LOCAL_MSGS_KEY, JSON.stringify(map));
  } catch {}
}

function deleteLocalMessages(convId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_MSGS_KEY);
    const map: Record<string, Message[]> = raw ? JSON.parse(raw) : {};
    delete map[convId];
    localStorage.setItem(LOCAL_MSGS_KEY, JSON.stringify(map));
  } catch {}
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  models: AvailableModel[];
  loading: boolean;
  messagesLoading: boolean;
  error: ChatError | null;
  isAuthenticated: boolean;
}

export function useChatState(initialConversationId?: string) {
  const router = useRouter();
  const [state, setState] = useState<ChatState>({
    conversations: [],
    activeConversation: null,
    messages: [],
    models: [],
    loading: true,
    messagesLoading: false,
    error: null,
    isAuthenticated: false,
  });

  // 用 ref 保存最新 isAuthenticated，避免回调依赖频繁变化
  const isAuthenticatedRef = useRef(false);
  useEffect(() => {
    isAuthenticatedRef.current = state.isAuthenticated;
  }, [state.isAuthenticated]);

  const activeConvIdRef = useRef<string | null>(null);
  const messagesRequestRef = useRef(0);
  useEffect(() => {
    activeConvIdRef.current = state.activeConversation?.id ?? null;
    messagesRequestRef.current += 1;
  }, [state.activeConversation]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversations = useCallback(
    async (preferId?: string) => {
      // 先检查登录状态（合并原 loadAuth 逻辑，避免竞态）
      const authResult = await getCurrentUserAction();
      if (!authResult.ok) {
        setState((s) => ({
          ...s,
          loading: false,
          error: { message: authResult.error, code: "server" },
        }));
        return [];
      }
      const isAuth = authResult.data.id !== null;
      isAuthenticatedRef.current = isAuth;
      setState((s) => ({ ...s, isAuthenticated: isAuth }));

      if (!isAuth) {
        // 匿名用户：从 localStorage 加载对话历史，不自动创建空对话
        const localConvs = loadLocalConversations();
        const initId = preferId ?? initialConversationId;
        let active: Conversation | null = null;
        if (initId) {
          active = localConvs.find((c) => c.id === initId) ?? null;
        }
        if (!active && localConvs.length > 0) {
          active = localConvs[0];
        }
        // 没有匹配对话时进入空状态页面，等用户发消息再创建
        setState((s) => ({
          ...s,
          conversations: localConvs,
          activeConversation: active,
          loading: false,
        }));
        return localConvs;
      }

      // 登录用户：从服务器加载，不自动创建空对话
      const result = await listConversationsAction();
      if (result.ok) {
        const conversations = result.data;
        let active: Conversation | null = null;
        const initId = preferId ?? initialConversationId;
        if (initId) {
          active = conversations.find((c) => c.id === initId) ?? null;
        } else if (conversations.length > 0) {
          active = conversations[0];
        }
        // 没有对话时进入空状态页面，等用户发消息再创建
        setState((s) => ({
          ...s,
          conversations,
          activeConversation: active,
          loading: false,
        }));
        return conversations;
      }
      setState((s) => ({
        ...s,
        loading: false,
        error: { message: result.error, code: "server" },
      }));
      return [];
    },
    [initialConversationId]
  );

  const loadModels = useCallback(async () => {
    const result = await getAvailableModelsAction();
    if (result.ok) {
      setState((s) => ({ ...s, models: result.data }));
    } else {
      setState((s) => ({
        ...s,
        error: { message: result.error, code: "server" },
      }));
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const requestId = messagesRequestRef.current + 1;
    messagesRequestRef.current = requestId;
    const updateCurrentConversation = (
      updater: (current: ChatState) => ChatState
    ) => {
      setState((current) =>
        current.activeConversation?.id === conversationId &&
        messagesRequestRef.current === requestId
          ? updater(current)
          : current
      );
    };

    if (!isAuthenticatedRef.current) {
      // 匿名用户：从 localStorage 加载消息
      const msgs = loadLocalMessages(conversationId);
      updateCurrentConversation((current) => ({
        ...current,
        messages: msgs,
        messagesLoading: false,
        error: null,
      }));
      return;
    }
    updateCurrentConversation((current) => ({ ...current, messagesLoading: true }));
    const result = await getMessagesAction(conversationId);
    if (result.ok) {
      updateCurrentConversation((current) => ({
        ...current,
        messages: result.data,
        messagesLoading: false,
        error: null,
      }));
    } else {
      updateCurrentConversation((current) => ({
        ...current,
        messagesLoading: false,
        error: {
          message: result.error,
          code: result.error.includes("登录") ? "auth" : "server",
        },
      }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void loadConversations();
      void loadModels();
    });
    return () => {
      cancelled = true;
    };
  }, [loadConversations, loadModels]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (state.activeConversation) {
        void loadMessages(state.activeConversation.id);
      } else {
        setState((s) => ({ ...s, messages: [] }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state.activeConversation, loadMessages]);

  // 卸载时清理防抖定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleNew = useCallback(() => {
    setState((s) => ({
      ...s,
      activeConversation: null,
      messages: [],
      error: null,
    }));
    router.replace("/chat");
  }, [router]);

  // 空状态页面用户发送第一条消息时调用：创建对话 + 返回对话对象
  const handleCreateAndSend = useCallback(
    async (firstMessage: string, modelId?: string): Promise<Conversation | null> => {
      const title = firstMessage.slice(0, 20) + (firstMessage.length > 20 ? "…" : "");

      if (!isAuthenticatedRef.current) {
        const localConv = createLocalConversation(modelId);
        localConv.title = title;
        setState((s) => {
          const newConvs = [localConv, ...s.conversations];
          saveLocalConversations(newConvs);
          return {
            ...s,
            conversations: newConvs,
            activeConversation: localConv,
            messages: [],
            error: null,
          };
        });
        return localConv;
      }

      const result = await createConversationAction({ title, modelId });
      if (result.ok) {
        const conv = result.data;
        setState((s) => ({
          ...s,
          conversations: [conv, ...s.conversations],
          activeConversation: conv,
          messages: [],
          error: null,
        }));
        router.replace(`/chat?id=${conv.id}`);
        return conv;
      }
      setState((s) => ({
        ...s,
        error: {
          message: result.error,
          code: result.error.includes("登录") ? "auth" : "server",
        },
      }));
      return null;
    },
    [router]
  );

  const handleSelect = useCallback(
    (id: string) => {
      const conv = state.conversations.find((c) => c.id === id);
      if (conv) {
        setState((s) => ({
          ...s,
          activeConversation: conv,
          messages: [],
          error: null,
        }));
        router.replace(`/chat?id=${id}`);
      }
    },
    [router, state.conversations]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      // 匿名用户：从本地删除
      if (!isAuthenticatedRef.current) {
        let nextActiveId: string | null = null;
        setState((s) => {
          const remaining = s.conversations.filter((c) => c.id !== id);
          const wasActive = s.activeConversation?.id === id;
          saveLocalConversations(remaining);
          deleteLocalMessages(id);
          let newActive: Conversation | null =
            wasActive ? (remaining[0] ?? null) : s.activeConversation;
          if (!newActive) {
            newActive = createLocalConversation();
            remaining.unshift(newActive);
            saveLocalConversations(remaining);
          }
          nextActiveId = newActive.id;
          return {
            ...s,
            conversations: remaining,
            activeConversation: newActive,
            messages: wasActive ? [] : s.messages,
            error: null,
          };
        });
        if (nextActiveId) {
          router.replace(`/chat?id=${nextActiveId}`);
        }
        return;
      }
      const result = await deleteConversationAction(id);
      if (result.ok) {
        let nextActiveId: string | null = null;
        setState((s) => {
          const remaining = s.conversations.filter((c) => c.id !== id);
          const wasActive = s.activeConversation?.id === id;
          nextActiveId = wasActive ? (remaining[0]?.id ?? null) : s.activeConversation?.id ?? null;
          return {
            ...s,
            conversations: remaining,
            activeConversation: wasActive
              ? (remaining[0] ?? null)
              : s.activeConversation,
            messages: wasActive ? [] : s.messages,
            error: null,
          };
        });
        if (nextActiveId) {
          router.replace(`/chat?id=${nextActiveId}`);
        } else {
          router.replace("/chat");
        }
      } else {
        setState((s) => ({
          ...s,
          error: {
            message: result.error,
            code: result.error.includes("登录") ? "auth" : "server",
          },
        }));
      }
    },
    [router]
  );

  const handleRename = useCallback(async (id: string, title: string) => {
    // 匿名用户：仅更新本地虚拟对话标题，同步 localStorage
    if (!isAuthenticatedRef.current) {
      setState((s) => {
        const newConvs = s.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        );
        saveLocalConversations(newConvs);
        return {
          ...s,
          conversations: newConvs,
          activeConversation:
            s.activeConversation?.id === id
              ? { ...s.activeConversation, title }
              : s.activeConversation,
        };
      });
      return true;
    }
    const result = await updateConversationAction(id, { title });
    if (result.ok) {
      const updated = result.data;
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === id ? updated : c
        ),
        activeConversation:
          s.activeConversation?.id === id ? updated : s.activeConversation,
        error: null,
      }));
      return true;
    }
    setState((s) => ({
      ...s,
      error: {
        message: result.error,
        code: result.error.includes("登录") ? "auth" : "server",
      },
    }));
    return false;
  }, []);

  const handleSwitchModel = useCallback(async (id: string, modelId: string) => {
    // 匿名用户：更新本地虚拟对话的 modelId + localStorage
    if (!isAuthenticatedRef.current) {
      setState((s) => {
        const newConvs = s.conversations.map((c) =>
          c.id === id ? { ...c, modelId } : c
        );
        saveLocalConversations(newConvs);
        return {
          ...s,
          conversations: newConvs,
          activeConversation:
            s.activeConversation?.id === id
              ? { ...s.activeConversation, modelId }
              : s.activeConversation,
          error: null,
        };
      });
      return true;
    }
    const result = await updateConversationAction(id, { modelId });
    if (result.ok) {
      const updated = result.data;
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === id ? updated : c
        ),
        activeConversation:
          s.activeConversation?.id === id ? updated : s.activeConversation,
        error: null,
      }));
      return true;
    }
    setState((s) => ({
      ...s,
      error: {
        message: result.error,
        code: result.error.includes("登录") ? "auth" : "server",
      },
    }));
    return false;
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    void loadConversations(activeConvIdRef.current ?? undefined);
    void loadModels();
  }, [loadConversations, loadModels]);

  // ChatPanel 通过此回调报告消息变化，匿名用户防抖写入 localStorage
  const onMessagesChange = useCallback((messages: Message[]) => {
    if (isAuthenticatedRef.current) return;
    const convId = activeConvIdRef.current;
    if (!convId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveLocalMessages(convId, messages);
    }, 400);
  }, []);

  return {
    ...state,
    handleNew,
    handleCreateAndSend,
    handleSelect,
    handleDelete,
    handleRename,
    handleSwitchModel,
    clearError,
    reload,
    onMessagesChange,
  };
}
