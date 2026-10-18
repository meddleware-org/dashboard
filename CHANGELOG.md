# Changelog

All notable changes to `@meddleware/dashboard` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/). Before 0.2.0, breaking changes ship as patch releases.
Releases before 0.1.85 are recorded in the git history only.

## [0.1.85] - 2026-10-18

### Changed

- Embeds the 2026-10-18 builds of every tool: `@meddleware/walrus-ui` ^0.1.58 and
  `@meddleware/token-deployer-ui` ^0.0.36 (both adopt `@meddleware/walrus-relay` 0.1.31: the access-gate
  price is read from the chain and shown, with the payees and network, before the wallet opens),
  `@meddleware/access-gate-ui` ^0.1.37, `@meddleware/seal-ui` ^0.0.38, `@meddleware/treasury-ui` ^0.0.18,
  `@meddleware/dao-ui` ^0.1.34 (retained, not mounted) and `@meddleware/design-tokens` ^0.1.10; their
  clients resolve to `walrus-client` 0.0.28, `access-gate-client` 0.0.9, `seal-client` 0.0.20 and
  `sui-token-client` 0.0.11. `@mysten/sui` ^2.36.0, `vue` ^3.5.44, `vue-router` ^5.4.0 and merged tooling
  updates. One copy of `@mysten/sui` and of each `@meddleware/*` package (`npm ls`).
- Image base: `static-server` 0.1.8 (`sha256:e32cf42b…4000`).
- `npm-publish.yml` `verify` calls `node-ci.yml` (audit gate, signatures, type-check, all linters, tests,
  build, licences, browser smoke test), as the image release does (audit F15).
- The four image builds pass the same build arguments (the registry-mirror builds lacked
  `VITE_WALRUS_RELAY_MAINNET`).
- `.env.example` lists every build input; `.env.production` names the current package;
  `CLAUDE.md` and `SECURITY.md` are current.

### Removed

- `VITE_ACCESS_GATE_PRICE_MIST_TESTNET` (Dockerfile argument, release workflow, docs): walrus-ui and
  token-deployer-ui no longer read it. A build that still sets it ignores it. The repository variable of the
  same name can be deleted.

### Added

- Unit tests (`npm test`, vitest): route table and tool imports, the network selector's mainnet guard (I7),
  design-token use (no `--warning` text colour, no undefined custom property), the build-input inventory,
  and the inline-script guard.
- Browser smoke test (`npm run test:e2e`, Playwright): `/`, every tool tab of `/blockchain` and the legacy
  redirects mount in Chromium with no uncaught error and no network.
- CI builds the image (not pushed) and probes the running container with `scripts/smoke.sh`: non-root user,
  read-only root, the in-image health check, `/` and the SPA fallback with the security headers and the CSP
  (no `'unsafe-inline'` for scripts), immutable `/assets/`, `/THIRD_PARTY_LICENSES`, dot-files refused, POST
  405 (audit F14). A Trivy filesystem scan (vulnerabilities, Dockerfile misconfiguration, secrets; fixable
  CRITICAL/HIGH fail) runs beside it.
- `tests/workflows.test.ts` pins the release gate: both release workflows call `node-ci.yml`, CI runs every
  check above, third-party actions are pinned by SHA, the Dockerfile runs `check:dist` and sets the user.
- `npm run check:dist` (also run by the Dockerfile) fails the build when a built page has an inline script or event-handler attribute
  that the CSP would refuse (audit F13).
- `CHANGELOG.md` (listed in `files` but absent before).

### Fixed

- CI verifies registry signatures with npm 11.20.0: the npm bundled with Node 24.13 (11.6.2) reports
  `EMISSINGSIGNATUREKEY` for the attestations of recently published packages.
