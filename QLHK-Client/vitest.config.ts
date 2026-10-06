import { defineConfig } from 'vitest/config'
import path from 'node:path'
import fs from 'node:fs'
import react from '@vitejs/plugin-react'

import { fileURLToPath } from 'node:url'

if (fs.existsSync(process.cwd())) {
  const realCwd = fs.realpathSync(process.cwd())
  if (realCwd.toLowerCase() !== process.cwd().toLowerCase()) {
    try {
      process.chdir(realCwd)
    } catch {}
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const realDir = fs.existsSync(currentDir) ? fs.realpathSync(currentDir) : currentDir

export default defineConfig({
  root: realDir,
  plugins: [react()],
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(realDir, './src'),
    },
  },
})

