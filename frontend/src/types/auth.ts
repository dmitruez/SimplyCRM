export interface FeatureFlag {
  code: string;
  name: string;
  enabled: boolean;
  description?: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  organization?: string;
  featureFlags: FeatureFlag[];
}

export interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  profile: UserProfile | null;
  accessToken: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (payload: { username: string; password: string; captchaToken?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isFeatureEnabled: (code: string) => boolean;
}
