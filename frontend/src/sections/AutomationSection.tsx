import {useQuery} from '@tanstack/react-query';

import {Card} from '../components/ui/Card';
import {apiClient} from '../api/apiClient';

interface AutomationStats {
    activeFlows: number;
    pendingApprovals: number;
}

const fetchAutomation = async (): Promise<AutomationStats> => {
    const {data} = await apiClient.get<AutomationStats>('/automation/stats/');
    return data;
};

const AutomationSection = () => {
    const {data, isError} = useQuery({
        queryKey: ['automation', 'stats'],
        queryFn: fetchAutomation,
        staleTime: 180_000,
        retry: 1
    });

    return (
        <Card>
            <h2>Автоматизация</h2>
            <p>Управляйте триггерами, уведомлениями и бизнес-правилами.</p>
            {isError ? (
                <p>Не удалось загрузить сценарии. Проверьте Automation API.</p>
            ) : (
                <ul>
                    <li>Активные сценарии: {data?.activeFlows ?? '—'}</li>
                    <li>Ожидают подтверждения: {data?.pendingApprovals ?? '—'}</li>
                </ul>
            )}
        </Card>
    );
};

export default AutomationSection;
