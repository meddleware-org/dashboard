# Security Audit — `dashboard`

**Classification:** Internal security review
**Project:** `repos/dashboard` — `@meddleware/dashboard`, Vue 3 hub (`dash.meddleware.co.uk`) hosting the tool views inline: Treasury at `/`, and Walrus Storage, Sealed Storage, Access Gate and Token Deployer as tabs at `/blockchain`
**Project type:** Vue app
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08) + AUDIT_TEMPLATE_IMG.md (2026-10-08). `AUDIT_TEMPLATE_SUI_CLIENT.md` is not triggered: the shell builds no PTBs, reads no Move objects or events and verifies no signatures — `suiBoundary()` (eslint-config 0.0.2) fails CI on any such code in `src/`; the chain surface lives in the embedded tools and their clients (own audits).
**Sui SDK:** `@mysten/sui ^2.33.2` (one copy, resolves 2.35.0)   **Transport:** through the embedded tools and wallet-adapter
**Package manager / lockfile:** npm 11, committed (385 locked packages; 118 production)   **Publish model:** ships source + SPA image
**Runtime targets:** browser
**Build tool:** vite 8.3.3, @vitejs/plugin-vue 6.0.9, vue 3.5.43, vue-router 5.3, vue-tsc 3.3   **Hosting:** container image (static-server 0.1.7); no static host / `_headers`   **Embedding hosts:** none (this is the host of the tool views)
**VITE_\* inventory:** build args baked at build, testnet only, no secrets: `VITE_NETWORK` (default `testnet`), `VITE_WALRUS_RELAY_TESTNET|MAINNET`, `VITE_RPC_TESTNET|MAINNET`, `VITE_ACCESS_GATE_ID_TESTNET|MAINNET` (relay gate — read by access-gate-ui/walrus-ui), `VITE_ACCESS_GATE_SOULBOUND_TESTNET`, `VITE_ACCESS_GATE_PRICE_MIST_TESTNET`, `VITE_UPLOAD_RELAY_MAX_TIP_MIST`, `VITE_INDEXER_URL`; shell-only `VITE_DOCS_URL`, `VITE_DEV_URL`; committed in `.env.production`: `VITE_FEE_TREASURY_TESTNET|MAINNET` (token-deployer fee address, public). Repository variables set 2026-10-09: gate `0x316f1bf9…faddc` (see F16 for inventory gaps)
**Images:** `quay.io/meddleware-org/dashboard:0.1.84@sha256:e8957db3d880d593b19e0c0e32e2a858887879505e969b5bec7cd804734cb34e` (Docker Hub mirror `meddleware/dashboard`, same digest)
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.7@sha256:2e227311…2379` (Go 1.26.9)
**Runtime user:** 65534:65534 (`USER` in the Dockerfile, `runAsNonRoot` in the pod)   **Runtime FS:** read-only root, nothing writable mounted
**Deployed by:** `post-bootstrap/dashboard/overlays/default` (digest from `config/images.yaml`)
**Build args:** the `VITE_*` list above and `CSP` — public configuration, none secret
**Deployment status:** npm v0.1.84 (2026-10-09, trusted publishing); image `quay.io/meddleware-org/dashboard` serving `dash.meddleware.co.uk` at 0.1.84 (deployed 2026-10-09; live headers checked 2026-10-09; cosign signature valid, `verify-digests.sh` 16/16)
**Review date:** 2026-09-18 (first pass) · re-verified 2026-10-03 · re-verified 2026-10-09
**Reviewer:** Internal review
**Severity ceiling:** Medium — it owns the one wallet connection every embedded tool signs through, so its ceiling is the union of the tools' signing surfaces. No High or Critical in dashboard code.
**Status:** re-verified 2026-10-09 — 17 findings (2 Positive): 8 RESOLVED, 1 ADJUDICATED, 1 MITIGATED, 4 ACCEPTED-RISK, 1 DEFERRED

---

## Executive summary

A thin shell: header, sidebar (organisation sections, then a chain selector), footer, network
selector, and the router that lazy-loads each tool's exported view. It mounts the single
`@meddleware/wallet-adapter` connection that every tool shares. It builds no transactions and holds
no accounting logic; the security of the signing paths lives in the tools and their clients (own
audits). Because every embedded package runs next to that wallet, supply-chain integrity is this
repository's main concern.

All first-pass findings are resolved, positive or adjudicated. The 2026-10-03 pass found:

- **F8 (Info, RESOLVED 0.1.75)** — `pinia` was installed and registered but no store used it; an
  unused runtime dependency in the bundle next to the wallet. Removed.
- **F9 (Low, RESOLVED in CI)** — nothing verified the registry signatures or provenance of the
  installed packages; `npm audit signatures` now runs in CI and before every publish (361 packages
  verified, 142 with provenance attestations). Locking npm publishing to trusted publishing is a
  maintainer task (OQ3).

The 2026-10-09 re-verification (0.1.84, deployed) re-checked every finding against the code, the
live headers and the repository settings, and applied the container-image lens (new this pass):

- **F10 (Low, RESOLVED 0.1.84, `e7f8e9d`)** — the release now runs the full Node CI workflow, scans
  the published image with Trivy before cosign signs it, ships the lockfile in the image for SBOM
  tools and serves `/THIRD_PARTY_LICENSES`.
- **F11 (Info, RESOLVED 0.1.83, `b86e18c`)** — runtime base moved to static-server 0.1.7 (Go 1.26.9)
  and the Dockerfile sets `USER 65534:65534`.
- **F12–F16 (Low/Info, recorded)** — the CSP's `connect-src`/`img-src` allow any `https:` origin
  (ACCEPTED-RISK); no build-time inline-script check (MITIGATED by the CSP); no image config scan or
  container probe in CI, an npm publish gate narrower than CI, and an incomplete `VITE_*` inventory in
  `.env.example` (ACCEPTED-RISK, none with a security effect).
- **F17 (Low, DEFERRED)** — registry pushes still use long-lived tokens (`OPERATOR_TASKS.md`,
  "Image registry credentials").

No High or Critical. The posture is unchanged: the shell is thin, and its main concern is the supply
chain of the packages it mounts next to one wallet, which is now covered by the audit gate,
signature and provenance verification, a single copy of each shared package and a CI release gate
equal to branch CI.

## Threat model / trust boundaries

| Actor | Holds / proves | Can do | Bounded by |
| --- | --- | --- | --- |
| Embedded tool view (first-party) | the shared account | request signatures | wallet confirmation; each tool's audit; no per-tool isolation (by design) |
| Compromised dependency | code in the shared bundle | drive the shared wallet | lockfile; single copies; audit gate; signature and provenance verification (F9); trusted publishing |
| User | the wallet; network choice; localnet URL | switch network, point localnet anywhere | wallet-adapter validates the URL (localhost only for localnet) |
| Status API | `/api/status` | any body | ui `parseSnapshot`; text rendering |
| Static host / CDN (Cloudflare, static-server) | headers, served bytes | CSP/HSTS verified on every path (B.VUE-1); digest-pinned image; cosign signature |
| Build environment (CI variables, `.env*` files, Docker build args) | every `VITE_*` value baked into the bundle | `.dockerignore` excludes `.env*.local`; no secret is a `VITE_*` value (F4); no test-mode switch exists (B.VUE-2) |
| Base-image publisher, registry, CI publish job | the layers, the manifest for a tag, what is signed | base images pinned by digest; deployment pinned by digest from `config/images.yaml`; Trivy scan then keyless cosign, SBOM and provenance attestations (F10) |
| Authors of on-chain data the tools render | names, URLs, icons | the tools' own audits (the shell renders none) |

## Severity scale

Critical / High / Medium / Low / Info / Positive.

## Scope

- **In scope (0.1.84):** `src/main.ts`, `src/App.vue`, `src/router/index.ts`,
  `src/views/BlockchainView.vue`, `src/components/{NetworkSelector,ChainSelector}.vue`, `index.html`,
  `Dockerfile`, `.dockerignore`, the three workflows, `scripts/third-party-licenses.mjs`,
  `SECURITY.md`, the resolved dependency tree, and the deployment in
  `post-bootstrap/dashboard/` (read-only).
- **Out of scope:** the embedded tools, wallet-adapter, ui, the clients (own audits).
- **Environment (2026-10-09):** `vue-tsc`; stylelint, eslint (with `suiBoundary()`), html-validate
  all clean; audit gate (1 allowlisted dev-tooling advisory, 0 open; `npm audit --omit=dev` finds 0
  vulnerabilities); `npm audit signatures`: 362 packages with verified signatures, 143 with verified
  attestations; `npm run check:licenses` (118 production packages); `npm pack --dry-run` (12 files);
  one copy of `@mysten/sui` (2.35.0) and of each `@meddleware/*` package (`npm ls`). No unit tests
  (shell only). Live: `curl -I` of `dash.meddleware.co.uk/` and `/blockchain`, and
  `/THIRD_PARTY_LICENSES`; repository variables and recent workflow runs read with `gh`.

## Findings

### F1 — `@mysten/sui` override behind the tools' peer ranges

**Severity:** Low   **Disposition:** RESOLVED — superseded: the override is gone; the dashboard
declares `^2.33.2` like every tool, and npm resolves a single copy.
**Remediation / evidence (2026-10-09):** re-checked on 0.1.84: `package.json` has no `overrides`,
`@mysten/sui ^2.33.2` resolves to 2.35.0, and `npm ls @mysten/sui @meddleware/wallet-adapter` shows
one copy of each (every other occurrence `deduped`).

### F2 — `CLAUDE.md` override rationale

**Severity:** Info   **Disposition:** RESOLVED (with F1).
**Remediation / evidence (2026-10-09):** the override rationale is gone from `CLAUDE.md`, which now
explains the single-copy rule. One sentence there is stale — it says the SDK is "pinned exactly
(`2.33.2`)" while `package.json` carries `^2.33.2` (recorded under F16).

### F3 — Security-relevant runtime lives in other packages

**Severity:** Info   **Disposition:** ADJUDICATED — the status render, wallet feature guards and the
localnet URL check are in ui and wallet-adapter, both audited (ui F1–F7; wallet-adapter F2, F3, F10).
**Remediation / evidence (2026-10-09):** unchanged and re-checked: the shell has no `fetch`,
`localStorage`, `href` or `innerHTML` of its own (`grep` of `src/`); the sources are ui 0.1.31 and
wallet-adapter 0.0.17, the versions in the lockfile.

### F4 — `VITE_*` values are public

**Severity:** Positive — network, relay and RPC URLs, gate ids and terms, the tip ceiling; no keys.
Re-checked 2026-10-09: the repository's build variables (`gh variable list`) are the testnet relay
URL, the relay gate id, soulbound flag, price, tip ceiling and indexer URL; the four repository
secrets are registry credentials, none of them a build argument.

### F5 — No HTML sinks

**Severity:** Positive — no `v-html`, `eval` or iframes; the account link goes through
`ExplorerLink` (`safeHref`). Re-checked 2026-10-09; `suiBoundary()` now also fails CI on a raw URL
binding that bypasses `safeHref`, `safeIcon`, `suiExplorerUrl` or `walruscanBlobUrl`.

### F6 — Dependency audit in CI

**Severity:** Info   **Disposition:** RESOLVED — the audit gate (TS lens B.TS-3) in CI and both
publish workflows.
**Remediation / evidence (2026-10-09):** `node .github/audit-gate.mjs` runs in `node-ci.yml` (which
the Docker release now calls, F10) and in the npm publish `verify` job; the single allowlist entry
(GHSA-vfj7-8cjw-p6xm, `braces`, dev tooling only, expires 2027-01-01) has a reason and an expiry, and
`npm audit --omit=dev` reports 0 vulnerabilities.

### F7 — `SECURITY.md`

**Severity:** Low   **Disposition:** RESOLVED — names the first-party-only mount assumption.
**Remediation / evidence (2026-10-09):** `SECURITY.md` has the five required sections and states the
four invariants (first-party same-bundle views, no accounting in JS, no secret `VITE_*`, status
snapshot rendered as text); it does not contradict any disposition here. Its scope list names
`platform-probe` and the tool views but not the Treasury and Token Deployer views (cosmetic; the
embedded views are described in their own policies).

### F8 — Unused runtime dependency

**Severity:** Info   **Disposition:** RESOLVED (0.1.75)
**Where:** `package.json`, `src/main.ts`
**Issue / impact:** `pinia` was installed and `app.use(createPinia())` ran, but no package in the
workspace defines a store. Every runtime dependency here sits next to the shared wallet, so an unused
one is attack surface with no benefit.
**Remediation / evidence:** removed; build and lint clean. Re-checked 2026-10-09: `pinia` is absent
from `package.json` and `src/main.ts` only installs the router; the production dependencies are the
tool views, `@meddleware/{ui,design-tokens,wallet-adapter}`, `@mysten/sui`, `vue` and `vue-router`.

### F9 — Package signatures and provenance not verified

**Severity:** Low   **Disposition:** RESOLVED (CI, `dashboard` main)
**Where:** workflows
**Issue / impact:** the lockfile pins versions and integrity hashes, but nothing checked the
registry's signatures or the provenance attestations of what was installed, so a package published
outside its repository's workflow would not be noticed.
**Remediation / evidence:** `npm audit signatures` after install in Node CI, the npm publish and the
image publish workflows (local run: 361 packages with verified registry signatures, 142 with verified
attestations). Disallowing token publishing on every `@meddleware/*` package is the maintainer's
side (OPERATOR_TASKS.md, npm housekeeping). Re-run 2026-10-09 on 0.1.84: 362 packages with verified
registry signatures, 143 with verified attestations; the step is in `node-ci.yml` and the npm
publish `verify` job.

### F10 — Release did not run the full CI, scan the image, or ship notices

**Severity:** Low   **Disposition:** RESOLVED (0.1.84, `e7f8e9d`)
**Where:** `.github/workflows/docker-publish.yml`, `Dockerfile`, `scripts/third-party-licenses.mjs`
**Issue:** the tag-triggered release built and signed an image without re-running the branch CI
checks, without scanning the built image before it was signed, and the image carried neither the
lockfile (the bundle holds no package metadata, so an SBOM of the image listed only the base layers)
nor the licence texts that MIT/BSD/Apache-2.0 require to accompany a redistributed bundle.
**Impact:** a tag could ship what CI would have refused; a fixable CRITICAL/HIGH base-layer
vulnerability could be signed; the SBOM under-reported the bundled dependencies.
**Remediation / evidence:** the release's first job `verify` calls `node-ci.yml` as a reusable
workflow (`workflow_call`) and every image job `needs: verify`; Trivy (`CRITICAL,HIGH`,
`ignore-unfixed`, exit code 1) scans the merged multi-arch image by digest before `cosign sign`; the
Dockerfile copies `package-lock.json` into `/usr/share/doc/dashboard/` for SBOM tools and runs
`npm run licenses`, so `dist/THIRD_PARTY_LICENSES` is served (live: `200 text/plain` on 2026-10-09;
118 production packages, 10 without a licence file in their tarball, listed by the generator); CI
runs `npm run check:licenses && test -s dist/THIRD_PARTY_LICENSES`. Release run for `v0.1.84`
succeeded (Publish (Docker) and Publish (npm), 2026-10-09). Nothing else tests this in CI, so the
workflow files are the evidence.

### F11 — Runtime user implicit; base image behind the Go toolchain fix

**Severity:** Info   **Disposition:** RESOLVED (0.1.83, `b86e18c`)
**Where:** `Dockerfile`
**Issue:** the image inherited its non-root user from the base without saying so, and the base was
static-server 0.1.6 (built on a Go release with stdlib advisories; the 2026-10-09 govulncheck run
found 11 in Go 1.26.7).
**Impact:** the Dockerfile did not document its runtime user; the served binary carried fixable
stdlib advisories.
**Remediation / evidence:** the runtime stage is `static-server:0.1.7@sha256:2e227311…` (Go 1.26.9,
the digest in `config/images.yaml`) and the Dockerfile sets `USER 65534:65534`. The pod runs
`runAsNonRoot` (uid/gid 65534), `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`, all
capabilities dropped, `seccompProfile: RuntimeDefault` and `automountServiceAccountToken: false`;
readiness and liveness probes hit `/` and the limits are 100m CPU / 48Mi.

### F12 — CSP allows any `https:` origin for `connect-src` and `img-src`

**Severity:** Low   **Disposition:** ACCEPTED-RISK
**Where:** `Dockerfile` (`ARG CSP`), live headers
**Issue:** the served policy is `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'` (plus the
per-response nonce static-server appends for the edge's own script); `connect-src 'self' https:`;
`img-src 'self' data: blob: https:`; `style-src 'self' 'unsafe-inline'`; `object-src 'none'`;
`base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'self'`; `worker-src 'self' blob:`;
`upgrade-insecure-requests`. Any `https:` origin may be contacted and any `https:` image loaded.
**Impact:** an XSS that could not be stopped by `script-src` could exfiltrate to any HTTPS host; an
image URL from on-chain display data is a tracking surface.
**Remediation / evidence:** accepted with the lens's stated reason: RPC, relay, aggregator,
publisher and Seal key-server hosts are partly operator- or chain-configured (including a user's
localnet URL) and the embedded tools' on-chain images come from arbitrary hosts, so an enumerated
list would break working configurations. `script-src` has no `'unsafe-inline'`/`'unsafe-eval'`, so
the code-execution route is closed; the policy was seen on `/` and `/blockchain` on 2026-10-09
together with `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Cloudflare zone),
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, geolocation,
microphone, payment off), `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`
(embedding is same-origin only, matching `frame-ancestors 'self'`). Tightening `connect-src` waits for
the mainnet endpoint list; narrowing `img-src` follows the image policy of the tools (their audits).

### F13 — No build-time check for inline scripts

**Severity:** Low   **Disposition:** MITIGATED
**Where:** `.github/workflows/node-ci.yml`, `Dockerfile`
**Issue:** B.VUE-1 asks for a build-time check that fails when the build emits an inline script not
covered by the CSP. The dashboard has none. Today the build emits none (`index.html` carries one
`<script type="module" src>` and the built page references only `/assets/*.js`; the one inline
script on the live page is Cloudflare's, injected at the edge and covered by the response nonce).
**Impact:** a future dependency or plugin that injects an inline script would be blocked by the
browser rather than caught in CI; the failure would show only in a browser sweep.
**Remediation / evidence:** compensating control: `script-src` has no `'unsafe-inline'`, so an
uncovered inline script is refused at runtime (fail closed). Adding a CI step that greps
`dist/index.html` for inline `<script>` without `src` is in the implementation suggestions.

### F14 — No image configuration scan or container probe in CI

**Severity:** Low   **Disposition:** ACCEPTED-RISK
**Where:** `.github/workflows/`
**Issue:** the IMG lens (Section C) asks CI to scan the Dockerfile and manifests (e.g. Trivy config)
and to probe the running container (health, served headers, non-root). The dashboard's CI scans the
published image for vulnerabilities (F10) but runs neither. The manifests live in the workspace, not
this repository.
**Impact:** a regression in the Dockerfile or served headers is found at deployment or in a manual
sweep, not at the pull request.
**Remediation / evidence:** accepted: the Dockerfile is two stages with digest-pinned bases and the
runtime settings are inherited from the audited static-server; the headers, `/THIRD_PARTY_LICENSES`
and the non-root pod were verified by hand on 2026-10-09 (this audit's Section A/B) and the image is
re-verified by `bootstrap/images/verify-digests.sh` (cosign, 16/16 valid on 2026-10-09). A
`trivy config` step and a header probe are in the implementation suggestions.

### F15 — npm publish gate is narrower than CI

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** the Docker release calls `node-ci.yml` (F10), but the npm publish workflow has its own
`verify` job (audit gate, signatures, type-check, unit tests) and builds in the publish job; it skips
the three linters and the licence check. `NPM_PUBLISH=true` is set, so `@meddleware/dashboard` is
published on every tag (OIDC trusted publishing with provenance; the npm client pinned to 11.20.0;
publish is idempotent against the registry).
**Impact:** a tag with a lint failure could publish to npm while the image release fails. The npm
package is the app's source for embedding and is consumed by nothing in the workspace.
**Remediation / evidence:** accepted because both workflows trigger on the same tag and the image
release, which is what runs in production, is gated on the full CI; the npm package has no
consumers. Calling `node-ci.yml` from `verify` would close it (implementation suggestions).

### F16 — Build-input inventory incomplete or stale in the repository's docs

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `.env.example`, `.env.production`, `Dockerfile`, workflows, `CLAUDE.md`, `package.json`
**Issue:** the VUE lens asks that every `VITE_*` variable the build reads appears in `.env.example`.
`.env.example` lists only `VITE_DOCS_URL` and `VITE_DEV_URL`; the tool views read the other
variables, which are documented only as `ARG`s in the Dockerfile. `VITE_RPC_TESTNET|MAINNET` and
`VITE_ACCESS_GATE_ID_MAINNET` are declared as build args but the workflows never pass them (they
resolve to empty); `.env.production` commits `VITE_FEE_TREASURY_*` (public addresses) with a comment
naming the retired package `@meddleware/token-deployer-sui`, and they are not build args. `CLAUDE.md`
says `@mysten/sui` is "pinned exactly (`2.33.2`)" (it is `^2.33.2`), and `package.json` `files` lists
a `CHANGELOG.md` that does not exist.
**Impact:** documentation drift only; no variable is a secret (F4) and none selects an on-chain ID
that is not also set in the embedded client's `deployments`.
**Remediation / evidence:** accepted as hygiene with no security effect; the corrections are in the
implementation suggestions. The inventory in this audit's front matter is the checked list.

### F17 — Image pushes use long-lived registry tokens

**Severity:** Low   **Disposition:** DEFERRED (maintainer: `OPERATOR_TASKS.md` "Image registry
credentials"; the npm-side lockdown is "npm housekeeping")
**Where:** repository secrets `QUAY_TOKEN`, `DOCKERHUB_TOKEN` (set 2026-09-02); the best-effort
self-hosted mirror jobs read `PRIVATE_REGISTRY_*`, which are not set (the jobs fail without
credentials and are `continue-on-error`; maintainer item)
**Issue:** the build jobs hold the registry credentials (the push cannot be keyless), so a runner
compromise could push to the image repositories. The signature, not the registry, is what the
cluster verifies, and deployments pin by digest, which bounds the damage.
**Impact:** an attacker with the token could publish an unsigned image, which `verify-digests.sh`
and digest pinning reject; they could not forge the keyless signature.
**Remediation / evidence:** the maintainer records each token's scope and rotation date and splits
shared accounts. The verification command (`verify-digests.sh`) pins the OIDC issuer and the identity
regexp `https://github.com/meddleware-org/dashboard/` (repository-anchored, any workflow and tag in
it). The self-hosted mirror is listed as best-effort and unsigned in B.2.

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | One wallet connection, requested with the tools' superset of features | `App.vue` `useWallet` | source | HOLDS (by design) |
| I2 | Tools are first-party components from npm, never iframes | `router/index.ts`, `BlockchainView.vue` | source | HOLDS |
| I3 | No transaction construction or accounting in the shell | source | `suiBoundary` trial (B8) | HOLDS |
| I4 | One copy of `@mysten/sui` and of each `@meddleware/*` package | lockfile | `npm ls` (2026-10-09) | HOLDS |
| I5 | No HTML sinks; no secrets | source; Dockerfile | grep | HOLDS (F4, F5) |
| I6 | Installed packages carry valid registry signatures | `npm audit signatures` | CI | HOLDS (F9) |
| I7 | Mainnet cannot be selected before launch | `NetworkSelector` disables the mainnet option and resets mainnet to testnet once connected | source | HOLDS (code-only) |
| I8 | A release cannot ship what CI refuses, and the image is scanned before it is signed | `docker-publish.yml` `verify` → `node-ci.yml`; Trivy step before `cosign sign` | workflow files; run `v0.1.84` | HOLDS (F10) |
| I9 | The served page carries CSP and HSTS and no inline script outside the response nonce | Dockerfile `CSP`; Cloudflare zone HSTS | `curl -I` 2026-10-09 | HOLDS (F12, F13) |

### Lens categories

| Lens | Category | Status |
| --- | --- | --- |
| TS | Supply chain | HOLDS — audit gate, signatures (F9), no unused runtime deps (F8) |
| TS | Compiler strictness | `strict: true`; `noUncheckedIndexedAccess` off — the shell parses no untrusted data (status parsing is ui's, `parseSnapshot`) |
| TS | Network I/O, dynamic code, secrets | N/A in the shell — no `fetch`, `eval` or dynamic `import()` of a non-literal (the tool imports are literals) |
| TS | Packaging (B.TS-1/2) | HOLDS — `files` whitelist, `npm pack --dry-run` lists 12 files (sources, `index.html`, configs), no `.env*`; no lifecycle scripts, no `overrides` (F1) |
| VUE | Untrusted rendering | HOLDS (F5) |
| VUE | Colour & links | through ui/design-tokens (contrast gate in their audits); the shell adds only brand and sidebar styles |
| VUE | Build-time configuration | HOLDS for secrets (F4); inventory gaps in F16 |
| VUE | Test hooks (Vite) | N/A — no test mode, mock wallet or `window.__*` hook exists; no `MODE` branch in `src/` |
| VUE | Signing UX | N/A — the shell builds no transactions; signing flows are in the tools |
| VUE | Shared-wallet state | HOLDS — the tools follow account and network changes (their audits); one wallet-adapter 0.0.17 copy |
| VUE | Lazy boundaries | HOLDS — every tool view is a lazy chunk; Walrus wasm loads on first use |
| VUE | Browser storage | through ui (colour mode) and wallet-adapter (network), both non-throwing |
| VUE | Dual app / library | N/A — host only |
| VUE | Hosting headers (B.VUE-1) | HOLDS with F12 (ACCEPTED-RISK `https:`) and F13 (no build-time inline-script check) |
| IMG | Base images, build context, reproducible build | HOLDS — `node:24-slim` and static-server 0.1.7 digest-pinned; `.dockerignore` excludes `.env*.local`; `npm ci`; the committed `.env.production` is deliberate (F16) |
| IMG | No secrets in layers | HOLDS — build args are public `VITE_*` values and `CSP` |
| IMG | Runtime user & filesystem | HOLDS — `USER 65534:65534`; pod hardened, `automountServiceAccountToken: false` (F11) |
| IMG | SBOM & notices, scan before sign | HOLDS — lockfile in image, `/THIRD_PARTY_LICENSES`, Trivy before cosign (F10) |
| IMG | Verification command, deployment pinning | HOLDS — `verify-digests.sh` pins issuer and repository identity (F17); overlay pins the digest from `config/images.yaml` |
| IMG | Config scan and container probe in CI | GAP accepted (F14) |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| walrus-ui / seal-ui / access-gate-ui / token-deployer-ui / treasury-ui | `^0.1.56` / `^0.0.36` / `^0.1.35` / `^0.0.34` / `^0.0.16` (locked at the same versions) | each tool | clean 2026-10-09 | the 2026-10-09 builds; walrus-ui 0.1.57 and token-deployer-ui 0.0.35 (release-gate-only changes) are newer than the lock — no functional difference |
| dao-ui | `^0.1.32` | none (route disabled) | clean | retained for re-enabling; not bundled |
| `@meddleware/wallet-adapter` | `^0.0.17` | wallet | clean | the one copy |
| `@meddleware/ui` / `design-tokens` | `^0.1.31` / `^0.1.9` | shell | clean | |
| `@meddleware/eslint-config` (dev) | `^0.0.2` | CI | clean | `suiBoundary()` |
| `@mysten/sui` | `^2.33.2` (2.35.0) | everything | clean | one copy; ADR-0001 baseline `^2.33.1` |
| `vue` / `vue-router` / `vite` / `@vitejs/plugin-vue` / `typescript` | `^3.5.43` / `^5.3.0` / `^8.3.0` / `^6.0.9` / `~6.0.0` | build and runtime | clean | TypeScript 7 deferred (decision); vitest not used |
| Base images | `node:24-slim@sha256:0e0ff40c…`, `static-server:0.1.7@sha256:2e227311…` | runtime: static-server serves the bundle | Trivy on the published image, CRITICAL/HIGH fixable fail | static-server on Go 1.26.9 |
| Embedded-tool dependency tree | 385 locked packages (118 production) | — | `npm audit --omit=dev`: 0; allowlist: `braces` GHSA-vfj7-8cjw-p6xm (dev tooling, expires 2027-01-01) | signatures 362, attestations 143 |

### B.2 Publish authority, capabilities & secret custody

| Authority / secret | Where held | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub Actions (`npm-publish.yml`, `NPM_PUBLISH=true`) | OIDC trusted publishing + provenance; npm client pinned 11.20.0; idempotent | library | n/a; token-publishing lockdown is the maintainer's (F17, OQ3) |
| `QUAY_TOKEN`, `DOCKERHUB_TOKEN` (+ usernames) | GitHub secrets (set 2026-09-02) | robot accounts | image push | scope and rotation to be recorded (F17) |
| image signing, SBOM and provenance attestations | GitHub Actions (`merge-docker-public`) | cosign keyless; SPDX SBOM attestation; build provenance, pushed to the registry; no `continue-on-error` on the public path | images (index digest) | n/a |
| self-hosted registry mirror | `*-private` jobs | `PRIVATE_REGISTRY_*` not set; `continue-on-error`, unsigned | none (best-effort) | maintainer item |
| Workflow hygiene | `.github/workflows/*` | Actions pinned by full SHA; `permissions:` per workflow and job (`id-token`/`attestations: write` only on the merge job and the npm publish job); release gate = `node-ci.yml` via `workflow_call` (Docker) — see F15 for npm; Dependabot weekly, grouped (npm, docker, github-actions) | all | n/a |

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — C (shell; no unit tests)

Count at 2026-10-09: 0 unit tests (vitest is not used; the shell has no logic to test). Gates run in
CI on every push and on the release: `vue-tsc --noEmit`, stylelint, eslint (vue-a11y and
`suiBoundary()`), html-validate, the production build, the audit gate, `npm audit signatures` and the
licence check. The tools carry their own tests; the shell is exercised by the live sweep and the
gated `e2e:walrus` run (token-deployer-ui repository, `scripts/e2e-walrus-browser.mjs`) against the
production dashboard. No browser e2e of the shell, no axe run and no production-artifact scan for
test hooks exist here because there are no test hooks (B.VUE-2).

| Dimension | Assessment |
| --- | --- |
| Happy-path coverage | partial — live sweep and `e2e:walrus`; nothing automated per commit |
| Error-path / failure-mode coverage | none in the shell (the tools cover theirs) |
| Boundary / edge-case coverage | none (network selector reset to testnet is unit-untested) |
| Security-relevant coverage | static: `suiBoundary()`, audit gate, signatures; no dynamic test |

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Build, lint, type-check, licences | yes | — | CI |
| Tool flows through the shared wallet | no | testnet | `e2e:walrus` and the paywall e2e (maintainer, with the key); Chromium sweep. Paywall e2e PASS against the live dashboard 2026-10-09 (pass bought on gate `0x316f1bf9…`, consumed, upload through the Worker) |
| Served headers, `/THIRD_PARTY_LICENSES`, non-root pod | no | live deployment | manual `curl -I` 2026-10-09; `verify-digests.sh` (F14) |

## Section D — Deployment-readiness gates

### pre-localnet

- [x] builds; no secrets; single copies — `vue-tsc` and build clean; no secret in any `VITE_*` (F4); one `@mysten/sui` and one wallet-adapter (F1)
- [x] no `v-html`; every dynamic href allowlisted (`ExplorerLink`/`safeHref`, `suiBoundary()`) (F5)
- [x] every `FROM` digest-pinned; `.dockerignore` excludes local env files and installs; lockfile installs (`npm ci`)

### pre-testnet

- [x] deployed with digest pinning; CSP on every tool route — 0.1.84 digest in `config/images.yaml` and the overlay; headers seen on `/` and `/blockchain` (F12)
- [x] 0.1.84 deployed (2026-10-09); release run green; cosign signature valid (`verify-digests.sh` 16/16)
- [x] test-mode guards: none needed — no test mode exists (B.VUE-2)
- [x] non-root runtime; pod security context complete; probes and limits set (F11)
- [x] audit gate in CI and publish; `npm pack` contents verified (12 files); no install-time code (TS B.TS-2)
- [x] `SECURITY.md` present (F7)
- [x] release gate equals CI for the image (F10); the npm publish gate is narrower (F15, ACCEPTED-RISK)
- [ ] config scan and container probe in CI — accepted gap (F14)

### pre-mainnet

- [x] CSP and HSTS deployed on every hosting path — the only hosting path is the image behind Cloudflare; HSTS `max-age=31536000; includeSubDomains` at the zone (F12)
- [x] signature, SBOM attestation and provenance on every pushed image, no `continue-on-error` on the public path (F10); image scan at release clean
- [x] wallet change events handled in every view — the tools' and wallet-adapter's audits; the shell holds no wallet-dependent cache
- [ ] mainnet enabled in the network selector once the packages and gate exist — mainnet-blocked (access_gate and seal_policies mainnet release: `OPERATOR_TASKS.md` "Mainnet release custody")
- [ ] token publishing disallowed on every `@meddleware/*` package (OQ3) — maintainer-only (`OPERATOR_TASKS.md` "npm housekeeping")
- [ ] registry credential scope and rotation recorded (F17) — maintainer-only (`OPERATOR_TASKS.md` "Image registry credentials")
- [ ] external review of the shared-wallet surface — mainnet-blocked (`OPERATOR_TASKS.md` "Funding, grants and an external audit")

## Cross-project themes

- **Supply chain & release integrity** — the dashboard aggregates every first-party package next to
  one wallet; it is where signature verification (F9) and the npm lockdown (OQ3) matter most.
  Lockfile committed and installed with `npm ci` (also in the image); Actions pinned by SHA; base
  images pinned by digest; audit gate with an expiring allowlist; the Docker release calls the full
  CI and scans before signing (F10). CVE status 2026-10-09: 0 production advisories.
- **Wire-format coupling & conformance vectors** — N/A in the shell; formats live in the clients and
  tools (own audits).
- **On-chain-truth boundary** — no accounting or authorisation in the shell; it routes and previews
  nothing financial (I3).
- **Deployment readiness** — Section D; the only open boxes are mainnet-blocked or maintainer-only.
- **Chain-access layering** — no chain logic in the shell (`suiBoundary()`); the relay gate id comes
  from the repository variable `VITE_ACCESS_GATE_ID_TESTNET` (`0x316f1bf9…faddc`, the 2026-10-09
  gate on the latest `access_gate`), read by the embedded tools, which also hold the same id in the
  access-gate-client `deployments` export. Embedded access-gate-client 0.0.8 and seal-client 0.0.19
  (one copy of each in the bundle).

## Normative requirements (MUST / MUST NOT)

- **TS-M1–TS-M8** — hold (TS-M2–M6 are N/A in a shell that parses and fetches nothing; TS-M7:
  whitelist and no install scripts; TS-M8: `npm ci`, audit gate, ADR-0001 baseline).
- **VUE-M1–VUE-M9** — hold where applicable; VUE-M3 and VUE-M4 are N/A (no test mode, no signing in
  the shell); VUE-M8 holds with the broad `https:` sources recorded in F12.
- **IMG-M1–IMG-M8** — hold (M7 and M8 per F10; the verification command is repository-anchored, F17).
  The CI config scan implied by Section C is the accepted gap F14.
- The release MUST keep calling the full CI before building (F10), and MUST scan before signing.
- `connect-src` MUST be enumerated before mainnet if the endpoint set is fixed by then (F12).

## Implementation suggestions (SHOULD / MAY)

- SHOULD add a CI step that fails when `dist/index.html` contains an inline `<script>` without `src`
  (F13), and a `trivy config` step plus a header probe against the built image (F14).
- SHOULD make the npm publish `verify` job call `node-ci.yml` (F15).
- SHOULD list every `VITE_*` variable in `.env.example`, drop the unused `VITE_RPC_*` build args or
  pass them, fix the `.env.production` comment and the "pinned exactly" sentence in `CLAUDE.md`, and
  mention the Treasury and Token Deployer views in `SECURITY.md` (F16, F7).
- MAY drop the retained `@meddleware/dao-ui` dependency until governance returns (it is not bundled,
  but every release has to keep it current).
- MAY add the `CHANGELOG.md` that `files` lists (the file does not exist), or remove it from `files`.

## Open questions (`OQ#`)

- **OQ1** — (Decided 2026-09-18: `StatusWidget` renders text after `parseSnapshot` — see F3.)
- **OQ2** — (Decided 2026-09-18: the localnet URL is limited to localhost by wallet-adapter — see F3.)
- **OQ3** — Is there enforcement that the embedded packages can only be published from their own
  repositories? (Decided 2026-10-03: CI verifies signatures and provenance (F9); each package has a
  trusted publisher; the maintainer disallows token publishing on every package — OPERATOR_TASKS.md.)
- **OQ4** — Should the `@mysten/sui` override track the tools automatically? (Decided 2026-10-02: no
  override; the same caret range everywhere, checked by the alignment sweep — see F1.)

## Risks

- **Shared wallet** — any embedded package can request signatures; wallet confirmation is the last
  check.
- **Registry tokens** — long-lived robot tokens for image pushes (F17); the digest and signature
  checks bound the effect.
- **Third-party liveness** — Cloudflare (edge, HSTS, tunnel), quay.io and Docker Hub (image pulls;
  the node runs the pinned digest from its local store), and every RPC, relay, aggregator and
  key-server host the tools contact; a failure there breaks the tools, not the shell.
- **Broad `connect-src`** — an XSS that bypasses `script-src` could exfiltrate to any HTTPS host (F12).

## Re-verification log

- 2026-09-18 — first-pass baseline (F1–F7).
- 2026-10-01/02 — B5–B8 consumer waves (0.1.70–0.1.74); CSP verified on every tool route.
- 2026-10-03 — re-verified under AUDIT_TEMPLATE.md + TS + VUE + IMG (Phase 7): rewritten to the
  current template (hostname, routes, override and versions corrected). F8 RESOLVED in 0.1.75; F9
  RESOLVED in CI; OQ3, OQ4 decided.
- 2026-10-03 — 0.1.75 deployed; live sweep clean, every tool tab loads without console errors.
- 2026-10-08 — Lens dates reconciled with the registry (`check-template-dates.mjs`): base 2026-10-08, and SUI_CLIENT/GO 2026-10-08 and TS 2026-10-03 where cited. The changes (AUTH/PLATFORM/MCP/DB registered, the GO token row moved to AUTH, JSR in trusted publishing, layered injection guards) alter no disposition here.
- 2026-10-09 — re-verified at 0.1.84 (deployed): every finding re-checked against the code, the
  workflows, the live headers (`curl -I` of `/` and `/blockchain`, `/THIRD_PARTY_LICENSES`) and the
  repository variables and recent runs (`gh`). F1–F9 confirmed (evidence added); applied the
  container-image lens and re-checked the VUE and TS lens rows; added F10 (release gate, scan,
  notices — RESOLVED `e7f8e9d`), F11 (explicit non-root user, static-server 0.1.7 — RESOLVED
  `b86e18c`), F12 (CSP `https:` — ACCEPTED-RISK), F13 (no inline-script build check — MITIGATED),
  F14 (no config scan or container probe in CI — ACCEPTED-RISK), F15 (npm publish gate narrower than
  CI — ACCEPTED-RISK), F16 (build-input inventory and doc drift — ACCEPTED-RISK), F17 (long-lived
  registry tokens — DEFERRED, `OPERATOR_TASKS.md`). Versions and counts corrected (0.1.84, tools
  0.1.56/0.0.36/0.1.35/0.0.34/0.0.16, wallet-adapter 0.0.17, `@mysten/sui` 2.35.0, 362 signatures and
  143 attestations, 385 locked packages). Template dates reconciled with the registry (TS, VUE, IMG
  2026-10-08). Section D ticked with evidence; open boxes are mainnet-blocked or maintainer-only.
