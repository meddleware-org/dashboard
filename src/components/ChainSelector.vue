<script setup lang="ts">
// Modular blockchain selector shown in the sidebar while the Blockchain section is open.
// Data-driven so new chains are a one-line addition; defaults to Sui (the only live chain).
import { SidebarItem } from '@meddleware/ui'

interface Chain {
  id: string
  label: string
  icon: string
}

const CHAINS: Chain[] = [
  { id: 'sui', label: 'Sui', icon: '🌊' },
  // Future chains slot in here — the Blockchain view swaps tool sets by the selected id.
]

const model = defineModel<string>({ default: 'sui' })
</script>

<template>
  <div class="chain-selector">
    <div class="chain-selector__title">Select chain</div>
    <SidebarItem
      v-for="c in CHAINS"
      :key="c.id"
      :label="c.label"
      :icon="c.icon"
      :active="model === c.id"
      @click="model = c.id"
    />
  </div>
</template>

<style scoped>
.chain-selector__title {
  font-size: 0.7rem;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.75;
  margin: 0 0 var(--space-2xs) var(--space-2xs);
}
</style>
