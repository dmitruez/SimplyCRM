import {useState} from 'react';
import {type CredentialResponse, GoogleLogin} from '@react-oauth/google';

import {env} from '../../api/config/env';
import {Button} from '../ui/Button';
import {notificationBus} from '../notifications/notificationBus';

interface Props {
    onCredential: (credential: string) => Promise<void>;
    mode?: 'signin' | 'signup';
}

export const GoogleLoginButton = ({onCredential, mode = 'signin'}: Props) => {
    const [isProcessing, setIsProcessing] = useState(false);

    if (!env.googleClientId) {
        return (
            <Button type="button" variant="secondary" disabled>
                Google ID не сконфигурирован
            </Button>
        );
    }

    const handleSuccess = async (response: CredentialResponse) => {
        if (isProcessing) {
            return;
        }
        if (!response.credential) {
            notificationBus.publish({
                type: 'error',
                title: 'Google вход недоступен',
                message: 'Не удалось получить credential из ответа Google.'
            });
            return;
        }
        try {
            setIsProcessing(true);
            await onCredential(response.credential);
        } catch (error: any) {
            const detail = error?.response?.data?.detail;
            notificationBus.publish({
                type: 'error',
                title: 'Ошибка входа через Google',
                message: detail ?? 'Попробуйте снова или используйте пароль.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => {
                notificationBus.publish({
                    type: 'error',
                    title: 'Google вход недоступен',
                    message: 'Попробуйте обновить страницу и повторить попытку.'
                });
            }}
            useOneTap={false}
            text={mode === 'signup' ? 'signup_with' : 'signin_with'}
            shape="rectangular"
            size="large"
            logo_alignment="left"
            width="100%"
            context={mode === 'signup' ? 'signup' : 'signin'}
        />
    );
};
