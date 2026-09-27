<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, RouterView, RouterLink } from 'vue-router'
import {
  AppHeader, AppSidebar, AppFooter,
  ColorModeControl, SidebarItem, StatusWidget, CopyableAddress, ExplorerLink, CopyrightLine,
  suiExplorerUrl, useColorMode,
} from '@meddleware/ui'
import { useWallet, useNetwork } from '@meddleware/wallet-adapter'
import NetworkSelector from './components/NetworkSelector.vue'
import ChainSelector from './components/ChainSelector.vue'

const { mode } = useColorMode('dark')
const route = useRoute()
const router = useRouter()
const { network } = useNetwork()

// The sidebar has two modes. Top-level shows the organisation sections (Treasury, Blockchain).
// Entering the Blockchain section swaps the sidebar to a chain selector with an up-one-level
// control that returns to the top level without leaving the page.
type SidebarView = 'top' | 'blockchain'
// Derived from the route below (immediate watcher) so a direct load / reload of /blockchain
// shows the chain selector, not the top-level menu.
const sidebarView = ref<SidebarView>('top')
const selectedChain = ref('sui')

const isTreasury = computed(() => route.path === '/')
const isBlockchain = computed(() => route.path === '/blockchain')

function goTreasury(navigate?: () => void): void {
  sidebarView.value = 'top'
  if (navigate) navigate()
  else router.push('/')
}

function enterBlockchain(): void {
  // No-op navigation if already on /blockchain (vue-router won't reload the same route);
  // either way the sidebar switches to the chain selector.
  sidebarView.value = 'blockchain'
  if (route.path !== '/blockchain') router.push('/blockchain')
}

function upOneLevel(): void {
  // Return the sidebar to the top level without navigating away from the current page.
  sidebarView.value = 'top'
}

// Derive the sidebar mode from the route so it's correct on direct load / reload / redirect /
// back-forward — /blockchain always opens the chain selector. `upOneLevel()` sets 'top' without a
// route change, so this watcher (which fires only on path changes) leaves that transient override
// intact until the next navigation.
watch(
  () => route.path,
  (p) => {
    sidebarView.value = p === '/blockchain' ? 'blockchain' : 'top'
  },
  { immediate: true },
)

// The dashboard hosts the single shared wallet connection for every inline tool view. It
// requests the superset of features the tools need so the connect control only offers wallets
// capable of every operation; individual tools still feature-guard at call time.
const { account, disconnect } = useWallet({
  requiredFeatures: ['sui:signTransaction', 'sui:signPersonalMessage'],
})

const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/'
const DEV_URL  = import.meta.env.VITE_DEV_URL  || 'https://dev.meddleware.co.uk/'

// SuiVision has no localnet explorer, so only build a link for public networks; otherwise the
// address is shown copy-only.
const accountExplorerHref = computed(() =>
  account.value && network.value !== 'localnet'
    ? suiExplorerUrl('account', account.value.address, network.value as 'testnet' | 'mainnet' | 'devnet')
    : null,
)
</script>

<template>
  <div class="app-shell">
    <AppHeader class="app-shell__header" variant="dark">
      <template #brand>
        <RouterLink to="/" class="brand-link" @click="goTreasury()">
          <span class="brand-mark" aria-hidden="true">◆</span>
          <span>Meddleware</span>
        </RouterLink>
      </template>
      <template #actions>
        <ColorModeControl v-model="mode" />
      </template>
    </AppHeader>

    <AppSidebar class="app-shell__sidebar" variant="dark">
      <!-- Top level: organisation sections -->
      <template v-if="sidebarView === 'top'">
        <router-link to="/" custom v-slot="{ navigate }">
          <SidebarItem label="Treasury" icon="🏦" :active="isTreasury" @click="goTreasury(navigate)" />
        </router-link>
        <SidebarItem label="Blockchain" icon="⛓" :active="isBlockchain" @click="enterBlockchain" />
      </template>

      <!-- Blockchain section: chain selector + up-one-level -->
      <template v-else>
        <button type="button" class="sidebar-up" @click="upOneLevel">
          <span aria-hidden="true">←</span> Back
        </button>
        <ChainSelector v-model="selectedChain" />
      </template>

      <template #body>
        <NetworkSelector v-if="account" />
      </template>

      <!-- Sidebar foot holds only the wallet control (contextual). Copyright, docs links, and
           status now live in the shell footer to free vertical space as the sidebar grows. -->
      <template #foot>
        <div v-if="account" class="wallet-connected">
          <CopyableAddress :address="account.address">
            <ExplorerLink
              v-if="accountExplorerHref"
              :href="accountExplorerHref"
              :value="account.address"
            />
          </CopyableAddress>
          <button type="button" class="wallet-disconnect" @click="disconnect">Disconnect</button>
        </div>
        <div v-else class="wallet-disconnected">
          <span class="wallet-status-dot" aria-hidden="true"></span>
          <span class="wallet-status-label">No wallet connected</span>
        </div>
      </template>
    </AppSidebar>

    <main class="app-shell__main">
      <RouterView />
    </main>

    <AppFooter class="app-shell__footer" variant="dark" :docs-url="DOCS_URL" :dev-url="DEV_URL">
      <template #start>
        <CopyrightLine symbolVariant="kopimi" organisation-name="Meddleware" rightsStatement="jam" />
      </template>
      <StatusWidget class="footer-status" />
    </AppFooter>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--mw-sidebar-width, 240px) 1fr;
  grid-template-rows: var(--mw-header-height, 56px) 1fr auto;
  height: 100dvh;
  overflow: hidden;
}

.app-shell__header {
  grid-column: 1 / -1;
}

.app-shell__footer {
  grid-column: 1 / -1;
}
.footer-status {
  font-size: var(--font-size-sm);
}

.app-shell__sidebar {
  min-height: 0;
  overflow: hidden;
}

.app-shell__main {
  overflow-y: auto;
  min-height: 0;
}

@media (max-width: 720px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: var(--mw-header-height, 56px) 1fr auto;
  }
  .app-shell__sidebar {
    display: none;
  }
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  color: var(--accent);
}

/* ── Up-one-level control ──────────────────────────────── */
.sidebar-up {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  /* Left padding matches SidebarItem so "← Back" aligns with the items below. */
  padding: 0.2rem var(--space-sm);
  margin-bottom: 0.35rem;
  color: var(--muted);
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 0;
}
.sidebar-up:hover {
  color: var(--text);
}
.sidebar-up:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

/* ── Sidebar foot (wallet only) ────────────────────────── */
.wallet-connected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.wallet-disconnect {
  background: none;
  border: none;
  padding: 0;
  color: var(--muted);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.wallet-disconnect:hover {
  color: var(--text);
}

.wallet-disconnected {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.5rem;
}

.wallet-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted, #666);
  flex-shrink: 0;
}

.wallet-status-label {
  font-size: 0.8rem;
  color: var(--muted);
}
</style>
