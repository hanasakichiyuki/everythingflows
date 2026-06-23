"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import {
  createConversation,
  getConversation,
  listConversations,
  updateConversation,
  deleteConversation,
  createMessage,
  getMessages,
  verifyConversationOwnership,
} from "@/lib/api/chat";
import { createClient } from "@/lib/supabase/server-client";
import { getAvailableModels, isModelConfigured } from "@/lib/services/ai";
import type { Conversation, Message, PaginatedResult } from "@/types/chat";

async function getUserId(): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id;
  } catch {
    return undefined;
  }
}

/** 匿名用户可用的第一个免费模型；若无免费模型则返回 null。 */
function getFreeModelId(): string | null {
  const free = getAvailableModels().find((m) => m.isFree);
  return free?.id ?? null;
}

/** 创建一个虚拟对话对象（匿名用户使用，不持久化到数据库），强制使用免费模型 */
function createVirtualConversation(input?: { title?: string }): Conversation {
  const now = new Date().toISOString();
  const freeModelId = getFreeModelId();
  if (!freeModelId) {
    // 无免费模型时仍给一个占位 id，route 层会拦截
    return {
      id: crypto.randomUUID(),
      userId: "",
      title: input?.title ?? "新对话",
      modelId: "glm-4.7-flash",
      systemPrompt: null,
      createdAt: now,
      updatedAt: now,
    };
  }
  return {
    id: crypto.randomUUID(),
    userId: "",
    title: input?.title ?? "新对话",
    modelId: freeModelId,
    systemPrompt: null,
    createdAt: now,
    updatedAt: now,
  };
}

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

function handle<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => {
    const message = e instanceof Error ? e.message : "操作失败";
    return { ok: false, error: message } as ActionResult<T>;
  });
}

export async function createConversationAction(
  input: { title?: string; modelId?: string; systemPrompt?: string }
): Promise<ActionResult<Conversation>> {
  return handle(async () => {
    const userId = await getUserId();

    if (input.modelId && !isModelConfigured(input.modelId)) {
      return fail("所选模型未配置，请选择可用模型");
    }

    // 匿名用户返回虚拟对话，不持久化；强制使用免费模型
    if (!userId) {
      if (!getFreeModelId()) {
        return fail("当前未配置免费模型，无法匿名使用，请先登录");
      }
      return ok(createVirtualConversation(input));
    }

    const conversation = await createConversation(input, userId);
    revalidatePath("/chat");
    return ok(conversation);
  });
}

export async function getCurrentUserAction(): Promise<
  ActionResult<{ id: string | null }>
> {
  return handle(async () => {
    const userId = await getUserId();
    return ok({ id: userId ?? null });
  });
}

export async function getConversationAction(
  id: string
): Promise<ActionResult<Conversation>> {
  return handle(async () => {
    const userId = await getUserId();
    if (!userId) return fail("对话不存在");
    const conversation = await getConversation(id);
    if (!conversation) {
      return fail("对话不存在");
    }
    if (conversation.userId !== userId) {
      return fail("无权访问此对话");
    }
    return ok(conversation);
  });
}

export async function listConversationsAction(): Promise<
  ActionResult<Conversation[]>
> {
  return handle(async () => {
    const userId = await getUserId();
    if (!userId) return ok([]);
    const conversations = await listConversations(userId);
    return ok(conversations);
  });
}

export async function updateConversationAction(
  id: string,
  updates: { title?: string; modelId?: string; systemPrompt?: string | null }
): Promise<ActionResult<Conversation>> {
  return handle(async () => {
    const userId = await getUserId();
    if (!userId) return fail("请先登录");

    if (updates.modelId !== undefined && !isModelConfigured(updates.modelId)) {
      return fail("所选模型未配置，请选择可用模型");
    }

    const conversation = await updateConversation(id, userId, updates);
    revalidatePath("/chat");
    return ok(conversation);
  });
}

export async function deleteConversationAction(
  id: string
): Promise<ActionResult<null>> {
  return handle(async () => {
    const userId = await getUserId();
    if (!userId) return fail("请先登录");
    await deleteConversation(id, userId);
    revalidatePath("/chat");
    return ok(null);
  });
}

export async function createMessageAction(
  input: { conversationId: string; role: "user" | "assistant" | "system"; content: string }
): Promise<ActionResult<Message>> {
  return handle(async () => {
    const userId = await getUserId();
    // 匿名用户不保存消息，直接返回成功
    if (!userId) {
      return ok({
        id: crypto.randomUUID(),
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        modelId: null,
        createdAt: new Date().toISOString(),
      });
    }
    const isOwner = await verifyConversationOwnership(
      input.conversationId,
      userId
    );
    if (!isOwner) {
      return fail("无权访问此对话");
    }
    const message = await createMessage(input);
    return ok(message);
  });
}

export async function getMessagesAction(
  conversationId: string
): Promise<ActionResult<Message[]>> {
  return handle(async () => {
    const userId = await getUserId();
    if (!userId) return ok([]);
    const isOwner = await verifyConversationOwnership(conversationId, userId);
    if (!isOwner) {
      return fail("无权访问此对话");
    }
    const result: PaginatedResult<Message> = await getMessages(conversationId);
    return ok(result.data);
  });
}

export async function getAvailableModelsAction(): Promise<
  ActionResult<{ id: string; name: string; isFree: boolean; description: string }[]>
> {
  return handle(async () => {
    const models = getAvailableModels().map((m) => ({
      id: m.id,
      name: m.name,
      isFree: m.isFree,
      description: m.description,
    }));
    return ok(models);
  });
}
