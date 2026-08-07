import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // `host: true` binds to every interface instead of localhost only, so phones
  // and tablets on the same network can reach it. Vite prints the LAN URL.
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  // Relative asset paths, so `dist/` also works when served from a subfolder
  // (GitHub Pages project sites, a folder on a NAS, opening it off a stick).
  base: './',
})
