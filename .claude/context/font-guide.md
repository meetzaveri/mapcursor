# Craftbase Font Guide

## Font Stack

| Font             | Role                                                           | Import                    |
| ---------------- | -------------------------------------------------------------- | ------------------------- |
| **Inter**        | UI chrome, all app interface text, headings, branding          | Google Fonts              |
| **Geist Mono**   | Numeric values, coordinates, hex codes                         | Google Fonts / Vercel CDN |
| **Geist**        | Legacy canvas text — no longer offered, still rendered         | Google Fonts              |
| **Avenir**       | Canvas text — the **default** for anything drawn on the canvas | Self-hosted               |
| **Frutiger**     | Canvas text — alternate, user-selectable                       | Self-hosted               |
| **Caveat Brush** | Legacy canvas text — no longer offered, still rendered         | Google Fonts              |

> **Canvas ≠ app chrome.** The app UI is Inter; the _canvas_ defaults to Avenir.
> Don't collapse the two — see §5.

> **One family for the whole interface.** Inter is both `--font-ui` and
> `--font-display`: hierarchy comes from size, weight and colour, not from a
> contrasting face. This replaced a Geist/Fraunces split. Fraunces is **gone
> from the app entirely**, wordmark included. Don't reintroduce a second UI
> sans — Inter and Geist are metric twins (x/cap 0.750 vs 0.746, cap 72.8 vs
> 71.0) and pairing them reads as a mistake rather than a contrast.

> **Weights: load the variable range, never a weight list.** The app uses five
> (300/400/500/600/700). Google serves `wght@300..700` as ONE variable file of
> 48KB latin — the same cost as a single static weight, and half the 97KB that
> a `wght@400;600` pair downloads while covering three more weights. Listing
> discrete weights is both heavier and wronger: any class outside the list
> (`font-medium`, `font-bold`) silently fake-bolds.

> The `opsz` axis is deliberately **not** requested — it costs +25KB and the UI
> lives at 11–22px, where Inter's optical sizing barely moves. Don't add
> `font-optical-sizing: auto`; without the axis it is a no-op.

> **Caveat Brush, Caveat and Geist are retired from the picker but not from the
> app.** All three were once pickable canvas families, so records carry them in
> `metadata.textFontFamily` and nothing migrates that field — the Google Fonts
> link keeps loading all three. Geist is pinned to `wght@400` because canvas
> text is always 400; it is no longer the UI font. Don't drop any of them from
> `index.html`.

---

## Import (Google Fonts)

This is the live link in `index.html` — keep it in sync when adding a family:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
    href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Caveat+Brush&family=Geist+Mono:wght@100..900&family=Geist:wght@400&family=Inter:wght@300..700&display=swap"
    rel="stylesheet"
/>
```

> **Caveat Brush ships regular (400) only** — it has no bold cut. Asking for
> bold canvas text gets browser-synthesized fake bold, not a real weight.

### Self-hosted faces

Avenir and Frutiger are licensed binaries we ship, not Google families. They live
in `src/assets/fonts/` and are declared in `src/styles/fonts.css`, which
`src/App.css` imports at the top:

```css
@font-face {
    font-family: 'Avenir';
    src: url('../assets/fonts/AvenirLTProBook.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}
```

Three things about that block:

- **The declared family name is the persisted string.** It goes into
  `metadata.textFontFamily` verbatim on every record authored with it, and
  nothing migrates that field. The short spelling (`'Avenir'`, not the file's
  internal `'Avenir LT Pro'`) is final — renaming it orphans saved records.
- **Relative `url()` on purpose.** Vite fingerprints the file
  (`AvenirLTProBook-CTC4Sa6g.otf`) and emits it to `dist/assets/`. A `public/`
  path would ship unhashed and unverified.
- **An `@font-face` outranks a locally installed family of the same name**, so a
  viewer with a system Avenir still renders from our file.

**Export has to embed these itself.** `embedFonts` (`utils/svgExportShared.ts`)
inlines canvas fonts by fetching Google's CSS endpoint, which has never heard of
Avenir or Frutiger. `SELF_HOSTED_FONT_FILES` in that file is the branch that
fetches our own binary instead; a family added to the picker but not to that map
exports in a system fallback, silently. **Add a canvas family in two places or
neither.**

---

## CSS Variables (Design Tokens)

Defined in `src/App.css`:

```css
:root {
    --font-ui: 'Inter', system-ui, sans-serif;
    --font-mono: 'Geist Mono', monospace;
    --font-display: 'Inter', system-ui, sans-serif;
    --font-sketch: 'Avenir', system-ui, sans-serif;
    --font-caveat-brush: 'Caveat Brush', cursive;
}
```

`--font-sketch` (the _role_) is the canvas default and moved with it;
`--font-caveat-brush` (the _family_) stays pinned to the legacy face. They used
to resolve to the same stack — which is exactly why both are named separately.

### Tailwind Config (`tailwind.config.js`)

```js
fontFamily: {
    ui:      ['Inter', 'system-ui', 'sans-serif'],
    mono:    ['Geist Mono', 'monospace'],
    display: ['Inter', 'system-ui', 'sans-serif'],
    sketch:  ['Avenir', 'system-ui', 'sans-serif'],
},
```

### The canvas default lives in TypeScript, not CSS

Canvas text is rendered by Two.js (`twoText.family = …`), so it reads a JS
constant rather than a CSS variable:

```ts
// src/constants/misc.ts — single source of truth
export const DEFAULT_TEXT_FONT_FAMILY = 'Avenir'
```

Every canvas-text fallback is written `family || DEFAULT_TEXT_FONT_FAMILY`, and
`useElementDefaults` seeds `defaultTextFontFamily` from it. **Changing the canvas
default means changing this constant** — then keeping `--font-sketch`, the
Tailwind `sketch` token, and (for a self-hosted face) `src/styles/fonts.css` and
`SELF_HOSTED_FONT_FILES` in step with it.

---

## Usage by Area

### 1. App Chrome (Toolbar, Sidebar, Menus, Labels)

**Font:** Inter  
**When:** Everything inside the app shell — toolbar buttons, panel labels, dropdowns, tooltips, input fields, settings.

```css
/* CSS */
.toolbar,
.sidebar,
.menu,
label,
input,
button {
    font-family: var(--font-ui);
    font-weight: 400; /* or 500 for emphasis */
}
```

```jsx
{
    /* Tailwind */
}
;<div className="font-ui text-sm font-medium">Stroke Width</div>
```

> **Rule:** Never use Geist Mono, Caveat, Caveat Brush or a canvas face anywhere inside the toolbar or sidebar. Inter only — Geist Mono is the one exception, and only for the data described in §2.

---

### 2. Numeric Values, Coordinates & Data (Properties Panel, Status Bar)

**Font:** Geist Mono  
**When:** Any piece of data that is a number, coordinate, hex color, dimension, or percentage — specifically in the right properties panel and the zoom/status bar.

```css
/* CSS */
.prop-value,
.coord-display,
.hex-value,
.zoom-level {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
}
```

```jsx
{/* Tailwind */}
<span className="font-mono text-xs text-ink-mid">340</span>       {/* coordinate */}
<span className="font-mono text-xs text-ink-mid">#C4B89A</span>   {/* hex color  */}
<span className="font-mono text-xs text-ink-mid">100%</span>      {/* zoom level */}
```

> **Why Geist Mono here?** Monospace fonts align numbers into consistent columns, making coordinates and values scannable at a glance. It also visually separates "data" from "UI label" without needing extra styling — the font does the work.

> **Rule:** Geist Mono is for data display only — never for labels, headings, or body copy.

---

### 3. Branding & Marketing (Logo wordmark, Landing page hero, Taglines)

**Font:** Inter  
**When:** The Mapcursor wordmark, hero headlines on the landing page, onboarding screens, marketing copy.

The wordmark is hardcoded in **two** places and they must stay in step:
`index.html` (the pre-paint boot loader, which has to paint before the bundle
loads) and `src/components/common/mapcursorLoader.css` (the React loader). Both
pin `line-height: 1` — `normal` resolves off the font's own metrics, so the
column jumped when the webfont swapped in.

```css
/* CSS */
.logo,
.hero-headline,
.tagline {
    font-family: var(--font-display);
    font-weight: 600;
    font-style: normal;
}
```

```jsx
{
    /* Tailwind */
}
;<h1 className="font-display text-5xl font-semibold tracking-tight">
    Craftbase
</h1>
```

> **No italic is loaded.** The Inter request is roman only, so an `italic` class would render a synthesized oblique. Nothing in the app uses one today — keep it that way, or add the `ital` axis deliberately.

---

### 4. App Headings & Section Titles (Inside the app, not toolbar)

**Font:** Inter (via the `display` role token)  
**When:** Page titles, modal headings, section headers inside panels or dialogs.

```css
/* CSS */
.modal-title,
.panel-heading,
.page-title {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 1.25rem;
}
```

```jsx
{
    /* Tailwind */
}
;<h2 className="font-display text-xl font-normal">Share Base</h2>
```

> Headings carry their weight, not their face: `font-display` resolves to the same family as body text, so a heading that isn't `font-semibold` (or larger) won't read as one.

---

### 5. Canvas — Default Text Elements

**Font:** Avenir  
**When:** Anything the user draws on the canvas — standalone text elements, text
typed inside a shape, arrow labels, point labels.

Canvas text isn't styled by CSS classes — Two.js sets the family on the text node
directly, so the default flows from the constant:

```ts
import { DEFAULT_TEXT_FONT_FAMILY } from '../constants/misc'

twoText.family = textFontFamily ?? DEFAULT_TEXT_FONT_FAMILY // 'Avenir'
```

> **Why a clean geometric sans?** The canvas is a map surface first. Labels sit
> over a basemap and have to read as cartography — place names, annotations —
> which a handwritten face fights at small sizes and under counter-scaling. The
> canvas previously defaulted to Caveat Brush, from when the product was a
> whiteboard; the map is the identity now.

> **Watch the cap-height centring.** Point labels are placed by
> `capCenterOffset` (`utils/fontMetrics.ts`), measured per family. Fonts differ
> in how their ascent/descent straddle the cap band — Caveat Brush is symmetric
> about it, Avenir is not (76/24 against a cap of 70.8) — so any check that
> compares an SVG text's _box_ centre to something is measuring the wrong thing.
> See `centerOffset` in `tests/e2e/point-label-text.spec.js`.

---

### 6. Canvas — Switching Fonts (User-selectable)

Users change the font of a selected element from the properties panel
(`FontFamilyRow` in `elementProperties.tsx`). The picker offers exactly two:

| Option       | Feel                                                   |
| ------------ | ------------------------------------------------------ |
| **Avenir**   | Default — geometric humanist, quiet over a basemap     |
| **Frutiger** | Signage/wayfinding face; holds up at small label sizes |

Picking a font is **universal, not per-element**: `base.tsx` calls
`setDefaultTextFontFamily(fontFamily)` on change, so every element created
afterward inherits it. Changing it also triggers
`reflowShapeTextAfterStyleChange` — families have different metrics, so shape
text must re-wrap and the shape may need to grow.

> Existing elements store their family in `metadata.textFontFamily`. Changing
> `DEFAULT_TEXT_FONT_FAMILY` is **not** retroactive — saved elements keep the
> family they were created with, including families the picker no longer offers
> (`Caveat Brush`, `Caveat`, `Geist`). That is why those faces must keep
> loading; a retired family renders with no button highlighted, which is correct.

> The picker is shared by every set that lists `textFont` — `TEXT`, `POINT`,
> `GEO_TEXT`, `RECT_WITH_TEXT`, `GROUP` — so it is **not** map-only. A map-only
> font list means branching `FontFamilyRow` on the active set key.

---

### 7. Empty States & Microcopy

**Font:** Inter  
**When:** Empty canvas messages, onboarding hints, "no results" states — moments where the product has a voice.

```jsx
{
    /* Tailwind */
}
;<p className="font-display italic text-base text-gray-400">
    Drop your first shape to get started.
</p>
```

> With one UI family the voice has to come from the words, the size and the ink colour rather than from a second face. `text-ink-muted` at a generous size carries an empty state further than a weight change does.

---

## Quick Reference Cheatsheet

| Area                     | Font       | Weight    | Style  |
| ------------------------ | ---------- | --------- | ------ |
| Toolbar, sidebar, menus  | Inter      | 400 / 500 | Normal |
| Input fields, labels     | Inter      | 400       | Normal |
| Coordinates, dimensions  | Geist Mono | 400       | Normal |
| Hex colors, percentages  | Geist Mono | 400       | Normal |
| Zoom level, status bar   | Geist Mono | 400 / 500 | Normal |
| Logo / wordmark          | Inter      | 600       | Normal |
| Landing page hero        | Inter      | 600 / 700 | Normal |
| App modal / panel titles | Inter      | 600       | Normal |
| Empty states, microcopy  | Inter      | 400       | Normal |
| Canvas text (default)    | Avenir     | 400       | Normal |
| Canvas text (alternate)  | Frutiger   | 400       | Normal |

---

## What to Avoid

- **Don't reintroduce the Caveats anywhere** — they are legacy-render-only now, kept alive for records that already carry them. Nothing new should be authored in one.
- **Don't add a canvas family without adding it to `SELF_HOSTED_FONT_FILES`** (if self-hosted) — export falls back silently, with no error.
- **Don't rename a declared `@font-face` family** — the name is persisted per record and nothing migrates it.
- **Don't list discrete Inter weights** in the Google link — the variable range is smaller and covers every class. See the weights note in §Font Stack.
- **Don't hard-code `'Avenir'` at a call site** — reference `DEFAULT_TEXT_FONT_FAMILY` so the default stays swappable in one place.
- **Don't ask either canvas face for bold** — both ship regular (400) only; you'll get browser-synthesized fake bold.
- **Don't add a second UI sans** — Inter is metrically a twin of Geist, and anything similarly neutral will muddy rather than contrast.
- **Don't use Geist Mono for labels or headings** — it's data-only; used elsewhere it feels cold and technical.
- **Don't use Geist Mono on the canvas** — canvas text should feel human, not like a terminal.
