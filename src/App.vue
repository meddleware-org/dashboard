<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import {
  AppHeader, AppSidebar,
  ColorModeControl, SidebarItem, StatusWidget,
  useColorMode,
} from '@meddleware/ui'
import { useWallet } from '@meddleware/wallet-adapter'

const { mode, set } = useColorMode('dark')
const route = useRoute()

const isWalrus = computed(() => route.path === '/walrus')
const isAccessGate = computed(() => route.path === '/access-gate')
const isSealedStorage = computed(() => route.path === '/sealed-storage')

// The dashboard hosts the single shared wallet connection for every inline tool view. It
// requests the superset of features the tools need so the connect control only offers wallets
// capable of every operation; individual tools still feature-guard at call time.
const { account, disconnect } = useWallet({
  requiredFeatures: ['sui:signTransaction', 'sui:signPersonalMessage'],
})

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
</script>

<template>
  <div class="app-shell">
    <AppHeader class="app-shell__header" variant="dark">
      <template #brand>
        <span class="brand-mark" aria-hidden="true">◆</span>
        <span>Meddleware</span>
      </template>
      <template #actions>
        <StatusWidget />
        <ColorModeControl :model-value="mode" @update:model-value="set" />
      </template>
    </AppHeader>

    <AppSidebar class="app-shell__sidebar" variant="dark">
      <nav aria-label="Tools">
        <router-link to="/walrus" custom v-slot="{ navigate }">
          <SidebarItem label="Walrus" icon="🗄" :active="isWalrus" @click="navigate" />
        </router-link>
        <router-link to="/access-gate" custom v-slot="{ navigate }">
          <SidebarItem label="Access Gate" icon="🔐" :active="isAccessGate" @click="navigate" />
        </router-link>
        <router-link to="/sealed-storage" custom v-slot="{ navigate }">
          <SidebarItem label="Sealed Storage" icon="🔒" :active="isSealedStorage" @click="navigate" />
        </router-link>
      </nav>

      <template #foot>
        <div v-if="account" class="wallet-connected">
          <span class="wallet-addr" :title="account.address">{{ shortAddr(account.address) }}</span>
          <button type="button" class="wallet-disconnect" @click="disconnect">Disconnect</button>
        </div>
        <div v-else class="wallet-disconnected">
          <span class="wallet-status-dot" aria-hidden="true"></span>
          <span class="wallet-status-label">Not connected</span>
        </div>
        <p class="sidebar-copyright">© {{ new Date().getFullYear() }} Meddleware</p>
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
  height: 100vh;
  overflow: hidden;
}

.app-shell__header {
  grid-column: 1 / -1;
}

.app-shell__sidebar {
  height: 100%;
  overflow-y: auto;
}

.app-shell__main {
  overflow-y: auto;
  height: 100%;
}

.brand-mark {
  color: var(--gold);
}

/* ── Sidebar wallet foot ───────────────────────────────── */
.wallet-connected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.wallet-addr {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  margin-bottom: 0.75rem;
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
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
  opacity: 0.6;
}
</style>
