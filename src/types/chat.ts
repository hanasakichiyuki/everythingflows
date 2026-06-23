export type ChatRole = "user" | "assistant" | "system";

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  modelId: string;
  systemPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  modelId: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export interface CreateConversationInput {
  title?: string;
  modelId?: string;
  systemPrompt?: string;
}

export interface UpdateConversationInput {
  title?: string;
  modelId?: string;
  systemPrompt?: string | null;
}

export interface CreateMessageInput {
  conversationId: string;
  role: ChatRole;
  content: string;
  modelId?: string;
}

export interface ListConversationsOptions {
  limit?: number;
  offset?: number;
}

export interface ListMessagesOptions {
  limit?: number;
  before?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
}
