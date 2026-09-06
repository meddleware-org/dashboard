import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import ToolPage from '../views/ToolPage.vue'

// Walrus renders inline via the component exported from @meddleware/walrus-ui (no iframe).
// It shares the dashboard's wallet connection through the @meddleware/wallet-adapter singleton.
// Access Gate and Sealed Storage remain on the interim iframe path until their phases land.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Home },
    {
      path: '/walrus',
      component: () => import('@meddleware/walrus-ui').then((m) => m.WalrusView),
    },
    { path: '/access-gate', component: ToolPage, props: { src: 'https://sui-access-gate.meddleware.co.uk/?embedded=1', title: 'Access Gate' } },
    { path: '/sealed-storage', component: ToolPage, props: { src: 'https://sui-seal.meddleware.co.uk/?embedded=1', title: 'Sealed Storage' } },
  ],
})

export default router
