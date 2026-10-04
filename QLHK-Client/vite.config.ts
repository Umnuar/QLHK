import { defineConfig } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const realDir = fs.existsSync(__dirname) ? fs.realpathSync(__dirname) : __dirname

// https://vitejs.dev/config/
export default defineConfig({
  root: realDir,
  resolve: {
    alias: {
      '@': path.resolve(realDir, './src'),
    },
  },
  server: {
    port: 5175,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    nodePolyfills({
      include: ['stream', 'buffer', 'util', 'events', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    react(),
    electron({
      main: {
        entry: path.join(realDir, 'electron/main.ts'),
        vite: {
          build: {
            rollupOptions: {},
          },
        },
      },
      preload: {
        input: path.join(realDir, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test'
        ? undefined
        : {},
    }),
  ],
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

