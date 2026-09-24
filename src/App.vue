<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView, RouterLink } from 'vue-router'
import {
  AppHeader, AppSidebar,
  ColorModeControl, SidebarItem, SidebarGroup, StatusWidget, CopyableAddress, ExplorerLink, CopyrightLine,
  suiExplorerUrl, useColorMode,
} from '@meddleware/ui'
import { useWallet, useNetwork } from '@meddleware/wallet-adapter'
import NetworkSelector from './components/NetworkSelector.vue'

const { mode } = useColorMode('dark')
const route = useRoute()
const { network } = useNetwork()

const isDao = computed(() => route.path === '/')
const isWalrus = computed(() => route.path === '/walrus')
const isAccessGate = computed(() => route.path === '/access-gate')
const isSealedStorage = computed(() => route.path === '/sealed-storage')
const isTokenDeployer = computed(() => route.path === '/token-deployer')

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
        <RouterLink to="/" class="brand-link">
          <span class="brand-mark" aria-hidden="true">◆</span>
          <span>Meddleware</span>
        </RouterLink>
      </template>
      <template #actions>
        <ColorModeControl v-model="mode" />
      </template>
    </AppHeader>

    <AppSidebar class="app-shell__sidebar" variant="dark">
      <SidebarGroup label="Blockchain" :level="1">
        <SidebarGroup label="Sui" :level="2">
          <router-link to="/" custom v-slot="{ navigate }">
            <SidebarItem label="DAO" icon="🏛" :active="isDao" @click="navigate" />
          </router-link>
          <router-link to="/walrus" custom v-slot="{ navigate }">
            <SidebarItem label="Walrus Storage" icon="🗄" :active="isWalrus" @click="navigate" />
          </router-link>
          <router-link to="/sealed-storage" custom v-slot="{ navigate }">
            <SidebarItem label="Sealed Storage" icon="🔒" :active="isSealedStorage" @click="navigate" />
          </router-link>
          <router-link to="/access-gate" custom v-slot="{ navigate }">
            <SidebarItem label="Access Gate" icon="🔐" :active="isAccessGate" @click="navigate" />
          </router-link>
          <router-link to="/token-deployer" custom v-slot="{ navigate }">
            <SidebarItem label="Token Deployer" icon="🪙" :active="isTokenDeployer" @click="navigate" />
          </router-link>
        </SidebarGroup>
      </SidebarGroup>

      <template #body>
        <NetworkSelector v-if="account" />
      </template>

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
        <hr class="sidebar-divider" aria-hidden="true" />
        <StatusWidget class="sidebar-status" />
        <div class="sidebar-copyright">
          <CopyrightLine symbolVariant="kopimi" organisation-name="Meddleware" rightsStatement="jam" />
          <span class="sidebar-docs-links">
            <a :href="DOCS_URL" target="_blank" rel="noopener noreferrer" class="sidebar-docs-link">Documentation</a>
            <a :href="DEV_URL" target="_blank" rel="noopener noreferrer" class="sidebar-docs-link">Developer docs</a>
          </span>
        </div>
      </template>
    </AppSidebar>

    <main class="app-shell__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--mw-sidebar-width, 240px) 1fr;
  grid-template-rows: var(--mw-header-height, 56px) 1fr;
  height: 100dvh;
  overflow: hidden;
}

.app-shell__header {
  grid-column: 1 / -1;
}

.app-shell__sidebar {
  min-height: 0;
  overflow: hidden;
}

.app-shell__main {
  overflow-y: auto;
  min-height: 0;
  padding: 6px;
}

@media (max-width: 720px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: var(--mw-header-height, 56px) 1fr;
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

/* ── Sidebar foot ──────────────────────────────────────── */
.sidebar-divider {
  border: none;
  border-top: 1px solid var(--border, #333);
  margin: 0.5rem 0;
}

.sidebar-status {
  margin-bottom: 0.25rem;
}

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

.sidebar-copyright {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--muted);
  opacity: 0.6;
  text-align: center;
}

.sidebar-docs-links {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-docs-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
