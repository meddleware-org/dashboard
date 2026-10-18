// The route table is the dashboard's contract with the embedded tools: Treasury at `/`, every Sui tool as
// a tab of `/blockchain` (never its own route, never an iframe), the old per-tool paths redirecting there,
// and no DAO surface while governance is retired. Mounting is covered by the browser spec in e2e/.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import router from '../src/router'

const routes = router.getRoutes()
const byPath = (path: string) => routes.find((r) => r.path === path)

describe('router', () => {
  it('serves Treasury at / and the tool console at /blockchain', () => {
    expect(byPath('/')?.name).toBe('treasury')
    expect(byPath('/blockchain')?.name).toBe('blockchain')
  })

  it('redirects the old per-tool paths to /blockchain', () => {
    for (const path of ['/walrus', '/sealed-storage', '/access-gate', '/token-deployer']) {
      expect(byPath(path)?.redirect, path).toBe('/blockchain')
    }
  })

  it('has no DAO route while the DAO view is retired', () => {
    expect(routes.some((r) => r.path.startsWith('/dao'))).toBe(false)
  })

  it('lazy-loads the route components (a tool loads only on navigation)', () => {
    for (const r of routes.filter((x) => !x.redirect)) {
      const comp = r.components?.default
      expect(typeof comp, r.path).toBe('function')
    }
  })

  it('resolves every other path to no route', () => {
    expect(router.resolve('/no-such-page').matched).toHaveLength(0)
  })
})

describe('tool mounting', () => {
  const view = readFileSync(join(import.meta.dirname, '..', 'src', 'views', 'BlockchainView.vue'), 'utf8')

  it('imports each tool view from its own package, lazily', () => {
    for (const [pkg, exported] of [
      ['@meddleware/walrus-ui', 'WalrusView'],
      ['@meddleware/seal-ui', 'SealView'],
      ['@meddleware/access-gate-ui', 'AccessGateView'],
      ['@meddleware/token-deployer-ui', 'TokenDeployerView'],
    ]) {
      expect(view).toContain(`import('${pkg}').then((m) => m.${exported})`)
    }
  })

  it('never embeds a tool in an iframe', () => {
    const src = [view, readFileSync(join(import.meta.dirname, '..', 'src', 'App.vue'), 'utf8')].join('\n')
    expect(src).not.toMatch(/<iframe/i)
  })
})
