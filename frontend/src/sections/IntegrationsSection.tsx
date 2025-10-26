import {useQuery} from '@tanstack/react-query';

import {Card} from '../components/ui/Card';
import {apiClient} from '../api/apiClient';

interface IntegrationStats {
    activeKeys: number;
    webhooks: number;
    dataSources: number;
}

const fetchIntegrations = async (): Promise<IntegrationStats> => {
    const {data} = await apiClient.get<IntegrationStats>('/integrations/stats/');
    return data;
};

const IntegrationsSection = () => {
    const {data, isError} = useQuery({
        queryKey: ['integrations', 'stats'],
        queryFn: fetchIntegrations,
        staleTime: 180_000,
        retry: 1
    });

    return (
        <Card>
            <h2>Интеграции</h2>
            <p>Управляйте API-ключами, вебхуками и потоками данных.</p>
            {isError ? (
                <p>Интеграции недоступны. Проверьте соединение с Integrations API.</p>
            ) : (
                <ul>
                    <li>API-ключей: {data?.activeKeys ?? '—'}</li>
                    <li>Вебхуков: {data?.webhooks ?? '—'}</li>
                    <li>Источников данных: {data?.dataSources ?? '—'}</li>
                </ul>
            )}
        </Card>
    );
};

export default IntegrationsSection;
