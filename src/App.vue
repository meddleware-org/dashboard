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
const { wallets, account, connect, disconnect, connecting } = useWallet({
  requiredFeatures: ['sui:signTransaction', 'sui:signPersonalMessage'],
})

async function onConnect(): Promise<void> {
  const w = wallets.value[0]
  if (w) await connect(w)
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
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
        <span v-if="account" class="wallet-addr" :title="account.address">
          {{ shortAddr(account.address) }}
        </span>
        <button v-if="account" type="button" class="wallet-btn" @click="disconnect">
          Disconnect
        </button>
        <button
          v-else
          type="button"
          class="wallet-btn"
          :disabled="!wallets.length || connecting"
          @click="onConnect"
        >
          {{ wallets.length ? (connecting ? 'Connecting…' : 'Connect wallet') : 'No wallet' }}
        </button>
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
  /* Inline tool views can exceed the viewport — scroll the main area internally
     (the shell itself stays fixed at 100vh). */
  overflow-y: auto;
  height: 100%;
}

.brand-mark {
  color: var(--gold);
}

.wallet-addr {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--muted);
}

.wallet-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  color: var(--text);
  font-size: 0.85rem;
}

.wallet-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
