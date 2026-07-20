import { getSupabaseAdmin } from "./client";
import type {
  Conversation,
  Message,
  CreateConversationInput,
  UpdateConversationInput,
  CreateMessageInput,
  ListConversationsOptions,
  ListMessagesOptions,
  PaginatedResult,
} from "@/types/chat";
import { getDefaultModelId } from "@/lib/services/ai";

type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  model_id: string;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model_id: string | null;
  created_at: string;
};

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    modelId: row.model_id,
    systemPrompt: row.system_prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    modelId: row.model_id,
    createdAt: row.created_at,
  };
}

export async function createConversation(
  input: CreateConversationInput,
  userId: string
): Promise<Conversation> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: userId,
      title: input.title ?? "新对话",
      model_id: input.modelId ?? getDefaultModelId(),
      system_prompt: input.systemPrompt ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return mapConversation(data as ConversationRow);
}

export async function getConversation(
  id: string
): Promise<Conversation | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get conversation: ${error.message}`);
  }
  return mapConversation(data as ConversationRow);
}

export async function listConversations(
  userId: string,
  options?: ListConversationsOptions
): Promise<Conversation[]> {
  const supabase = getSupabaseAdmin();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const { data, error } = await supabase
    .from("chat_conversations")
    .select()
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to list conversations: ${error.message}`);
  return (data as ConversationRow[]).map(mapConversation);
}

export async function updateConversation(
  id: string,
  userId: string,
  updates: UpdateConversationInput
): Promise<Conversation> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchErr } = await supabase
    .from("chat_conversations")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchErr) {
    if (fetchErr.code === "PGRST116") {
      throw new Error("对话不存在");
    }
    throw new Error(`Failed to verify conversation: ${fetchErr.message}`);
  }
  if ((existing as { user_id: string }).user_id !== userId) {
    throw new Error("无权修改此对话");
  }

  const updateFields: Record<string, unknown> = {};
  if (updates.title !== undefined) updateFields.title = updates.title;
  if (updates.modelId !== undefined) updateFields.model_id = updates.modelId;
  if (updates.systemPrompt !== undefined)
    updateFields.system_prompt = updates.systemPrompt;

  const { data, error } = await supabase
    .from("chat_conversations")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update conversation: ${error.message}`);
  return mapConversation(data as ConversationRow);
}

export async function deleteConversation(
  id: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchErr } = await supabase
    .from("chat_conversations")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchErr) {
    if (fetchErr.code === "PGRST116") return;
    throw new Error(`Failed to verify conversation: ${fetchErr.message}`);
  }
  if ((existing as { user_id: string }).user_id !== userId) {
    throw new Error("无权删除此对话");
  }

  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
}

export async function createMessage(
  input: CreateMessageInput,
  userId: string
): Promise<Message> {
  const supabase = getSupabaseAdmin();
  const isOwner = await verifyConversationOwnership(input.conversationId, userId);
  if (!isOwner) {
    throw new Error("无权访问此对话");
  }
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      model_id: input.modelId ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create message: ${error.message}`);
  return mapMessage(data as MessageRow);
}

export async function getMessages(
  conversationId: string,
  options?: ListMessagesOptions
): Promise<PaginatedResult<Message>> {
  const supabase = getSupabaseAdmin();
  const limit = options?.limit ?? 100;
  const latestFirst = options?.latestFirst ?? false;

  let query = supabase
    .from("chat_messages")
    .select()
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: !latestFirst })
    .limit(limit + 1);

  if (options?.before) {
    const { data: ref } = await supabase
      .from("chat_messages")
      .select("created_at")
      .eq("id", options.before)
      .single();
    if (ref) {
      query = query.lt("created_at", (ref as { created_at: string }).created_at);
    }
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get messages: ${error.message}`);

  const rows = data as MessageRow[];
  const hasMore = rows.length > limit;
  const dataRows = hasMore ? rows.slice(0, limit) : rows;
  // The database query runs newest-first to retain the most recent context,
  // but callers always receive messages in chronological order.
  const orderedRows = latestFirst ? dataRows.reverse() : dataRows;

  return {
    data: orderedRows.map(mapMessage),
    hasMore,
  };
}

export async function verifyConversationOwnership(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("user_id")
    .eq("id", conversationId)
    .single();

  if (error || !data) return false;
  return (data as { user_id: string }).user_id === userId;
}
