# CLAUDE.md — @meddleware/dashboard

## What this app is

A Vue 3 + Vite SPA serving as the chain-agnostic Meddleware tools hub at
`dash.meddleware.co.uk`. It renders each tool inline by importing the tool's exported view
component from its own package (e.g. `WalrusView` from `@meddleware/walrus-ui`) and wrapping it
in the dashboard shell. The sidebar organises tools under a two-tier hierarchy
(Blockchain → chain → tool) so adding tools for new chains requires only a new
`SidebarGroup level="2"` block — no structural changes to the existing navigation.

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
- **Sidebar navigation components come from `@meddleware/ui`.** Use `SidebarItem` for
  individual entries and `SidebarGroup` for section headers. Do not create local copies.
  The sidebar is structured as `<SidebarGroup level="1">` (chain family, e.g. "Blockchain")
  containing `<SidebarGroup level="2">` (specific chain, e.g. "Sui") containing
  `<SidebarItem>` entries. Add a new `level="2"` group when onboarding a new chain.
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
