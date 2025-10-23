import { apiClient, setAccessToken } from './apiClient';
import { type RegistrationFormValues, type UserProfile } from '../types/auth';

interface RawFeatureFlag {
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
}

interface RawUserProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  organization?: {
    id: number;
    name: string;
    slug: string;
  };
  feature_flags?: RawFeatureFlag[];
}

interface AuthSuccessResponse {
  access: string;
  token_type: string;
  profile: RawUserProfile;
}

interface AuthSuccessPayload {
  access: string;
  token_type: string;
  profile: UserProfile;
}

interface LoginPayload {
  username: string;
  password: string;
  captchaToken?: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthSuccessPayload> {
    const { data } = await apiClient.post<AuthSuccessResponse>('/auth/token/', payload);
    setAccessToken(data.access);
    return { ...data, profile: normalizeProfile(data.profile) };
  },
  async loginWithGoogle(payload: {
    credential: string;
    organizationName?: string;
    planKey?: string;
  }): Promise<AuthSuccessPayload> {
    const { data } = await apiClient.post<AuthSuccessResponse>('/auth/google/', payload);
    setAccessToken(data.access);
    return { ...data, profile: normalizeProfile(data.profile) };
  },
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/token/revoke/');
    } finally {
      setAccessToken(null);
    }
  },
  async getProfile(): Promise<UserProfile> {
    const { data } = await apiClient.get<RawUserProfile>('/auth/profile/');
    return normalizeProfile(data);
  },
  async register(payload: RegistrationFormValues): Promise<AuthSuccessPayload> {
    const { data } = await apiClient.post<AuthSuccessResponse>('/auth/register/', {
      username: payload.username,
      email: payload.email,
      password: payload.password,
      first_name: payload.firstName,
      last_name: payload.lastName,
      organization_name: payload.organizationName,
      plan_key: payload.planKey
    });
    setAccessToken(data.access);
    return { ...data, profile: normalizeProfile(data.profile) };
  }
};

function normalizeProfile(profile: RawUserProfile): UserProfile {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    organization: profile.organization
      ? {
          id: profile.organization.id,
          name: profile.organization.name,
          slug: profile.organization.slug
        }
      : undefined,
    featureFlags: (profile.feature_flags ?? []).map((flag) => ({
      code: flag.code,
      name: flag.name,
      description: flag.description,
      enabled: Boolean(flag.enabled)
    }))
  };
}
