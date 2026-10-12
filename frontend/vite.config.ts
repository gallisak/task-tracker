import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function readApiPort(): string {
  if (process.env.PORT) {
    return process.env.PORT
  }
  try {
    const rootEnv = readFileSync(
      path.resolve(import.meta.dirname, '../.env'),
      'utf8',
    )
    return parseEnv(rootEnv).PORT ?? '3000'
  } catch {
    return '3000'
  }
}

const apiTarget = `http://localhost:${readApiPort()}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    proxy: {
      '/api': apiTarget,
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
})
