# ── build stage ───────────────────────────────────────────────────────────────
# Standalone build — the Docker context is this repo root. All @meddleware/*
# dependencies resolve from the npm registry; repos/ui must be published at
# ^0.1.3 before building this image.
#
#   docker build -t dashboard:<tag> .
FROM node:22-slim AS build

WORKDIR /app

COPY package.json ./

RUN npm install

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
ARG VITE_ACCESS_GATE_PRICE_MIST_TESTNET
ARG VITE_ACCESS_GATE_ID_MAINNET
ARG VITE_UPLOAD_RELAY_MAX_TIP_MIST

ENV VITE_NETWORK=${VITE_NETWORK} \
    VITE_WALRUS_RELAY_TESTNET=${VITE_WALRUS_RELAY_TESTNET} \
    VITE_WALRUS_RELAY_MAINNET=${VITE_WALRUS_RELAY_MAINNET} \
    VITE_RPC_TESTNET=${VITE_RPC_TESTNET} \
    VITE_RPC_MAINNET=${VITE_RPC_MAINNET} \
    VITE_ACCESS_GATE_ID_TESTNET=${VITE_ACCESS_GATE_ID_TESTNET} \
    VITE_ACCESS_GATE_SOULBOUND_TESTNET=${VITE_ACCESS_GATE_SOULBOUND_TESTNET} \
    VITE_ACCESS_GATE_PRICE_MIST_TESTNET=${VITE_ACCESS_GATE_PRICE_MIST_TESTNET} \
    VITE_ACCESS_GATE_ID_MAINNET=${VITE_ACCESS_GATE_ID_MAINNET} \
    VITE_UPLOAD_RELAY_MAX_TIP_MIST=${VITE_UPLOAD_RELAY_MAX_TIP_MIST}

RUN npm run build

# ── runtime stage ─────────────────────────────────────────────────────────────
# static-server is a minimal Go binary image. SPA_FALLBACK serves index.html
# for any extensionless path (Vue Router history mode).
FROM quay.io/meddleware-org/static-server:0.1.0

COPY --from=build /app/dist /app/public

ENV SERVE_DIR=/app/public \
    SPA_FALLBACK=true \
    CACHE_IMMUTABLE_PREFIX=/assets/

EXPOSE 8080
