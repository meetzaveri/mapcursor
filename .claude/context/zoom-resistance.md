# Zoom resistance

Elements counter-scale against the ZUI camera so they stay legible when the
world zooms out: `apparentSize ∝ zuiScale^(1 - resist)`
(`src/utils/counterScale.ts`).

**`resolveResist(item)` is the single reader for an element's body** — use it
rather than reaching for the fields yourself, or a live element and the detached
copy in a group overlay will disagree.

## What scales, and at what rate

Two disjoint sets, and they must not be unified:

- **`GROUP_SCALED_TYPES` = `point`, `text`** — the whole group counter-scales.
  A pin is chrome; a caption is content, so `text` carries its own constant
  (`TEXT_RESIST`) rather than sharing the default.
- **`isStrokeScaled()` = `area`, `route`, `pencil`** — the geometry stays
  world-scaled and only the STROKE is held near-constant. Each marks real ground
  with its path, so shrinking the geometry would destroy the meaning of the mark.
- **`circle` is in neither set.** A radius map is borderless (`CIRCLE_DEFAULTS`
  seeds `linewidth: 0`, and nothing offers a width for it), so there is no stroke
  to hold steady, and its disc marks a real-world radius so its geometry stays
  world-glued. Only its LABEL counter-scales. `applyCounterScaleToCopy` still
  lets a circle through for exactly that reason, and skips the ellipse.

## Two inputs, not interchangeable

- **`properties.resist`** (inside `metadata`) — the numeric strength, and the
  sole mechanism for `point` / `area` / `route` / `pencil`. It is
  reachable on all of them since the GeoJSON-envelope refactor; under the old
  polymorphic metadata a route's was a bare vertex array, so `.resist` was always
  `undefined` and area/route/pencil silently ran on the default.
- **`zoomResistant` (DB column)** — the user-facing **Zoom resistant** switch in
  the `TEXT` and `CIRCLE` property sets. `false` forces resist 0 (scales with the
  map); `null` / absent / `true` means `TEXT_RESIST`.

**A circle resists only through its label**, which reads `resolveLabelResist` —
the only place the column is read for a circle. The disc itself never scales:
it is borderless, and its geometry is the data. For `text` the body and the label
are the same thing, so `resolveResist` does read the column there.

## It is per record, never a default

`applyProperty` deliberately skips the `useElementDefaults` sync for
`zoomResistant` (same as `opacity`), so turning it off on one label does not
follow the selection onto the next, or onto newly created text. Two labels on one
map run two different models through the same `zoomChanged` broadcast.

## Why it travels by event

`ElementRenderWrapper` freezes element props at mount, so a column write never
reaches a live element through React. The toggle and its undo/redo both announce
`TEXT_RESIST_CHANGED_EVENT` with `{ id, resist }` (`constants/misc.ts`); the
component filters on `id` and re-scales against the current camera
(`text.tsx`, `circle.tsx`).

Two more consequences of it being a column rather than a metadata key:

- `cloneElementData` must name it explicitly or paste drops it.
- The `prevProps` snapshot in `updateComponentBulkPropertiesInLocalStore` needs
  the `undefined → true` fallback, or the first undo is a no-op.

Detached copies (the member copies a group overlay builds straight from the
factories in `groupobject.tsx`) have no element component behind them, so nothing
else counter-scales them — `applyCounterScaleToCopy` does it, mirroring what the
live components do on mount.

Covered by `tests/e2e/geo-text-zoom-resist.spec.js` and
`tests/e2e/geo-text-zoom-legibility.spec.js`.
