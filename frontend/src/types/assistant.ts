export interface AssistantMessage {
  id: number;
  role: 'user' | 'assistant' | string;
  content: string;
  createdAt: string;
  tokenUsage?: number;
  metadata?: Record<string, unknown> | null;
}

export interface AssistantConversation {
  id: number;
  title: string;
  systemPrompt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: AssistantMessage[];
}

export interface AssistantAskResponse {
  conversation: AssistantConversation;
  userMessageId: number;
  assistantMessageId: number;
  usage: Record<string, unknown>;
}
