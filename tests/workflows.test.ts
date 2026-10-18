// Release-gate contract (audit F10, F13, F14, F15): both release workflows run exactly what CI runs, CI runs
// every check this repository has, and the image build refuses an inline script. A check removed from CI
// (or a release path that skips it) fails here.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

const ci = read('.github/workflows/node-ci.yml')
const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts

describe('CI (node-ci.yml)', () => {
  it('is callable by the release workflows', () => {
    expect(ci).toMatch(/workflow_call:/)
  })

  it.each([
    'node .github/audit-gate.mjs',
    'npm audit signatures',
    'npm run type-check',
    'npm run lint:css',
    'npm run lint:js',
    'npm run lint:html',
    'npm test',
    'npm run build',
    'npm run check:dist',
    'npm run check:licenses',
    'npm run test:e2e',
    'bash scripts/smoke.sh',
    'scan-type: fs',
  ])('runs %s', (step) => {
    expect(ci).toContain(step)
  })

  it('runs every script it names (no --if-present on a script that exists)', () => {
    for (const [, name] of ci.matchAll(/npm run ([\w:-]+)/g)) expect(scripts, name).toHaveProperty(name!)
    expect(ci).not.toContain('--if-present')
  })

  it('verifies signatures with an npm client that can read current attestations', () => {
    const upgrade = ci.indexOf('npm install -g npm@11.20.0')
    expect(upgrade).toBeGreaterThan(-1)
    expect(upgrade).toBeLessThan(ci.indexOf('npm audit signatures'))
  })

  it('pins every third-party action by full commit SHA', () => {
    const uses = [...ci.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]!)
    expect(uses.length).toBeGreaterThan(0)
    for (const u of uses) expect(u).toMatch(/@[0-9a-f]{40}$/)
  })
})

describe('release workflows', () => {
  it.each(['.github/workflows/docker-publish.yml', '.github/workflows/npm-publish.yml'])(
    '%s runs the full CI workflow before anything is built or published',
    (file) => {
      const text = read(file)
      expect(text).toMatch(/verify:\n(?:\s+.*\n)*?\s+uses: \.\/\.github\/workflows\/node-ci\.yml/)
    },
  )
})

describe('Dockerfile', () => {
  it('fails the image build on an inline script', () => {
    expect(read('Dockerfile')).toMatch(/RUN npm run build && npm run check:dist/)
  })

  it('runs as the unprivileged user', () => {
    expect(read('Dockerfile')).toMatch(/^USER 65534:65534$/m)
  })
})
