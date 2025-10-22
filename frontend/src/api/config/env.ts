const requiredEnvVars = ['VITE_API_BASE_URL'] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];

const getEnv = (key: RequiredEnvVar) => {
  const value = import.meta.env[key];
  if (!value) {
    console.warn(`Environment variable ${key} is not defined`);
  }
  return value ?? '';
};

export const env = {
  apiBaseUrl: getEnv('VITE_API_BASE_URL'),
  recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? ''
};
