import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// @meddleware/* resolve from node_modules (published packages — no monorepo aliases).
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // The Walrus wasm client is dynamically imported inside the inline WalrusView upload flow;
    // keep it out of the eager dep-optimization graph so it stays a lazy chunk.
    exclude: ['@mysten/walrus', '@mysten/walrus-wasm'],
  },
})
