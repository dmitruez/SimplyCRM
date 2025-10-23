const requiredEnvVars = ['VITE_API_BASE_URL'] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];

const getEnv = (key: RequiredEnvVar) => {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Environment variable ${key} is not defined`);
  }
  return value ?? '';
};

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? `${fallback}`, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  apiBaseUrl: getEnv('VITE_API_BASE_URL'),
  recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  apiMaxRetries: parseNumber(import.meta.env.VITE_API_MAX_RETRIES, 2),
  apiRetryBaseDelayMs: parseNumber(import.meta.env.VITE_API_RETRY_BASE_DELAY_MS, 800)
};
