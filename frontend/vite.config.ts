import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: Number(env.FRONTEND_PORT ?? 5173),
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL ?? 'http://localhost:8000',
          changeOrigin: true
        }
      }
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly'
      }
    }
  };
});
