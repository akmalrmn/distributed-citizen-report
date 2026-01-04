import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/notifications': {
        target: 'http://localhost:3003',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  }
})
