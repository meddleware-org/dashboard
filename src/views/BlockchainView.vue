<script setup lang="ts">
// Blockchain tools hub — a qt-style tabbed console over one chain's tools. Today the only
// chain is Sui; the component takes a `chain` prop so a future multi-chain sidebar selector can
// switch tool sets without a rewrite. Each tool view is lazy-loaded (its deps, incl. the Walrus
// wasm, load only when its tab is first opened) and kept alive so switching tabs preserves state.
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { AppTabNav, UiTabPanel, type AppTab } from '@meddleware/ui'

const props = withDefaults(defineProps<{ chain?: string }>(), { chain: 'sui' })

interface Tool extends AppTab {
  comp: ReturnType<typeof defineAsyncComponent>
}

// Per-chain tool sets. Add a new key when onboarding a chain.
const TOOLSETS: Record<string, Tool[]> = {
  sui: [
    { id: 'walrus', label: 'Walrus Storage', comp: defineAsyncComponent(() => import('@meddleware/walrus-ui').then((m) => m.WalrusView)) },
    { id: 'sealed', label: 'Sealed Storage', comp: defineAsyncComponent(() => import('@meddleware/seal-ui').then((m) => m.SealView)) },
    { id: 'access-gate', label: 'Access Gate', comp: defineAsyncComponent(() => import('@meddleware/access-gate-ui').then((m) => m.AccessGateView)) },
    { id: 'token-deployer', label: 'Token Deployer', comp: defineAsyncComponent(() => import('@meddleware/token-deployer-ui').then((m) => m.TokenDeployerView)) },
  ],
}

const tools = computed<Tool[]>(() => TOOLSETS[props.chain] ?? [])
const tabs = computed<AppTab[]>(() => tools.value.map(({ id, label }) => ({ id, label })))
const active = ref(tools.value[0]?.id ?? '')

// Reset to the first tool when the chain changes.
watch(
  () => props.chain,
  () => {
    active.value = tools.value[0]?.id ?? ''
  },
)

const activeComp = computed(() => tools.value.find((t) => t.id === active.value)?.comp)
</script>

<template>
  <!-- Fills the shell's main area exactly, so main never scrolls on this page: the tool tabs stay
       in view and only the tool panel scrolls (its scrollbar at the right edge of the area). -->
  <div class="blockchain-view">
    <AppTabNav
      v-model="active"
      :tabs="tabs"
      id-prefix="blockchain"
      variant="raised"
      size="lg"
      class="blockchain-view__tabs"
      aria-label="Sui tools"
    />

    <UiTabPanel id-prefix="blockchain" :tab="active" class="blockchain-view__content">
      <KeepAlive>
        <component :is="activeComp" :key="active" />
      </KeepAlive>
    </UiTabPanel>
  </div>
</template>

<style scoped>
.blockchain-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.blockchain-view__tabs {
  flex: none;
}

/* The only scroll container on this page. It spans the full width of the main area (so its
   scrollbar sits at the area's edge, not beside the content column); the content column is centred
   and capped at --mw-tool-content-max by inline padding that grows with the spare width. The
   panel is focusable (UiTabPanel), so keyboard users can scroll it. */
.blockchain-view__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  /* Consecutive Fibonacci steps of the spacing scale (13 : 8 : 5 units), so top : bottom and
     bottom : sides are each ≈ φ — generous air under the tabs, tighter at the foot and sides. */
  padding-block: var(--space-lg) var(--space-md);
  padding-inline: max(var(--space-sm), calc((100% - var(--mw-tool-content-max)) / 2 + var(--space-sm)));
}

/* This page only: the tool tabs sit flush — no inset around the strip and no gaps between tabs.
   Overrides AppTabNav's shared raised/lg spacing for this instance; other tab strips keep theirs.
   The modifier classes match the component's own selector so this wins regardless of CSS order. */
.blockchain-view__tabs.mw-tab-nav--raised.mw-tab-nav--lg {
  gap: 0;
  padding: 0;
}
</style>
