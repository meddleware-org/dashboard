# CLAUDE.md — @meddleware/dashboard

## What this app is

A Vue 3 + Vite SPA serving as the Meddleware tools hub at `sui.meddleware.co.uk`. It renders
each tool (Walrus, Access Gate, Sealed Storage) **inline** by importing the tool's view
component from its own package (e.g. `WalrusView` from `@meddleware/walrus-ui`) and wrapping it
in the dashboard shell.

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
- **SidebarItem comes from `@meddleware/ui`.** Do not create a local copy.
- **StatusWidget polls `https://status.meddleware.co.uk/api/status` every 60 s** via plain
  `fetch`. No external libraries. Three states: `ok`, `degraded`, `error`.
- **`overrides.@mysten/sui` must stay.** The Walrus packages (`walrus-ui`, `walrus-relay`,
  `walrus-client`) all pin `~2.17.0`, but `@meddleware/wallet-adapter`'s peer range
  (`>=2.17.0 <3`) otherwise lets npm hoist the latest `@mysten/sui` (e.g. 2.29). Two copies of
  the SDK produce `#private`-mismatch type errors (`Type 'X' is not assignable to type 'X'`) and
  break `vue-tsc`. The `overrides` block pins the whole tree to the single version the Walrus
  ecosystem is built against. When a tool needing a newer `@mysten/sui` is embedded (seal-ui is
  on `^2.28`), bump this override to a version that satisfies every embedded tool — or broaden
  the Walrus packages' ranges — rather than deleting it.

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
