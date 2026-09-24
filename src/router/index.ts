import { createRouter, createWebHistory } from 'vue-router'

// Every tool renders inline via the view component exported from its own package — no iframes.
// They share the dashboard's wallet connection through the @meddleware/wallet-adapter singleton,
// and each route is lazy so a tool's deps (incl. the Walrus wasm) load only on navigation.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@meddleware/dao-ui').then((m) => m.DaoView),
    },
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
    {
      path: '/token-deployer',
      component: () => import('@meddleware/token-deployer-sui').then((m) => m.TokenDeployerView),
    },
  ],
})

export default router
