import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

// Every tool renders inline via the view component exported from its own package
// (@meddleware/walrus-ui, @meddleware/access-gate-ui, @meddleware/seal-ui) — no iframes. They
// share the dashboard's wallet connection through the @meddleware/wallet-adapter singleton, and
// each route is lazy so a tool's deps (incl. the Walrus wasm) load only on navigation.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Home },
    {
      path: '/walrus',
      component: () => import('@meddleware/walrus-ui').then((m) => m.WalrusView),
    },
    {
      path: '/access-gate',
      component: () => import('@meddleware/access-gate-ui').then((m) => m.AccessGateView),
    },
    {
      path: '/sealed-storage',
      component: () => import('@meddleware/seal-ui').then((m) => m.SealView),
    },
  ],
})

export default router
