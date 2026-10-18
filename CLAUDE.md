# CLAUDE.md — @meddleware/dashboard

## What this app is

A Vue 3 + Vite SPA serving as the organisation-level Meddleware hub at
`dash.meddleware.co.uk`. It renders each tool/view inline by importing the exported component
from its own package (e.g. `TreasuryView` from `@meddleware/treasury-ui`, `WalrusView` from
`@meddleware/walrus-ui`) and wrapping it in the dashboard shell.

### Information architecture (two org sections + a drill-down)

The sidebar has two **modes**:

- **Top level** — organisation sections. Currently **Treasury** (the default route `/`, embedding
  `TreasuryView`) and **Blockchain**. Room for more general-org sections later.
- **Blockchain mode** — entered by clicking the *Blockchain* item. The sidebar swaps to a modular
  **chain selector** (`ChainSelector`, defaults to Sui, data-driven for future chains) plus an
  **up-one-level** ("← Back") control that returns to the top level *without leaving the page*.
  The content area (`/blockchain`, `views/BlockchainView.vue`) is a **qt-style tabbed console**
  (`AppTabNav variant="raised"`) whose tabs are the Sui tools — Walrus Storage, Sealed Storage,
  Access Gate, Token Deployer — each lazy-loaded and kept alive across tab switches.

Sidebar mode is local UI state (`sidebarView: 'top' | 'blockchain'`), not a route: clicking
*Blockchain* while already on `/blockchain` just re-opens the selector (no reload); *up one level*
only changes the sidebar. Legacy per-tool paths (`/walrus`, …) redirect to `/blockchain`.

**DAO is temporarily retired** from the dashboard: its route is commented out in `router/index.ts`
and the `@meddleware/dao-ui` dependency is **retained** so it can be re-enabled once DAO
participation ships. Do not remove the dependency.

## Architectural invariants

- **No on-chain logic here — extend the domain client.** `suiBoundary()` from
  `@meddleware/eslint-config` (the last entry in `eslint.config.ts`) forbids, in `src/` outside
  `src/wallet.ts`: value imports of `@mysten/sui/{grpc,client,transactions}` (type-only imports are
  fine; `@mysten/sui/jsonRpc` is banned outright), building transactions and chain reads. URL
  bindings on native elements must go through `safeHref`, `safeIcon`, `suiExplorerUrl` or
  `walruscanBlobUrl`. Do not disable it — move the logic into the domain client instead.
- **Hosts the single shared wallet connection.** The dashboard mounts `useWallet()` from
  `@meddleware/wallet-adapter` (a module singleton) and surfaces one connect/disconnect control
  in the header. Every inline tool view reads that same connection — connect once, all tools see
  it. (This supersedes the earlier "no wallet" invariant, which applied when tools were external
  iframes.) The dashboard still performs no accounting and builds no transactions itself — the
  tool views own their signing flows.
- **Tools render inline, not via iframe.** Import each tool's exported view component and render
  it in a route. Do not reintroduce cross-origin iframes (`X-Frame-Options` blocks them and
  wallet extensions don't inject into them). Tool routes are lazy (`() => import(...)`) so each
  tool's deps (incl. the Walrus wasm) load only on navigation.
- **No accounting logic.** Financial truth lives on-chain; this app derives none of it.
- **Shell slots are unwrapped.** `AppHeader`/`AppSidebar`/`AppFooter` render slot content directly,
  so the shell styles its own pieces (e.g. `.sidebar-foot`, `.sidebar-body` in `App.vue`).
- **Sidebar navigation components come from `@meddleware/ui`.** Use `SidebarItem` for entries
  (and `SidebarGroup` if a mode ever needs grouped headers). Do not create local copies. The
  sidebar renders one of two modes (see IA above): top-level org sections, or the Blockchain
  chain-selector. Onboarding a new chain = a new entry in `ChainSelector`'s `CHAINS` array plus a
  new tool set in `BlockchainView`'s `TOOLSETS` — no shell changes.
- **qt-style tabbed tools.** The Blockchain view uses the shared `AppTabNav variant="raised"`
  (WAI-ARIA tabs) with a `UiTabPanel` around the lazy, kept-alive tool views. Do not give each tool its own route;
  they are tabs within `/blockchain`.
- **StatusWidget polls `https://status.meddleware.co.uk/api/status` every 60 s** via plain
  `fetch`. No external libraries. Three states: `ok`, `degraded`, `error`.
- **One `@mysten/sui` in the tree — a direct dependency (`^2.36.0`), no `overrides`.** Two copies of
  `@mysten/sui` produce `#private`-mismatch type errors (`Type 'X' is not assignable to type 'X'`) that
  break `vue-tsc`, because the shared `@meddleware/wallet-adapter` `Executor` crosses every tool. The
  embedded `@meddleware/*` tools and SDKs declare the same caret range, so npm dedupes to one copy and an
  override is unnecessary. When bumping, keep the dashboard's range no lower than what every embedded
  tool declares, then confirm `npm ls @mysten/sui` shows a single version (all others `deduped`). Re-add
  an `overrides` entry only if the embedded ranges stop overlapping.
- **One `@meddleware/wallet-adapter` in the tree.** It is a module singleton: two copies are two
  wallet connections. This app holds the one real dependency; every embedded tool declares it as a
  peerDependency (`>=0.0.12 <0.2.0`). After a bump, confirm a single copy:
  `find node_modules -path '*@meddleware/wallet-adapter/package.json'` lists exactly one.

## Tests and checks

`npm test` (vitest, jsdom) pins the shell's contracts: the route table and tool imports
(`tests/router.test.ts`), the network selector's mainnet guard (`tests/network-selector.test.ts`), the
contract with design-tokens — no `--warning` text colour, no undefined custom property
(`tests/design-tokens-used.test.ts`), the build-input inventory — Dockerfile ARGs, `.env.example` and the
release build-args stay in step and no access-gate price variable exists (`tests/build-inputs.test.ts`),
and the inline-script guard (`tests/inline-scripts.test.ts`). `npm run test:e2e` (Playwright, Chromium
installed with `npx playwright install chromium`) builds the app, serves `dist` and mounts `/`, every
tool tab of `/blockchain` and the legacy redirects with all external requests refused. `npm run check:dist`
fails if a built page has an inline script (the CSP refuses it). CI (`node-ci.yml`) runs all of these, and
both release workflows call it.

The embedded tools take no props: each reads its own `VITE_*` configuration at bundle time. The relay
access-gate price is read from the chain (walrus-relay 0.1.31); there is no price variable.

## Dependency order

`@meddleware/ui ^0.1.3` must be published to npmjs before this image can be built from npm.
For local development:

```bash
cd repos/ui && npm install && npm run build
cd repos/ui && npm link
cd repos/dashboard && npm install && npm link @meddleware/ui
npm run dev
```

## Scope

This dashboard shows only the hosted product and a white-label deploy option. Developer
documentation (self-host guides, library docs, fork-your-own instructions) is intentionally
deferred to a future `dev.meddleware.co.uk` sub-domain. Do not add self-host or library
content here.
