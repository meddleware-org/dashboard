# Security Policy

## Scope

This policy covers security issues in the `@meddleware/dashboard` application source (`src/**`) —
the tools-hub shell + router that mounts the tool views inline and owns the single shared wallet
connection.

It does not cover:

- The individual tool views (`walrus-ui`, `access-gate-ui`, `seal-ui`, `dao-ui`),
  `@meddleware/wallet-adapter`, or `platform-probe` (see their own policies)
- The wallet extension (which confirms every signature)

## Security model (invariants)

These invariants are load-bearing. A report demonstrating that any is violated is in scope and
treated as high severity:

1. **All mounted tool views are first-party and same-bundle.** Tools render inline as Vue components
   (never cross-origin iframes or remotely-loaded modules). The single shared
   `@meddleware/wallet-adapter` connection gives every mounted view the full signing surface, so no
   untrusted or third-party view may be mounted in this window.
2. **No accounting or authority in JS.** All financial truth is on-chain; the dashboard previews and
   routes only.
3. **No secret is a `VITE_*` value.** The bundle aggregates every tool's build args; none is a
   secret.
4. **The status snapshot renders as text.** The polled `/api/status` snapshot (topology-free from
   `platform-probe`) is never rendered as HTML.

## Supported versions

Only the latest published version receives security fixes.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Report by emailing
**<security@meddleware.co.uk>** with a description, reproduction/PoC if available, and the version or
commit SHA tested. You will receive an acknowledgement within **3 business days** and a resolution
plan within **14 days** for confirmed issues; Critical issues (CVSS ≥ 9.0) are prioritised for
same-day acknowledgement.

## Disclosure

Once a fix is released, a security advisory will be published on the GitHub repository. Reporters may
be credited by name unless they prefer to remain anonymous.
