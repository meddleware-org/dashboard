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
- **`overrides.@mysten/sui` (pinned `2.31.0`) must stay.** The embedded tools disagree on the
  SDK version: `@meddleware/*` packages declare `^2.30.0`, while upstream Mysten Seal
  (`@mysten/seal`) and Walrus (`@mysten/walrus`) require `^2.31.0`. Two copies of `@mysten/sui`
  in one tree produce `#private`-mismatch type errors (`Type 'X' is not assignable to type 'X'`)
  that break `vue-tsc` — the shared `@meddleware/wallet-adapter` `Executor` crosses every tool,
  so a single version is mandatory. `2.31.0` satisfies Seal/Walrus's `^2.31.0` lower-bound and is
  backward-compatible with every `@meddleware/*` `^2.30.0` range (verified). Do not delete this;
  if a future tool needs a newer minor, bump to the new minimum that satisfies every embedded tool.

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
