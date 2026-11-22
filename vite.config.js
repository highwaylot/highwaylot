import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vercel sets VERCEL_ENV during builds; anything but production (previews)
  // is marked noindex so it can't compete with the live site in search.
  define: {
    __HL_HOLD_INDEX__: JSON.stringify(Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== 'production'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
