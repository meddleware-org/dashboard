import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Unit tests for the shell's contracts (routes, design-token use, build inputs, the inline-script check).
// The browser-level check that every tool route mounts is the Playwright spec in e2e/.
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue', '@vue/test-utils'] },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**'],
  },
})
