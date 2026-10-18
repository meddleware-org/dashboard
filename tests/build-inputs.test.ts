// The dashboard bakes build-time configuration into a public bundle. This pins the inventory (audit F16):
// every VITE_* the Dockerfile accepts is documented in .env.example, every variable the shell reads is
// accepted, the four release builds pass one and the same set, and a variable an embedded tool no longer
// reads (the access-gate price, read from the chain since walrus-relay 0.1.31) is gone everywhere.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

const dockerfile = read('Dockerfile')
const envExample = read('.env.example')
const workflow = read('.github/workflows/docker-publish.yml')

const set = (xs: Iterable<string>) => [...new Set(xs)].sort()
const viteNames = (text: string) => set([...text.matchAll(/\bVITE_[A-Z0-9_]+/g)].map((m) => m[0]))

const dockerArgs = set([...dockerfile.matchAll(/^ARG (VITE_[A-Z0-9_]+)/gm)].map((m) => m[1]!))
const dockerEnv = set([...dockerfile.matchAll(/^(?:ENV |\s+)(VITE_[A-Z0-9_]+)=\$\{/gm)].map((m) => m[1]!))

/** The build-args block of each `docker/build-push-action` step, as a sorted list of names. */
const buildArgBlocks = [...workflow.matchAll(/build-args: \|\n((?:[ ]+\S.*\n?)+)/g)].map((m) => viteNames(m[1]!))

function sourceText(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .map((e) => (e.isDirectory() ? sourceText(join(dir, e.name)) : readFileSync(join(dir, e.name), 'utf8')))
    .join('\n')
}

describe('Dockerfile build inputs', () => {
  it('declares VITE_NETWORK and the relay, gate and indexer values', () => {
    expect(dockerArgs).toEqual(expect.arrayContaining([
      'VITE_NETWORK',
      'VITE_WALRUS_RELAY_TESTNET',
      'VITE_ACCESS_GATE_ID_TESTNET',
      'VITE_INDEXER_URL',
    ]))
  })

  it('bakes exactly the arguments it declares', () => {
    expect(dockerEnv).toEqual(dockerArgs)
  })

  it('documents every build argument in .env.example', () => {
    expect(dockerArgs.filter((name) => !viteNames(envExample).includes(name))).toEqual([])
  })

  it('accepts every VITE_* variable the shell itself reads, and documents it', () => {
    const own = viteNames(sourceText(join(root, 'src')))
    expect(own).toEqual(expect.arrayContaining(['VITE_DOCS_URL', 'VITE_DEV_URL']))
    // VITE_DOCS_URL / VITE_DEV_URL are shell-only (not Docker build args): they appear in .env.example.
    expect(own.filter((name) => !viteNames(envExample).includes(name))).toEqual([])
  })

  it('pins both base images by digest', () => {
    const from = [...dockerfile.matchAll(/^FROM (\S+)/gm)].map((m) => m[1]!)
    expect(from).toHaveLength(2)
    for (const image of from) expect(image).toMatch(/@sha256:[0-9a-f]{64}$/)
  })
})

describe('release build arguments', () => {
  it('has a build-args block for each of the four image builds', () => {
    expect(buildArgBlocks).toHaveLength(4)
  })

  it('passes the same set to every build (the registry mirrors carry the same bundle)', () => {
    for (const block of buildArgBlocks) expect(block).toEqual(buildArgBlocks[0])
  })

  it('passes only arguments the Dockerfile declares', () => {
    for (const block of buildArgBlocks) expect(block.filter((name) => !dockerArgs.includes(name))).toEqual([])
  })
})

describe('the access-gate price is read from the chain, not configured', () => {
  const files = [
    'Dockerfile',
    '.env.example',
    '.env.production',
    '.github/workflows/docker-publish.yml',
    '.github/workflows/node-ci.yml',
    '.github/workflows/npm-publish.yml',
    'CLAUDE.md',
    'AGENTS.md',
    'SECURITY.md',
  ]

  it.each(files)('%s names no VITE_ACCESS_GATE_PRICE_MIST_*', (file) => {
    expect(read(file)).not.toMatch(/PRICE_MIST/)
  })
})
