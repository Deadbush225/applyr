import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  esbuild: {
    // @ts-expect-error: esbuild supports 'drop' but Vite's TS types are missing it
    esbuild: {
      drop: ['console', 'debugger'],
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
