/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig(({ mode }) => {
  const isTest = mode === 'test'
  
  return {
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: Number(process.env.PORT) || 3000,
      host: process.env.HOST || 'localhost',
    },
    preview: {
      port: Number(process.env.PORT) || 3000,
      host: process.env.HOST || 'localhost',
    },
    plugins: [
      !isTest && devtools(),
      !isTest && nitro(),
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      !isTest && tailwindcss(),
      !isTest && tanstackStart(),
      viteReact(),
    ].filter(Boolean),
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
    },
  }
})

export default config
