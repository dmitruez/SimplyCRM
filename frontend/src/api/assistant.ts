import { apiClient } from './apiClient';
import { AssistantConversation, AssistantAskResponse } from '../types/assistant';

interface RawMessage {
  id: number;
  role: string;
  content: string;
  created_at: string;
  token_usage?: number;
  metadata?: Record<string, unknown> | null;
}

interface RawConversation {
  id: number;
  title: string;
  system_prompt?: string | null;
  created_at: string;
  updated_at: string;
  messages?: RawMessage[];
}

interface RawAskResponse {
  conversation: RawConversation;
  user_message_id: number;
  assistant_message_id: number;
  usage: Record<string, unknown>;
}

const normalizeConversation = (raw: RawConversation): AssistantConversation => ({
  id: raw.id,
  title: raw.title,
  systemPrompt: raw.system_prompt ?? undefined,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  messages:
    raw.messages?.map((message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant',
      content: message.content,
      createdAt: message.created_at,
      tokenUsage: message.token_usage,
      metadata: message.metadata ?? undefined
    })) ?? []
});

const normalizeAskResponse = (raw: RawAskResponse): AssistantAskResponse => ({
  conversation: normalizeConversation(raw.conversation),
  userMessageId: raw.user_message_id,
  assistantMessageId: raw.assistant_message_id,
  usage: raw.usage
});

export const assistantApi = {
  async listConversations(): Promise<AssistantConversation[]> {
    const { data } = await apiClient.get<RawConversation[]>('/assistant/ai/conversations/');
    return data.map(normalizeConversation);
  },

  async createConversation(payload: { title: string; systemPrompt?: string }): Promise<AssistantConversation> {
    const { data } = await apiClient.post<RawConversation>('/assistant/ai/conversations/', {
      title: payload.title,
      system_prompt: payload.systemPrompt ?? null
    });
    return normalizeConversation(data);
  },

  async ask(conversationId: number, prompt: string): Promise<AssistantAskResponse> {
    const { data } = await apiClient.post<RawAskResponse>(`/assistant/ai/conversations/${conversationId}/ask/`, {
      prompt
    });
    return normalizeAskResponse(data);
  }
};
