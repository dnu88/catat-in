/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@store': resolve(__dirname, './src/store'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@lib': resolve(__dirname, './src/lib'),
      '@theme': resolve(__dirname, './src/theme'),
      '@kaswise/shared/types': resolve(__dirname, '../../packages/shared/types/index.ts'),
      '@kaswise/shared/theme': resolve(__dirname, '../../packages/shared/theme/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // Proxy API calls ke FastAPI backend saat dev
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
          if (id.includes('firebase')) return 'vendor-firebase'
          if (id.includes('react-router') || id.includes('@remix-run')) return 'vendor-router'
          if (id.includes('axios')) return 'vendor-network'
          if (id.includes('zustand')) return 'vendor-state'
          if (id.includes('date-fns')) return 'vendor-date'

          return 'vendor-core'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
  },
})
