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
- **`isStrokeScaled()` = `area`, `route`, `pencil`, `circle`** — the geometry
  stays world-scaled and only the STROKE is held near-constant. A circle marks a
  real-world radius, so shrinking its geometry would destroy the meaning of the
  mark; the same reasoning covers a freehand stroke.

## Two inputs, not interchangeable

- **`properties.resist`** (inside `metadata`) — the numeric strength, and the
  sole mechanism for `point` / `area` / `route` / `pencil` / `circle`. It is
  reachable on all of them since the GeoJSON-envelope refactor; under the old
  polymorphic metadata a route's was a bare vertex array, so `.resist` was always
  `undefined` and area/route/pencil silently ran on the default.
- **`zoomResistant` (DB column)** — the user-facing **Zoom resistant** switch in
  the `TEXT` and `CIRCLE` property sets. `false` forces resist 0 (scales with the
  map); `null` / absent / `true` means `TEXT_RESIST`.

**A circle resists at two rates and therefore has two readers.** Its ring reads
`resolveResist`; its label reads `resolveLabelResist`, which is the only place
the column is read for a circle. Extending `resolveResist` to read the column for
circles would make the switch delete the ring at z4. For `text` the body and the
label are the same thing, so `resolveResist` does read the column there.

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
