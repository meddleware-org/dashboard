import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Shared design system: tokens first (defines CSS vars), then base element defaults.
import '@meddleware/design-tokens/tokens.css'
import '@meddleware/design-tokens/seasons.css'
import '@meddleware/ui/base.css'
import './styles.css'

import { useColorMode, useSeason } from '@meddleware/ui'
import App from './App.vue'
import router from './router'

// Default to dark on first load (persisted to localStorage thereafter).
// Applied before mount to avoid a light-mode flash.
useColorMode('dark')
useSeason()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
