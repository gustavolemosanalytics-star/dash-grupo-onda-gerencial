import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Em desenvolvimento, usa hardcoded (problema de autenticação local)
  // Em produção, usa o .env.production
  const API_URL = mode === 'development'
    ? 'https://dashboard-backend-327087942798.us-central1.run.app'
    : (env.VITE_API_URL || 'https://dashboard-backend-327087942798.us-central1.run.app')

  console.log('🔧 Vite Config - Mode:', mode)
  console.log('🔧 Vite Config - API_URL:', API_URL)

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: API_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
