export interface FeatureFlag {
    code: string;
    name: string;
    enabled: boolean;
    description?: string;
}

export interface OrganizationSummary {
    id: number;
    name: string;
    slug: string;
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    organization?: OrganizationSummary;
    featureFlags: FeatureFlag[];
}

export interface AuthState {
    status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
    profile: UserProfile | null;
    accessToken: string | null;
}

export interface AuthContextValue extends AuthState {
    login: (payload: { username: string; password: string; captchaToken?: string }) => Promise<void>;
    loginWithGoogle: (payload: { credential: string; organizationName?: string; planKey?: string }) => Promise<void>;
    register: (payload: RegistrationFormValues) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    isFeatureEnabled: (code: string) => boolean;
}

export interface RegistrationFormValues {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    planKey?: string;
}
