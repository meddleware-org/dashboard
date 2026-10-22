# ── build stage ───────────────────────────────────────────────────────────────
# Standalone build — the Docker context is this repo root. All @meddleware/*
# dependencies resolve from the npm registry; repos/ui must be published at
# ^0.1.3 before building this image.
#
#   docker build -t dashboard:<tag> .
# Content-Security-Policy served by static-server (verified 2026-09-30: production build loaded in
# Chromium under this policy with zero violations). script-src stays 'self' plus 'wasm-unsafe-eval' (Walrus / Move bytecode WebAssembly); connect-src allows
# any https origin because RPC, relay, aggregator and Seal key-server hosts are partly operator- or
# chain-configured; img-src allows https:/data:/blob: for on-chain images and local previews.
ARG CSP="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests"

FROM node:26-slim@sha256:0d1e33586362bb9e608c4e751e7a9e7edb55c9ac11461ed5666af696cc461dd4 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# These VITE_* vars are baked into the static bundle at build time.
# Pass via --build-arg; unset vars resolve to empty string (ungated fallback).
ARG VITE_NETWORK=testnet
ARG VITE_WALRUS_RELAY_TESTNET
ARG VITE_WALRUS_RELAY_MAINNET
ARG VITE_RPC_TESTNET
ARG VITE_RPC_MAINNET
ARG VITE_ACCESS_GATE_ID_TESTNET
ARG VITE_ACCESS_GATE_SOULBOUND_TESTNET
ARG VITE_ACCESS_GATE_ID_MAINNET
ARG VITE_UPLOAD_RELAY_MAX_TIP_MIST
# Read-indexer base URL for the embedded history views (optional; display data, falls back to the
# full node).
ARG VITE_INDEXER_URL

ENV VITE_NETWORK=${VITE_NETWORK} \
    VITE_WALRUS_RELAY_TESTNET=${VITE_WALRUS_RELAY_TESTNET} \
    VITE_WALRUS_RELAY_MAINNET=${VITE_WALRUS_RELAY_MAINNET} \
    VITE_RPC_TESTNET=${VITE_RPC_TESTNET} \
    VITE_RPC_MAINNET=${VITE_RPC_MAINNET} \
    VITE_ACCESS_GATE_ID_TESTNET=${VITE_ACCESS_GATE_ID_TESTNET} \
    VITE_ACCESS_GATE_SOULBOUND_TESTNET=${VITE_ACCESS_GATE_SOULBOUND_TESTNET} \
    VITE_ACCESS_GATE_ID_MAINNET=${VITE_ACCESS_GATE_ID_MAINNET} \
    VITE_UPLOAD_RELAY_MAX_TIP_MIST=${VITE_UPLOAD_RELAY_MAX_TIP_MIST} \
    VITE_INDEXER_URL=${VITE_INDEXER_URL}

# The CSP has no 'unsafe-inline' for scripts: the build fails if dist/ ever carries an inline <script>.
RUN npm run build && npm run check:dist && npm run licenses

# ── runtime stage ─────────────────────────────────────────────────────────────
# static-server is a minimal Go binary image. SPA_FALLBACK serves index.html
# for any extensionless path (Vue Router history mode).
FROM quay.io/meddleware-org/static-server:0.1.11@sha256:94685b948d5086ccdb5b0b5d3b7caef6f2e3d1e4b9f7f8a311e9f26950da3723
ARG CSP
ENV CONTENT_SECURITY_POLICY="${CSP}"

COPY --from=build /app/dist /app/public
# The lockfile lets SBOM scanners see the npm packages the bundle was built from (the bundle itself carries no
# package metadata). It sits outside the served directory; THIRD_PARTY_LICENSES is served with the site.
COPY --from=build /app/package-lock.json /usr/share/doc/dashboard/package-lock.json

ENV SERVE_DIR=/app/public \
    SPA_FALLBACK=true \
    CACHE_IMMUTABLE_PREFIX=/assets/

# The base image already runs as nobody; say so here too so the Dockerfile is self-describing.
USER 65534:65534

EXPOSE 8080
