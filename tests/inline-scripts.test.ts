// F13: the build fails on an inline script the CSP would refuse; the check must flag the real shapes and
// pass the page Vite emits.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error - plain .mjs build script without declarations
import { inlineScripts } from '../scripts/check-inline-scripts.mjs'

const find = inlineScripts as (html: string) => string[]

describe('inlineScripts', () => {
  it('passes the Vite page shape (a module script with src, preloads, stylesheet)', () => {
    const html = `<head><script type="module" crossorigin src="/assets/index-abc.js"></script>
      <link rel="modulepreload" href="/assets/x.js"><link rel="stylesheet" href="/assets/i.css"></head>`
    expect(find(html)).toEqual([])
  })

  it('flags an inline script', () => {
    expect(find('<script>window.__x = 1</script>')).toHaveLength(1)
    expect(find('<script type="module">import("/a.js")</script>')).toHaveLength(1)
    expect(find('<SCRIPT\n>alert(1)</SCRIPT >')).toHaveLength(1)
  })

  it('flags a script that has both a src and a body', () => {
    expect(find('<script src="/a.js">alert(1)</script>')).toHaveLength(1)
  })

  it('flags an inline event-handler attribute', () => {
    expect(find('<body onload="boot()">')).toHaveLength(1)
    expect(find('<a href="/x" onclick = "go()">x</a>')).toHaveLength(1)
  })

  it('does not flag attribute values or text that merely contain "on"', () => {
    expect(find('<a href="/x" data-note="log on">Log on</a><button type="button">one</button>')).toEqual([])
  })

  it('passes the source index.html', () => {
    expect(find(readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8'))).toEqual([])
  })
})
