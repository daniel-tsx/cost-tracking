/**
 * Generate raster brand assets (favicon.ico, Apple/PWA icons, OG image) from the
 * canonical CostTracker "margin gauge" mark.
 *
 * The SVG sources of truth are committed (src/app/icon.svg, public/logo.svg,
 * public/brand/*.svg, src/components/logo.tsx). This script only rasterizes — the
 * mark geometry below must stay in sync with those (it is the same path + node).
 *
 * Run:  node scripts/generate-brand-assets.mjs
 * Deps: @resvg/resvg-js, png-to-ico  (devDependencies)
 */
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const require = createRequire(import.meta.url)
const pngToIco = require('png-to-ico').default

const VIOLET = '#6D3DE0'
const root = fileURLToPath(new URL('..', import.meta.url))
const p = (rel) => join(root, rel)

// Canonical mark — keep in sync with src/components/logo.tsx
const mark = (color) =>
  `<path d="M 22.42 23.13 A 9.6 9.6 0 1 1 21.7 9.9" fill="none" stroke="${color}" stroke-width="3.8" stroke-linecap="round"/>` +
  `<circle cx="23.6" cy="7.7" r="2.9" fill="${color}"/>`

const svgDoc = (body, vb = '0 0 32 32') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`

// Rounded violet chip (matches src/app/icon.svg) — for favicon.ico
const chip = (scale = 0.74) =>
  svgDoc(
    `<rect width="32" height="32" rx="7" fill="${VIOLET}"/>` +
      `<g transform="translate(16 16) scale(${scale}) translate(-16 -16)">${mark('#fff')}</g>`
  )

// Full-bleed violet square (no own rounding) — for Apple (iOS masks it) + PWA maskable
const fullBleed = (scale = 0.64) =>
  svgDoc(
    `<rect width="32" height="32" fill="${VIOLET}"/>` +
      `<g transform="translate(16 16) scale(${scale}) translate(-16 -16)">${mark('#fff')}</g>`
  )

const png = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()

function write(rel, buf) {
  const out = p(rel)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, buf)
  console.log('  •', rel, `(${(buf.length / 1024).toFixed(1)} KB)`)
}

console.log('Generating CostTracker brand raster assets…')

// favicon.ico — 16/32/48 from the rounded chip
const icoBuf = await pngToIco([16, 32, 48].map((s) => png(chip(), s)))
write('src/app/favicon.ico', icoBuf)

// Standalone PNG favicon exports (the .ico already embeds these; provided for
// reuse / legacy <link> tags — not wired into metadata to avoid duplicate links)
write('public/icons/favicon-16x16.png', png(chip(), 16))
write('public/icons/favicon-32x32.png', png(chip(), 32))

// Apple touch icon — full-bleed, iOS applies its own corner mask
write('src/app/apple-icon.png', png(fullBleed(0.66), 180))

// PWA / manifest icons — full-bleed so they double as maskable
write('public/icons/icon-192.png', png(fullBleed(0.6), 192))
write('public/icons/icon-512.png', png(fullBleed(0.6), 512))

// Open Graph image — 1200×630, dark brand surface, no gradient
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#19171d"/>
  <rect x="0.5" y="0.5" width="1199" height="629" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>
  <rect x="96" y="232" width="6" height="166" rx="3" fill="#8B5CF6"/>
  <g transform="translate(150 232) scale(4.6)">
    <path d="M 22.42 23.13 A 9.6 9.6 0 1 1 21.7 9.9" fill="none" stroke="#8B5CF6" stroke-width="3.8" stroke-linecap="round"/>
    <circle cx="23.6" cy="7.7" r="2.9" fill="#8B5CF6"/>
  </g>
  <text x="332" y="312" font-family="'DM Sans','Segoe UI',system-ui,sans-serif" font-size="42" font-weight="600" letter-spacing="6" fill="#8B5CF6">COST &#183; PROFIT &#183; MARGIN</text>
  <text x="330" y="392" font-family="'DM Sans','Segoe UI',system-ui,sans-serif" font-size="90" font-weight="800" letter-spacing="-3" fill="#fafafa">CostTracker</text>
  <text x="334" y="446" font-family="'DM Sans','Segoe UI',system-ui,sans-serif" font-size="30" font-weight="500" letter-spacing="-0.2" fill="#a1a1aa">Track cost, revenue &amp; profit margin — month over month.</text>
</svg>`
write('src/app/opengraph-image.png', png(og, 1200))

console.log('Done.')
