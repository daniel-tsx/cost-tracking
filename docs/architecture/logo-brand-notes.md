# Logo & Brand Notes

**Status:** current

The CostTracker visual identity — the "margin gauge" mark, the wordmark, the
animated logo, and the favicon / app-icon system. Read this before touching any
brand asset so the mark stays coherent everywhere it appears.

## Chosen direction — the "margin gauge" mark

A single confident **gauge arc** (rounded caps) that climbs from a baseline to a
small **floating reading-head node** at its leading terminal. It reads as a **C**
(Cost / CostTracker) _and_ as an instrument that has just taken a reading.

Why it fits the product:

- CostTracker exists to answer one question — **where does profit margin sit
  between cost and revenue** — and it already answers it with a bespoke
  semicircular **margin-health gauge** on the dashboard (`dashboard-hero.tsx`,
  `M 10 60 A 50 50 0 0 1 110 60`, `pathLength=100`, partial dash-fill). The logo
  is that exact instrument compressed to a glyph: same rounded-cap arc grammar,
  same "reading" idea. The brand mark and the product's signature instrument are
  the same gesture at two scales.
- The detached node echoes the dashboard sparkline's current-value dot — "the
  latest reading." It's the detail that makes the mark an _instrument_ rather
  than a generic letter **C**.
- It keeps the vertical-tick/arc DNA the rest of the app is built on (the `w-1`
  primary **accent-tick** on every section title), so screens still read as one
  family.
- One stroke + one node ⇒ it themes via `currentColor`, survives a 16px favicon,
  and works in one color (mono / OG / print).

### Alternatives explored

Five directions were derived from the domain and scored by an adversarial panel
(product-truth / premium-craft / favicon-practicality):

| Direction | Idea | Why not chosen |
|---|---|---|
| **Margin Span** | Two stepped revenue/cost lines + a violet caliper measuring the gap | Richest "subtraction" story but the thin semantic hairlines mush below ~20px — fragile as a favicon. |
| **Margin Wedge** | Two strokes diverge from one origin; the violet negative space _is_ profit | Strong, ownable silhouette; reduces to a lone tick at small size and can read as a "less-than"/checkmark. |
| **Margin Cap** | Short red cost bar + tall teal revenue bar + violet margin cap | Most literal, but the two-bar silhouette is closest to the bar-chart cliché we're replacing, and the colors muddy at favicon size. |
| **Ledger C** | A C whose mouth is sealed by two stepped terminal ticks | Tidy and family-true, but its meaning is private and it can read as a plain font-C. |
| **Margin Gauge** ✅ | The app's own gauge, opened into a C with a reading-head node | Best product lineage + the only mark that stays crisp and one-color at 16px. **Chosen.** |

The winner grafts the runners-up's product-truth without their fragility: the
**cost → reading climb** and **headroom** (the open mouth) are carried
_structurally_, so the resting mark needs no fragile semantic colors. The mark is
**always brand violet** — deliberately decoupled from the in-app gauge's
data-driven health colors (teal/violet/red), because a brand mark must not change
hue with data.

## Animation concept

On mount the gauge **"takes a reading"**: the arc draws on from the baseline
(`stroke-dashoffset` 100 → 0, ~0.9s ease-out) and the reading-head node pops in
as the sweep arrives (~0.5s, slight overshoot), then rests. The full lockup adds
a 4px wordmark rise. It's a one-shot micro-interaction, not a loop.

Why it's lightweight and tasteful:

- Pure CSS on **one path + one circle** — only `stroke-dashoffset`, `opacity`,
  and `transform: scale/translate`. No filters, blur, gradients, JS, Lottie, GIF,
  or canvas.
- It sweeps **once to a resting state** and stops — it physically cannot read as
  a spinner, and it doesn't make the navbar busy.
- **`prefers-reduced-motion: reduce`** ⇒ no animation; the mark renders at rest.
- **Degrades gracefully**: the resting (visible) state is the base markup, so the
  full mark shows even if CSS never loads. No layout shift (fixed `viewBox`).

## Files

### React components — `src/components/logo.tsx`
- `Logo` — static mark. Defaults to `text-primary`; override color with a
  `text-*` class. Used in the dashboard cockpit hero (dense / repeated context).
- `AnimatedLogo` — the animated mark (self-contained inline `<style>`). Used in
  the **navbar** (`(app)/layout.tsx`) and **auth pages** (`(auth)/layout.tsx`).

### Static SVG assets — `public/`
- `public/logo.svg` — full horizontal lockup, static, theme-adaptive
  (`prefers-color-scheme`). Primary asset; referenced by the README.
- `public/brand/logo-mark.svg` — mark only, violet, theme-adaptive.
- `public/brand/logo-mark-mono.svg` — mark only, single neutral ink (footer /
  one-color surfaces).
- `public/brand/logo-mark-animated.svg` — animated mark (standalone).
- `public/brand/logo-animated.svg` — animated full lockup (standalone).

### Favicon / app icons
- `src/app/icon.svg` — violet rounded **chip** + white mark (modern SVG favicon).
- `src/app/favicon.ico` — 16/32/48 multi-res, generated from the chip.
- `src/app/apple-icon.png` — 180×180 full-bleed (iOS applies its own mask).
- `public/icons/icon-192.png`, `icon-512.png` — PWA / `any maskable`.
- `public/icons/favicon-16x16.png`, `favicon-32x32.png` — standalone PNG
  exports (the `.ico` already embeds these; provided for reuse / legacy `<link>`
  tags, not wired into metadata).
- `src/app/manifest.ts` — web manifest (name, icons, theme color).
- `src/app/opengraph-image.png` — 1200×630 dark brand card.
- Metadata (title template, OG, `metadataBase`, `themeColor`) lives in
  `src/app/layout.tsx`. Next auto-detects `icon.svg` / `favicon.ico` /
  `apple-icon.png` / `opengraph-image.png` / `manifest.ts` by file convention.

### Regeneration — `scripts/generate-brand-assets.mjs`
Rasterizes the icon/OG PNGs + `.ico` from the canonical mark. Run after changing
the mark geometry:

```bash
node scripts/generate-brand-assets.mjs
```

Dev-only deps: `@resvg/resvg-js`, `png-to-ico`. The SVGs are the source of truth;
the geometry in the script must match `src/components/logo.tsx`.

## Usage

| Context | Version |
|---|---|
| Navbar / header | **Animated** mark + Tailwind wordmark |
| Auth (login/signup) | **Animated** mark + wordmark |
| Landing / hero / welcome | Animated, sparingly |
| Dashboard cockpit hero | **Static** `Logo` (dense / repeated) |
| Footer, dense tables, repeated instances | **Static** |
| Favicon / browser tab / app icons | **Static** chip only — never animate |
| Open Graph / social | **Static** OG card |

## Color & background guidance

- One signature hue: **violet `--primary`** — `oklch(0.55 0.22 288)` (light),
  `oklch(0.67 0.20 288)` (dark) ≈ `#6D3DE0` / `#8B5CF6`. In-app marks use
  `currentColor`, so they track the active theme automatically.
- Favicon/app-icon chip is a **fixed violet** with a white mark so it reads on
  any browser-tab or home-screen background.
- On photos or busy surfaces, use the chip; on neutral surfaces use the mono mark.
- Never recolor the logo with the gauge's health colors (teal/red) — those mean
  "revenue / cost" inside the product, not "brand."

## Performance & accessibility notes

- Animated logo: 2 animated elements, CSS-only, no layout shift, honors reduced
  motion, visible without JS/CSS.
- All marks carry `role="img"` + `aria-label="CostTracker"`; decorative OG
  texture is inert.
- SVGs are hand-kept minimal (no generator bloat, no embedded fonts — the
  standalone wordmark uses the DM Sans → system stack).

## Future ideas

- A one-time **welcome/empty-state** hero using `AnimatedLogo` at large scale.
- An optional hover "live breath" (the node ticks a pixel) on the navbar mark.
- If a marketing site is added, an outlined-DM-Sans wordmark for pixel-perfect
  raster exports (needs a font-outlining step in the generator).
