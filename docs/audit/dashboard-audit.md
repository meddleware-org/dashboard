# Security Audit — `dashboard`

**Classification:** Internal security review
**Project:** `repos/dashboard` — `@meddleware/dashboard`, Vue 3 hub (`dash.meddleware.co.uk`) hosting the tool views inline: Treasury at `/`, and Walrus Storage, Sealed Storage, Access Gate and Token Deployer as tabs at `/blockchain`
**Project type:** Vue app
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08) + AUDIT_TEMPLATE_IMG.md (2026-10-08). `AUDIT_TEMPLATE_SUI_CLIENT.md` is not triggered: the shell builds no PTBs, reads no Move objects or events and verifies no signatures — `suiBoundary()` (eslint-config 0.0.2) fails CI on any such code in `src/`; the chain surface lives in the embedded tools and their clients (own audits).
**Sui SDK:** `@mysten/sui ^2.36.0` (one copy, resolves 2.36.0)   **Transport:** through the embedded tools and wallet-adapter
**Package manager / lockfile:** npm 11, committed (453 locked packages; 127 production)   **Publish model:** ships source + SPA image
**Runtime targets:** browser
**Build tool:** vite 8.3.4, @vitejs/plugin-vue 6.0.10, vue 3.5.44, vue-router 5.4, vue-tsc 3.3.13   **Hosting:** container image (static-server 0.1.8); no static host / `_headers`   **Embedding hosts:** none (this is the host of the tool views)
**VITE_\* inventory:** build args baked at build, testnet only, no secrets: `VITE_NETWORK` (default `testnet`), `VITE_WALRUS_RELAY_TESTNET|MAINNET`, `VITE_RPC_TESTNET|MAINNET`, `VITE_ACCESS_GATE_ID_TESTNET|MAINNET` (relay gate — read by access-gate-ui/walrus-ui), `VITE_ACCESS_GATE_SOULBOUND_TESTNET`, `VITE_UPLOAD_RELAY_MAX_TIP_MIST`, `VITE_INDEXER_URL`; shell-only `VITE_DOCS_URL`, `VITE_DEV_URL`; committed in `.env.production`: `VITE_FEE_TREASURY_TESTNET|MAINNET` (token-deployer fee address, public). Repository variables set 2026-10-09: gate `0x316f1bf9…faddc` (`VITE_ACCESS_GATE_PRICE_MIST_TESTNET` is removed in 0.1.85: the price is read from the chain, F18; the inventory is `.env.example`, pinned by `tests/build-inputs.test.ts`, F16)
**Images:** `quay.io/meddleware-org/dashboard:0.1.84@sha256:e8957db3d880d593b19e0c0e32e2a858887879505e969b5bec7cd804734cb34e` (Docker Hub mirror `meddleware/dashboard`, same digest); 0.1.85 is prepared (not yet released or deployed)
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.8@sha256:e32cf42b…4000` (0.1.84 deployed on 0.1.7, Go 1.26.9)
**Runtime user:** 65534:65534 (`USER` in the Dockerfile, `runAsNonRoot` in the pod)   **Runtime FS:** read-only root, nothing writable mounted
**Deployed by:** `post-bootstrap/dashboard/overlays/default` (digest from `config/images.yaml`)
**Build args:** the `VITE_*` list above and `CSP` — public configuration, none secret
**Deployment status:** npm v0.1.84 (2026-10-09, trusted publishing); image `quay.io/meddleware-org/dashboard` serving `dash.meddleware.co.uk` at 0.1.84 (deployed 2026-10-09; live headers checked 2026-10-09; cosign signature valid, `verify-digests.sh` 16/16)
**Review date:** 2026-09-18 (first pass) · re-verified 2026-10-03 · re-verified 2026-10-09 · fix wave 2026-10-18 (0.1.85)
**Reviewer:** Internal review
**Severity ceiling:** Medium — it owns the one wallet connection every embedded tool signs through, so its ceiling is the union of the tools' signing surfaces. No High or Critical in dashboard code.
**Status:** fix wave 2026-10-18 (0.1.85, not yet released) — 20 findings (2 Positive): 15 RESOLVED, 1 ADJUDICATED, 1 ACCEPTED-RISK, 1 DEFERRED

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
- **F12–F16 (Low/Info, recorded 2026-10-09)** — the CSP's `connect-src`/`img-src` allow any `https:`
  origin (ACCEPTED-RISK); no build-time inline-script check (F13), no image config scan or container probe
  in CI (F14), an npm publish gate narrower than CI (F15) and an incomplete `VITE_*` inventory (F16) were
  accepted or mitigated then and are RESOLVED in the 2026-10-18 fix wave.
- **F17 (Low, DEFERRED)** — registry pushes still use long-lived tokens (`OPERATOR_TASKS.md`,
  "Image registry credentials").

The 2026-10-18 fix wave (0.1.85, prepared, not released) embeds the 2026-10-18 builds of every tool
(walrus-relay 0.1.31: the access-gate price is read from the chain) and found and fixed three more:

- **F18 (Info, RESOLVED)** — the `VITE_ACCESS_GATE_PRICE_MIST_TESTNET` build input is removed everywhere.
- **F19 (Low, RESOLVED)** — the npm bundled with Node 24.13 cannot verify the newest attestations; CI pins
  npm 11.20.0 for the signature step.
- **F20 (Low, RESOLVED)** — the shell now has 65 unit tests and a Playwright smoke test that mounts `/`, each
  tool tab and the legacy redirects of the built app (grade C to B).

No High or Critical. The posture is unchanged: the shell is thin, and its main concern is the supply
chain of the packages it mounts next to one wallet, which is now covered by the audit gate,
signature and provenance verification, a single copy of each shared package, an inline-script guard, an
image probe and a CI release gate equal to branch CI for both the image and the npm package.

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

- **In scope (0.1.85):** `src/main.ts`, `src/App.vue`, `src/router/index.ts`,
  `src/views/BlockchainView.vue`, `src/components/{NetworkSelector,ChainSelector}.vue`, `index.html`,
  `Dockerfile`, `.dockerignore`, the three workflows, `scripts/` (licences, inline-script check, image probe), `tests/`, `e2e/`,
  `SECURITY.md`, the resolved dependency tree, and the deployment in
  `post-bootstrap/dashboard/` (read-only).
- **Out of scope:** the embedded tools, wallet-adapter, ui, the clients (own audits).
- **Environment (2026-10-18, 0.1.85):** `vue-tsc` (sources, tests, e2e); stylelint, eslint (with
  `suiBoundary()`), html-validate all clean; audit gate (1 allowlisted dev-tooling advisory, 0 open;
  `npm audit --omit=dev` finds 0 vulnerabilities); `npx npm@11.20.0 audit signatures`: 430 packages with
  verified signatures, 185 with verified attestations (npm 11.6.2 fails, F19); `npm run check:licenses` (127
  production packages); `npm pack --dry-run` (13 files, with `CHANGELOG.md`); one copy of `@mysten/sui`
  (2.36.0), of wallet-adapter and of each `@meddleware/*` package (`npm ls`, `find node_modules`);
  `npm test` 65 tests in 6 files; `npm run test:e2e` 3 tests; `podman build` and `scripts/smoke.sh` on the
  image (rootless podman). Live state is that of 2026-10-09 (0.1.84): `curl -I` of
  `dash.meddleware.co.uk/` and `/blockchain`, and `/THIRD_PARTY_LICENSES`; repository variables and recent
  workflow runs read with `gh` (the variables again on 2026-10-18).

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

**Severity:** Low   **Disposition:** RESOLVED (0.1.85, commit pending)
**Where:** `.github/workflows/node-ci.yml`, `Dockerfile`, `scripts/check-inline-scripts.mjs`
**Issue:** B.VUE-1 asks for a build-time check that fails when the build emits an inline script not
covered by the CSP. The dashboard had none; the build emits none (`index.html` carries one
`<script type="module" src>` and references only `/assets/*.js`; the one inline script on the live page is
Cloudflare's, injected at the edge and covered by the response nonce).
**Impact:** a future dependency or plugin that injects an inline script would be blocked by the
browser rather than caught in CI; the failure would show only in a browser sweep.
**Remediation / evidence:** `npm run check:dist` (`scripts/check-inline-scripts.mjs`) fails on any
`<script>` without `src`, any `<script src>` that also has a body, and any inline event-handler attribute
in a built HTML file. The Dockerfile runs it right after `npm run build` (the image build fails) and
`node-ci.yml` runs it after the build. `tests/inline-scripts.test.ts` pins the check on the Vite page shape,
the failing shapes and the source `index.html`; `tests/workflows.test.ts` pins that CI and the Dockerfile
run it. Runtime: `script-src` has no `'unsafe-inline'`, so an uncovered inline script is refused anyway.

### F14 — No image configuration scan or container probe in CI

**Severity:** Low   **Disposition:** RESOLVED (0.1.85, commit pending)
**Where:** `.github/workflows/node-ci.yml`, `scripts/smoke.sh`
**Issue:** the IMG lens (Section C) asks CI to scan the Dockerfile and manifests (e.g. Trivy config)
and to probe the running container (health, served headers, non-root). The dashboard's CI scanned the
published image for vulnerabilities (F10) but ran neither. The manifests live in the workspace, not
this repository.
**Impact:** a regression in the Dockerfile or served headers was found at deployment or in a manual
sweep, not at the pull request.
**Remediation / evidence:** the `image` job builds the Dockerfile (not pushed) and runs `scripts/smoke.sh`
on it as the cluster does (image user `65534:65534`, read-only root, all capabilities dropped,
no-new-privileges): the in-image `-healthcheck`; `/` and the SPA fallback `/blockchain` answer 200 with the
shell, `Cache-Control: no-cache` and the nosniff, X-Frame-Options, Referrer-Policy, HSTS,
Permissions-Policy and CSP headers (`script-src 'self' 'wasm-unsafe-eval'` plus a fresh nonce, no
`'unsafe-inline'`); the bundle is served from `/assets/` as immutable; a missing `/assets/` file is a 404
without `Cache-Control`; `/THIRD_PARTY_LICENSES` is served; `/.env` is a 404 and POST a 405. Run locally with
rootless podman on 2026-10-18: passed. The `scan` job runs Trivy over the repository
(`vuln,misconfig,secret`, fixable CRITICAL/HIGH fail), which covers the Dockerfile. The Kubernetes manifests
stay in the workspace (`post-bootstrap/dashboard/`; their pod hardening is recorded in F11). The jobs are
in the workflow both releases call; `tests/workflows.test.ts` pins the commands. The Trivy job has not run
yet (first run on the 0.1.85 push): if it reports a misconfiguration in the Dockerfile, fix the Dockerfile.

### F15 — npm publish gate is narrower than CI

**Severity:** Info   **Disposition:** RESOLVED (0.1.85, commit pending)
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** the Docker release calls `node-ci.yml` (F10), but the npm publish workflow had its own
`verify` job (audit gate, signatures, type-check, unit tests) and built in the publish job; it skipped
the three linters and the licence check. `NPM_PUBLISH=true` is set, so `@meddleware/dashboard` is
published on every tag (OIDC trusted publishing with provenance; the npm client pinned to 11.20.0;
publish is idempotent against the registry).
**Impact:** a tag with a lint failure could publish to npm while the image release fails. The npm
package is the app's source for embedding and is consumed by nothing in the workspace.
**Remediation / evidence:** `verify` is now `uses: ./.github/workflows/node-ci.yml`, as in
access-gate-ui and treasury-ui, so the package is released only if the commit passes exactly what CI
runs. `tests/workflows.test.ts` pins that both release workflows call `node-ci.yml`.

### F16 — Build-input inventory incomplete or stale in the repository's docs

**Severity:** Info   **Disposition:** RESOLVED (0.1.85, commit pending)
**Where:** `.env.example`, `.env.production`, `Dockerfile`, workflows, `CLAUDE.md`, `package.json`
**Issue:** the VUE lens asks that every `VITE_*` variable the build reads appears in `.env.example`.
`.env.example` listed only `VITE_DOCS_URL` and `VITE_DEV_URL`; the tool views read the other
variables, documented only as `ARG`s in the Dockerfile. `VITE_RPC_TESTNET|MAINNET` and
`VITE_ACCESS_GATE_ID_MAINNET` are declared as build args but the workflows never pass them (they
resolve to empty); `.env.production` commits `VITE_FEE_TREASURY_*` (public addresses) with a comment
naming the retired package `@meddleware/token-deployer-sui`, and they are not build args. `CLAUDE.md`
said `@mysten/sui` was "pinned exactly (`2.33.2`)" (it was `^2.33.2`), and `package.json` `files` listed
a `CHANGELOG.md` that did not exist. The two registry-mirror builds also lacked
`VITE_WALRUS_RELAY_MAINNET`, so the mirror could carry a different bundle from the public image.
**Impact:** documentation drift only; no variable is a secret (F4) and none selects an on-chain ID
that is not also set in the embedded client's `deployments`.
**Remediation / evidence:** `.env.example` lists every build input with its purpose (the unset
`VITE_RPC_*` and `VITE_ACCESS_GATE_ID_MAINNET` are kept as documented operator/mainnet inputs, marked as not
passed by the release); `.env.production` names `@meddleware/token-deployer-ui`; `CLAUDE.md` states the
`^2.36.0` range; `CHANGELOG.md` exists; `SECURITY.md` names the Treasury and Token Deployer views; the four
image builds pass one set of build arguments. `tests/build-inputs.test.ts` pins it: every Dockerfile `ARG`
is baked and documented in `.env.example`, every variable the shell reads is documented, all four
`build-args` blocks are identical and name only declared arguments, and both base images are digest-pinned.

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

### F18 — Access-gate price configured at build time (superseded: read from the chain)

**Severity:** Info   **Disposition:** RESOLVED (0.1.85, commit pending)
**Where:** `Dockerfile`, `.github/workflows/docker-publish.yml`, `.env.example`, `CLAUDE.md`
**Issue:** the image accepted `VITE_ACCESS_GATE_PRICE_MIST_TESTNET`, a price the embedded tools used to
show and sign for. `@meddleware/walrus-relay` 0.1.31 reads the price from the gate on the chain (and shows
payees, network and pass kind before the wallet opens); `walrus-ui` 0.1.58 and `token-deployer-ui` 0.0.36 no
longer read the variable.
**Impact:** a stale build value could not be trusted and no longer affected the tools; leaving it would
suggest a price is configured here.
**Remediation / evidence:** the variable is removed from the Dockerfile, the four `build-args` blocks, the
docs and `.env.example`; the tools are embedded at walrus-ui ^0.1.58, token-deployer-ui ^0.0.36 and
access-gate-ui ^0.1.37 (clients: walrus-client 0.0.28, access-gate-client 0.0.9, seal-client 0.0.20,
sui-token-client 0.0.11; walrus-relay 0.1.31). `tests/build-inputs.test.ts` fails if `PRICE_MIST` returns to
any of those files. Maintainer: the repository variable `VITE_ACCESS_GATE_PRICE_MIST_TESTNET` (set 2026-09-29)
is now unused and can be deleted. The gate id and soulbound variables still select the gate; with the
production values (`0x316f1bf9…faddc`, soulbound) built in, the Walrus tab mounts with no console warning
(the tools log one when the gate config is rejected).

### F19 — Signature check failed on the npm bundled with Node 24.13

**Severity:** Low   **Disposition:** RESOLVED (0.1.85, commit pending)
**Where:** `.github/workflows/node-ci.yml`
**Issue:** `npm audit signatures` with npm 11.6.2 (the npm of Node 24.13) fails with `EMISSINGSIGNATUREKEY`
("has attestations but no corresponding public key(s) can be found") on `@meddleware/token-deployer-ui`
0.0.36, whose attestation was published with the newer client. npm 11.20.0 (the client the publish job
pins) verifies the same tree: 430 packages with verified signatures, 185 with verified attestations.
**Impact:** the release gate (F9, F10) could fail for a tree that is in fact valid, or a gate that cannot
read current attestations would tempt a bypass.
**Remediation / evidence:** CI installs npm 11.20.0 before the install and the signature step;
`tests/workflows.test.ts` pins that the upgrade precedes `npm audit signatures`. Verified locally with
`npx npm@11.20.0 audit signatures` on 2026-10-18.

### F20 — No automated check that the built shell mounts every tool

**Severity:** Low   **Disposition:** RESOLVED (0.1.85, commit pending)
**Where:** `e2e/routes.spec.ts`, `tests/`
**Issue:** the shell had no tests (C.1 grade C); a tool that throws on import or mount after a dependency
bump (as the walrus-relay 0.1.31 gate contract could) was found only in a manual sweep.
**Impact:** a broken tool route could be released.
**Remediation / evidence:** `npm run test:e2e` (Playwright, Chromium) builds the app, serves it with
`vite preview`, refuses every request that leaves localhost and asserts that `/` shows Treasury, that each
of the four tabs of `/blockchain` shows its tool body, that the four legacy paths land on `/blockchain` and
that no uncaught page error occurs (3 tests, PASS 2026-10-18). `npm test` (vitest, 65 tests, 6 files) pins the
route table and lazy tool imports, the network selector's mainnet guard (I7), design-token use, the build
inputs, the inline-script check and the release-gate workflows. Both run in `node-ci.yml`.

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | One wallet connection, requested with the tools' superset of features | `App.vue` `useWallet` | source | HOLDS (by design) |
| I2 | Tools are first-party components from npm, never iframes | `router/index.ts`, `BlockchainView.vue` | `tests/router.test.ts`; `e2e/routes.spec.ts` | HOLDS |
| I3 | No transaction construction or accounting in the shell | source | `suiBoundary` trial (B8) | HOLDS |
| I4 | One copy of `@mysten/sui` and of each `@meddleware/*` package | lockfile | `npm ls`, `find node_modules` (2026-10-18) | HOLDS |
| I5 | No HTML sinks; no secrets | source; Dockerfile | grep | HOLDS (F4, F5) |
| I6 | Installed packages carry valid registry signatures | `npm audit signatures` | CI | HOLDS (F9) |
| I7 | Mainnet cannot be selected before launch | `NetworkSelector` disables the mainnet option and resets mainnet to testnet once connected | `tests/network-selector.test.ts` | HOLDS |
| I8 | A release cannot ship what CI refuses, and the image is scanned before it is signed | `docker-publish.yml` `verify` → `node-ci.yml`; Trivy step before `cosign sign` | workflow files; run `v0.1.84` | HOLDS (F10) |
| I9 | The served page carries CSP and HSTS and no inline script outside the response nonce | Dockerfile `CSP`; Cloudflare zone HSTS | `curl -I` 2026-10-09; `check:dist`; `scripts/smoke.sh` | HOLDS (F12, F13, F14) |

### Lens categories

| Lens | Category | Status |
| --- | --- | --- |
| TS | Supply chain | HOLDS — audit gate, signatures (F9), no unused runtime deps (F8) |
| TS | Compiler strictness | `strict: true`; `noUncheckedIndexedAccess` off — the shell parses no untrusted data (status parsing is ui's, `parseSnapshot`) |
| TS | Network I/O, dynamic code, secrets | N/A in the shell — no `fetch`, `eval` or dynamic `import()` of a non-literal (the tool imports are literals) |
| TS | Packaging (B.TS-1/2) | HOLDS — `files` whitelist, `npm pack --dry-run` lists 13 files (sources, `index.html`, configs, `CHANGELOG.md`), no `.env*`; no lifecycle scripts, no `overrides` (F1) |
| VUE | Untrusted rendering | HOLDS (F5) |
| VUE | Colour & links | through ui/design-tokens (contrast gate in their audits); the shell adds only brand and sidebar styles |
| VUE | Build-time configuration | HOLDS - no secrets (F4); the inventory is `.env.example`, pinned by `tests/build-inputs.test.ts` (F16, F18) |
| VUE | Test hooks (Vite) | N/A — no test mode, mock wallet or `window.__*` hook exists; no `MODE` branch in `src/` |
| VUE | Signing UX | N/A — the shell builds no transactions; signing flows are in the tools |
| VUE | Shared-wallet state | HOLDS — the tools follow account and network changes (their audits); one wallet-adapter 0.0.17 copy |
| VUE | Lazy boundaries | HOLDS — every tool view is a lazy chunk; Walrus wasm loads on first use |
| VUE | Browser storage | through ui (colour mode) and wallet-adapter (network), both non-throwing |
| VUE | Dual app / library | N/A — host only |
| VUE | Hosting headers (B.VUE-1) | HOLDS with F12 (ACCEPTED-RISK `https:`); the inline-script check is `check:dist` (F13); the probe asserts the headers (F14) |
| IMG | Base images, build context, reproducible build | HOLDS — `node:24-slim` and static-server 0.1.8 digest-pinned; `.dockerignore` excludes `.env*.local`; `npm ci`; the committed `.env.production` is deliberate (F16) |
| IMG | No secrets in layers | HOLDS — build args are public `VITE_*` values and `CSP` |
| IMG | Runtime user & filesystem | HOLDS — `USER 65534:65534`; pod hardened, `automountServiceAccountToken: false` (F11) |
| IMG | SBOM & notices, scan before sign | HOLDS — lockfile in image, `/THIRD_PARTY_LICENSES`, Trivy before cosign (F10) |
| IMG | Verification command, deployment pinning | HOLDS — `verify-digests.sh` pins issuer and repository identity (F17); overlay pins the digest from `config/images.yaml` |
| IMG | Config scan and container probe in CI | HOLDS - `image` job (build, `scripts/smoke.sh`) and Trivy `scan` job (F14); the Trivy job has its first run on the 0.1.85 push |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| walrus-ui / seal-ui / access-gate-ui / token-deployer-ui / treasury-ui | `^0.1.58` / `^0.0.38` / `^0.1.37` / `^0.0.36` / `^0.0.18` (locked at the same versions) | each tool | clean 2026-10-18 | the 2026-10-18 builds (walrus-relay 0.1.31; clients walrus-client 0.0.28, access-gate-client 0.0.9, seal-client 0.0.20, sui-token-client 0.0.11) |
| dao-ui | `^0.1.34` | none (route disabled) | clean | retained for re-enabling; not bundled |
| `@meddleware/wallet-adapter` | `^0.0.17` | wallet | clean | the one copy |
| `@meddleware/ui` / `design-tokens` | `^0.1.31` / `^0.1.10` | shell | clean | |
| `@meddleware/eslint-config` (dev) | `^0.0.2` | CI | clean | `suiBoundary()` |
| `@mysten/sui` | `^2.36.0` (2.36.0) | everything | clean | one copy; the tools declare the same range |
| `vue` / `vue-router` / `vite` / `@vitejs/plugin-vue` / `typescript` | `^3.5.44` / `^5.4.0` / `^8.3.4` / `^6.0.10` / `~6.0.0` | build and runtime | clean | TypeScript 7 deferred (decision); vitest 5.0 and Playwright 1.63 (dev) |
| Base images | `node:24-slim@sha256:0e0ff40c…`, `static-server:0.1.8@sha256:e32cf42b…` | runtime: static-server serves the bundle | Trivy on the published image (release) and on the repository (CI), CRITICAL/HIGH fixable fail | static-server 0.1.8 |
| Embedded-tool dependency tree | 453 locked packages (127 production) | — | `npm audit --omit=dev`: 0; allowlist: `braces` GHSA-vfj7-8cjw-p6xm (dev tooling, expires 2027-01-01) | signatures 430, attestations 185 (npm 11.20.0) |

### B.2 Publish authority, capabilities & secret custody

| Authority / secret | Where held | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub Actions (`npm-publish.yml`, `NPM_PUBLISH=true`) | OIDC trusted publishing + provenance; npm client pinned 11.20.0; idempotent | library | n/a; token-publishing lockdown is the maintainer's (F17, OQ3) |
| `QUAY_TOKEN`, `DOCKERHUB_TOKEN` (+ usernames) | GitHub secrets (set 2026-09-02) | robot accounts | image push | scope and rotation to be recorded (F17) |
| image signing, SBOM and provenance attestations | GitHub Actions (`merge-docker-public`) | cosign keyless; SPDX SBOM attestation; build provenance, pushed to the registry; no `continue-on-error` on the public path | images (index digest) | n/a |
| self-hosted registry mirror | `*-private` jobs | `PRIVATE_REGISTRY_*` not set; `continue-on-error`, unsigned | none (best-effort) | maintainer item |
| Workflow hygiene | `.github/workflows/*` | Actions pinned by full SHA; `permissions:` per workflow and job (`id-token`/`attestations: write` only on the merge job and the npm publish job); release gate = `node-ci.yml` via `workflow_call` (Docker and npm, F15); CI pins npm 11.20.0 for the signature step (F19); Dependabot weekly, grouped (npm, docker, github-actions) | all | n/a |

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — B (65 unit tests, 3 browser tests, 2026-10-18)

Count at 2026-10-18: vitest 5.0.5 (jsdom), 6 files, 65 tests: `router.test.ts` (route table, redirects,
no DAO route, lazy components, the four tool imports, no iframe), `network-selector.test.ts` (I7: mainnet
disabled, reset on mount, written to the singleton), `design-tokens-used.test.ts` (no `--warning` text
colour, every custom property exists; design-tokens F10), `build-inputs.test.ts` (the Dockerfile / `.env.example` /
build-args inventory, F16, F18), `inline-scripts.test.ts` (F13) and `workflows.test.ts` (the release gate,
F10, F14, F15, F19). Playwright 1.63 (Chromium), 3 tests in `e2e/routes.spec.ts` against the built app with
every external request refused: Treasury at `/`, the four tool tabs of `/blockchain`, the legacy redirects;
no uncaught page error. CI runs both on every push and on the release, together with `vue-tsc --noEmit`,
stylelint, eslint (vue-a11y and `suiBoundary()`), html-validate, the production build, `check:dist`, the audit
gate, `npm audit signatures`, the licence check, the image build and probe and the Trivy scan. The tools
carry their own tests; the shell is also exercised by the live sweep and the gated `e2e:walrus` run
(token-deployer-ui repository, `scripts/e2e-walrus-browser.mjs`) against the production dashboard. No axe
run of the shell and no production-artifact scan for test hooks exist here because there are no test hooks
(B.VUE-2).

| Dimension | Assessment |
| --- | --- |
| Happy-path coverage | covered - every route and tool tab mounts per commit; signing flows are the tools' (live sweep, `e2e:walrus`) |
| Error-path / failure-mode coverage | the shell has none of its own; the retired paths and an unknown route are covered; the tools cover theirs |
| Boundary / edge-case coverage | the network selector's mainnet reset; inline-script shapes (script with body, handler attributes) |
| Security-relevant coverage | `suiBoundary()`, audit gate, signatures, the mainnet guard, the CSP/inline-script check and the container probe |

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Build, lint, type-check, licences, unit tests, the browser smoke test (no network), the image probe | yes | — | CI |
| Tool flows through the shared wallet | no | testnet | `e2e:walrus` and the paywall e2e (maintainer, with the key); Chromium sweep. Paywall e2e PASS against the live dashboard 2026-10-09 (pass bought on gate `0x316f1bf9…`, consumed, upload through the Worker) |
| Served headers, `/THIRD_PARTY_LICENSES`, non-root pod | no | live deployment | manual `curl -I` 2026-10-09 against the deployment; `scripts/smoke.sh` asserts the same headers on the built image per commit (F14); `verify-digests.sh` |

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
- [x] audit gate in CI and publish; `npm pack` contents verified (13 files); no install-time code (TS B.TS-2)
- [x] `SECURITY.md` present (F7)
- [x] release gate equals CI for the image (F10) and for the npm package (F15, 0.1.85, `verify` calls `node-ci.yml`)
- [x] config scan and container probe in CI (F14, 0.1.85) — `image` job + `scripts/smoke.sh`, Trivy `scan` job; first CI run pending the push

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
  access-gate-client `deployments` export. Embedded access-gate-client 0.0.9 and seal-client 0.0.20
  (one copy of each in the bundle).

## Normative requirements (MUST / MUST NOT)

- **TS-M1–TS-M8** — hold (TS-M2–M6 are N/A in a shell that parses and fetches nothing; TS-M7:
  whitelist and no install scripts; TS-M8: `npm ci`, audit gate, ADR-0001 baseline).
- **VUE-M1–VUE-M9** — hold where applicable; VUE-M3 and VUE-M4 are N/A (no test mode, no signing in
  the shell); VUE-M8 holds with the broad `https:` sources recorded in F12.
- **IMG-M1–IMG-M8** — hold (M7 and M8 per F10; the verification command is repository-anchored, F17).
  The CI config scan and container probe implied by Section C are in CI (F14).
- The release MUST keep calling the full CI before building (F10), and MUST scan before signing.
- `connect-src` MUST be enumerated before mainnet if the endpoint set is fixed by then (F12).

## Implementation suggestions (SHOULD / MAY)

- (Done in 0.1.85: the inline-script check (F13), the Trivy scan and container probe (F14), the npm
  `verify` job calling `node-ci.yml` (F15) and the `.env.example` inventory with the doc fixes (F16).)
- MAY drop the retained `@meddleware/dao-ui` dependency until governance returns (it is not bundled,
  but every release has to keep it current).
- MAY add an axe contrast run over the shell's own screens (the shared components are covered by the ui gallery; the tools by their audits).

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
- 2026-10-18 — fix wave, 0.1.85 (commit pending): embeds the 2026-10-18 builds of every tool
  (walrus-ui 0.1.58, token-deployer-ui 0.0.36, access-gate-ui 0.1.37, seal-ui 0.0.38, treasury-ui 0.0.18,
  dao-ui 0.1.34 retained; walrus-relay 0.1.31, walrus-client 0.0.28, access-gate-client 0.0.9,
  seal-client 0.0.20, sui-token-client 0.0.11, design-tokens 0.1.10, `@mysten/sui` 2.36.0), static-server
  0.1.8 (`sha256:e32cf42b…4000`, read from quay.io 2026-10-18). F13, F14, F15, F16 RESOLVED (inline-script
  guard; image build and probe plus Trivy scan; npm `verify` calls `node-ci.yml`; build-input inventory);
  F18 (price variable removed), F19 (npm 11.20.0 for the signature step) and F20 (unit and browser tests)
  added RESOLVED. Section C regraded B; Section D F14 box ticked. F12 stays ACCEPTED-RISK (the
  endpoint set is not fixed); F17 and the open Section D boxes stay maintainer-only or mainnet-blocked. The
  embedded tools take no props; their configuration is build-time `VITE_*`, checked against each tool's
  CHANGELOG (no other variable changed). Checks: type-check, lint (css, js, html), 65 unit tests, 3 browser
  tests, build, `check:dist`, `check:licenses`, audit gate, `npm audit signatures` (npm 11.20.0), image
  build and `scripts/smoke.sh` (rootless podman). The first CI run of the `image` and `scan` jobs happens
  on the push.
