# AGENTS.md — @meddleware/dashboard-ui

See [CLAUDE.md](CLAUDE.md) for architecture and scope constraints.

## Quick commands

```bash
npm install          # install deps (requires @meddleware/ui ^0.1.3 on npmjs or npm link)
npm run dev          # dev server at http://localhost:5173
npm run type-check   # TypeScript check only
npm test             # unit tests (vitest)
npm run test:e2e     # browser smoke test of the built app (Playwright)
npm run build        # type-check + vite build → dist/
```

## Adding a feature page

1. Create `src/views/MyFeaturePage.vue` with Overview / Launch / White-label sections.
2. Add a route in `src/router/index.ts`.
3. Add a `SidebarItem` in `src/App.vue`.
4. Keep the page thin — no chain calls, no wallet, no financial logic.
