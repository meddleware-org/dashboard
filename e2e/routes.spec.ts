// The built dashboard mounts every route and every embedded tool (audit C.1). A tool whose package or
// config contract broke (for example a dependency that throws on import or on mount) shows up here as an
// uncaught page error or a missing tool body. Requests that leave localhost are refused, so the run needs
// no network; the failed fetches are expected and are not errors of the page itself.
import { test, expect, type Page } from '@playwright/test'

const TOOLS = [
  { tab: 'Walrus Storage', body: /Upload and manage blobs on Walrus/ },
  { tab: 'Sealed Storage', body: /Client-side encrypted, access-gated storage/ },
  { tab: 'Access Gate', body: /Create and manage on-chain access gates/ },
  { tab: 'Token Issuance', body: /Deploy your own Sui coin/ },
] as const

async function watch(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route(/^https?:\/\/(?!(localhost|127\.0\.0\.1)[:/])/, (route) => route.abort())
  return errors
}

test('the Treasury view mounts at /', async ({ page }) => {
  const errors = await watch(page)
  await page.goto('/')
  await expect(page.getByText('Meddleware Treasury')).toBeVisible()
  await expect(page.getByText('No wallet connected')).toBeVisible()
  expect(errors).toEqual([])
})

test('every Blockchain tool mounts as a tab at /blockchain', async ({ page }) => {
  const errors = await watch(page)
  await page.goto('/blockchain')
  const tabs = page.getByRole('tab', { name: /^(Walrus Storage|Sealed Storage|Access Gate|Token Issuance)$/ })
  await expect(tabs).toHaveCount(TOOLS.length)
  for (const { tab, body } of TOOLS) {
    await page.getByRole('tab', { name: tab, exact: true }).click()
    await expect(page.locator('.blockchain-view__content')).toContainText(body)
  }
  expect(errors).toEqual([])
})

test('the retired per-tool paths land on /blockchain', async ({ page }) => {
  const errors = await watch(page)
  for (const path of ['/walrus', '/walrus-storage', '/sealed-storage', '/access-gate', '/token-deployer', '/token-issuance']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/blockchain$/)
  }
  expect(errors).toEqual([])
})
