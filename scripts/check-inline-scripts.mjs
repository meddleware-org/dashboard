// Build-time CSP guard (audit F13): the served policy has no `script-src 'unsafe-inline'`, so an inline
// <script> in the built page would be refused by the browser. This fails the build first, with the
// offending tag, instead of leaving it to a browser sweep. An inline event-handler attribute
// (onclick=...) is refused by the same policy and is reported too.
//
//   node scripts/check-inline-scripts.mjs [dist/index.html ...]
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi
const HANDLER = /<[a-z][^>]*\son[a-z]+\s*=/gi

/** The inline scripts and event-handler attributes in an HTML document (empty when it is CSP-clean). */
export function inlineScripts(html) {
  const found = []
  for (const [tag, attrs] of html.matchAll(SCRIPT)) {
    if (!/\bsrc\s*=/i.test(attrs)) found.push(tag.slice(0, 120))
    else if (/\S/.test(tag.replace(/^<script[^>]*>/i, '').replace(/<\/script\s*>$/i, ''))) found.push(tag.slice(0, 120))
  }
  for (const [tag] of html.matchAll(HANDLER)) found.push(tag.slice(0, 120))
  return found
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : [],
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = process.argv.length > 2 ? process.argv.slice(2) : htmlFiles('dist')
  if (files.length === 0) {
    console.error('::error::no HTML found in dist/ - run the build first')
    process.exit(1)
  }
  let failed = false
  for (const file of files) {
    const bad = inlineScripts(readFileSync(file, 'utf8'))
    for (const tag of bad) {
      console.error(`::error file=${file}::inline script or event handler blocked by the CSP: ${tag}`)
      failed = true
    }
  }
  if (failed) process.exit(1)
  console.log(`no inline script in ${files.length} HTML file(s)`)
}
