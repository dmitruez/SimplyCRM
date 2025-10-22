import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/apiClient';
import styles from './AssistantSection.module.css';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantStats {
  usageTokens: number;
  conversations: number;
}

const fetchConversation = async (): Promise<ConversationMessage[]> => {
  const { data } = await apiClient.get<ConversationMessage[]>(
    '/ai/conversations/latest/messages/'
  );
  return data;
};

const fetchAssistantStats = async (): Promise<AssistantStats> => {
  const { data } = await apiClient.get<AssistantStats>('/ai/conversations/summary/');
  return data;
};

const AssistantSection = () => {
  const [prompt, setPrompt] = useState('');
  const { data: messages, isError: isMessagesError } = useQuery({
    queryKey: ['assistant', 'messages'],
    queryFn: fetchConversation,
    staleTime: 30_000,
    retry: 1
  });
  const { data: stats, isError: isStatsError } = useQuery({
    queryKey: ['assistant', 'stats'],
    queryFn: fetchAssistantStats,
    staleTime: 120_000,
    retry: 1
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ConversationMessage>(
        '/ai/conversations/ask/',
        { prompt }
      );
      return data;
    },
    onSuccess: () => {
      setPrompt('');
    }
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) {
      return;
    }
    mutation.mutate();
  };

  return (
    <Card>
      <div className={styles.wrapper}>
        <div>
          <h2>AI-ассистент</h2>
          <p>Получайте контекстные ответы с данными CRM, инсайтами и логами расхода токенов.</p>
        </div>
        <div className={styles.contextGrid}>
          <Card variant="subdued">
            <strong>Расход токенов</strong>
            <span>{isStatsError ? 'н/д' : `${stats?.usageTokens ?? '—'} шт.`}</span>
          </Card>
          <Card variant="subdued">
            <strong>Активные диалоги</strong>
            <span>{isStatsError ? 'н/д' : stats?.conversations ?? '—'}</span>
          </Card>
        </div>
        <div className={styles.messages}>
          {isMessagesError ? (
            <p>История чата временно недоступна. Попробуйте позже.</p>
          ) : (
            (messages ?? []).slice(-6).map((message) => (
              <p key={message.id}>
                <strong>{message.role === 'assistant' ? 'SimplyCRM' : 'Вы'}:</strong>{' '}
                {message.content}
              </p>
            ))
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            rows={3}
            placeholder="Спросите ассистента: например, рекомендации по ценам"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            style={{ width: '100%', padding: '1rem', borderRadius: '12px' }}
          />
          <Button type="submit" disabled={mutation.isPending}>
            Отправить
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default AssistantSection;
