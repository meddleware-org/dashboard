<script setup lang="ts">
// Network selector for the dashboard sidebar. Reads and writes the shared useNetwork()
// singleton so every embedded tool view reacts to the chosen network immediately.
import { ref, watch, onMounted } from 'vue'
import { useNetwork } from '@meddleware/wallet-adapter'
import type { MwNetwork } from '@meddleware/wallet-adapter'

const { network, localnetRpc, setNetwork, setLocalnetRpc } = useNetwork()

const localnetInput = ref(localnetRpc.value)

// Sync input when singleton changes externally (e.g. another tab via storage event).
watch(localnetRpc, (v) => { localnetInput.value = v })

function onNetworkChange(e: Event): void {
  setNetwork((e.target as HTMLSelectElement).value as MwNetwork)
}

function commitLocalnetUrl(): void {
  const url = localnetInput.value.trim()
  if (url) setLocalnetRpc(url)
}

onMounted(() => {
  if (network.value === 'mainnet') setNetwork('testnet')
})
</script>

<template>
  <div class="ns-root">
    <label class="ns-label" for="ns-select">Network</label>
    <select id="ns-select" class="ns-select" :value="network" @change="onNetworkChange">
      <option value="testnet">Testnet</option>
      <option value="mainnet" disabled title="Coming soon">Mainnet</option>
      <option value="localnet">Localnet</option>
    </select>

    <template v-if="network === 'localnet'">
      <label class="ns-label ns-label--url" for="ns-localnet-url">RPC URL</label>
      <input
        id="ns-localnet-url"
        v-model="localnetInput"
        type="url"
        class="ns-input"
        placeholder="http://127.0.0.1:9000"
        @blur="commitLocalnetUrl"
        @keydown.enter="commitLocalnetUrl"
      />
    </template>
  </div>
</template>

<style scoped>
.ns-root {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border, #333);
  border-bottom: 1px solid var(--border, #333);
}

.ns-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted, #888);
}

.ns-label--url {
  margin-top: 0.25rem;
}

.ns-select {
  appearance: none;
  background: var(--surface, transparent)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")
    no-repeat right 0.6rem center;
  border: 1px solid var(--border, #444);
  border-radius: 6px;
  color: var(--text, #f0f0f0);
  font-size: 0.85rem;
  padding: 0.35rem 1.75rem 0.35rem 0.6rem;
  cursor: pointer;
  width: 100%;
}

.ns-select:focus {
  outline: 2px solid var(--accent, #6366f1);
  outline-offset: 1px;
}

.ns-input {
  background: var(--surface, transparent);
  border: 1px solid var(--border, #444);
  border-radius: 6px;
  color: var(--text, #f0f0f0);
  font-size: 0.8rem;
  font-family: monospace;
  padding: 0.35rem 0.6rem;
  width: 100%;
  box-sizing: border-box;
}

.ns-input:focus {
  outline: 2px solid var(--accent, #6366f1);
  outline-offset: 1px;
}
</style>
