import { apiClient, setAccessToken } from './apiClient';
import { UserProfile } from '../types/auth';

interface TokenResponse {
  access: string;
  refresh?: string;
}

export const authApi = {
  async login(payload: {
    username: string;
    password: string;
    captchaToken?: string;
  }): Promise<string> {
    const { data } = await apiClient.post<TokenResponse>(
      '/auth/token/',
      payload
    );
    setAccessToken(data.access);
    return data.access;
  },
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/token/revoke/');
    } finally {
      setAccessToken(null);
    }
  },
  async getProfile(): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>('/auth/profile/');
    return data;
  }
};
