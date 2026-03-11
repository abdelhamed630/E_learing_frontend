import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'https://elearing-production-2841.up.railway.app', changeOrigin: true },
      '/media': { target: 'https://elearing-production-2841.up.railway.app', changeOrigin: true }
    }
  },
  build: {
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'], api: ['axios'] } }
    },
    chunkSizeWarningLimit: 800,
  }
})