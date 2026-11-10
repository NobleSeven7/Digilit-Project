// Vite is the tool that runs the app while developing ("npm run dev")
// and bundles it into plain files for the web ("npm run build").
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // react(): lets us write JSX. tailwindcss(): turns Tailwind classes into CSS.
  plugins: [react(), tailwindcss()],
  // './' makes all file links relative, so the built site works both on
  // GitHub Pages (which serves it from /Digilit-Project/) and anywhere else.
  base: './',
})
