import * as sbChat from "@/lib/api/supabase/chat";
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

export async function createConversation(
  input: CreateConversationInput,
  userId: string
): Promise<Conversation> {
  return sbChat.createConversation(input, userId);
}

export async function getConversation(
  id: string
): Promise<Conversation | null> {
  return sbChat.getConversation(id);
}

export async function listConversations(
  userId: string,
  options?: ListConversationsOptions
): Promise<Conversation[]> {
  return sbChat.listConversations(userId, options);
}

export async function updateConversation(
  id: string,
  userId: string,
  updates: UpdateConversationInput
): Promise<Conversation> {
  return sbChat.updateConversation(id, userId, updates);
}

export async function deleteConversation(
  id: string,
  userId: string
): Promise<void> {
  return sbChat.deleteConversation(id, userId);
}

export async function createMessage(
  input: CreateMessageInput,
  userId: string
): Promise<Message> {
  return sbChat.createMessage(input, userId);
}

export async function getMessages(
  conversationId: string,
  options?: ListMessagesOptions
): Promise<PaginatedResult<Message>> {
  return sbChat.getMessages(conversationId, options);
}

export async function verifyConversationOwnership(
  conversationId: string,
  userId: string
): Promise<boolean> {
  return sbChat.verifyConversationOwnership(conversationId, userId);
}
