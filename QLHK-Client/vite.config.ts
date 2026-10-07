import { defineConfig } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import react from '@vitejs/plugin-react'

// Normalize Windows NTFS junction (c:\Projects -> C:\Users\umnuar\Documents\Projects)
if (fs.existsSync(process.cwd())) {
  const realCwd = fs.realpathSync(process.cwd())
  if (realCwd.toLowerCase() !== process.cwd().toLowerCase()) {
    try {
      process.chdir(realCwd)
    } catch {}
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-excel': ['xlsx'],
        },
      },
    },
  },
})
