import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    // Mirrors the /api rewrite Vercel applies in production (which preserves
    // the full /api/... path), so the frontend can always call the API at a
    // relative /api path in both environments.
    proxy: {
      '/api': 'http://localhost:4444',
    },
  },
})
