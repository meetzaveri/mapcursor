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
- **`image` is in `GROUP_SCALED_TYPES` but at `IMAGE_RESIST = 0`**, so its
  counter-scale is 1 and it scales with the map like the ground under it. It
  is not zoom-resistant and has no switch; a per-record `properties.resist`
  would still override it.
- **`circle` is in neither set.** A radius map is borderless (`CIRCLE_DEFAULTS`
  seeds `linewidth: 0`, and nothing offers a width for it), so there is no stroke
  to hold steady, and its disc marks a real-world radius so its geometry stays
  world-glued. Only its LABEL carries a scale of its own (`circleLabelScale`,
  below). `applyCounterScaleToCopy` still lets a circle through for exactly
  that reason, and skips the ellipse.

## Two inputs, not interchangeable

- **`properties.resist`** (inside `metadata`) — the numeric strength, and the
  sole mechanism for `point` / `area` / `route` / `pencil`. It is
  reachable on all of them since the GeoJSON-envelope refactor; under the old
  polymorphic metadata a route's was a bare vertex array, so `.resist` was always
  `undefined` and area/route/pencil silently ran on the default.
- **`zoomResistant` (DB column)** — the user-facing **Zoom resistant** switch,
  offered in the `TEXT` property set only. `false` forces resist 0 (scales with the
  map); `null` / absent / `true` means `TEXT_RESIST`.

**A radius map's label is not zoom-resistant** — it scales with the map, like
the disc it sits in. `circleLabelScale(item, camera)` is the single reader. When a
circle is drawn, newCanvas stamps the current camera onto
`properties.labelCameraScale` (at mouseup, not when the tool is picked), and the
label holds a fixed scale of `1 / labelCameraScale`. So it comes out at the size
ladder's on-screen size at the zoom it was drawn at, then follows the geography.
Without the stamp an 18-unit label drawn at z8 would be a fraction of a pixel.
A circle with no stamp (drawn before it existed) keeps the old `TEXT_RESIST`
caption model, so maps that already exist don't change. A radius map has no
switch, and the `zoomResistant` column is ignored for it. The disc itself never
scales: it is borderless, and its geometry is the data. For `text` the body and
the label are the same thing, so `resolveResist` does read the column there.

## Flipping the switch never moves the label

Changing resist alone makes a text jump by `camera ^ -resist` (turned off at
z8 an 18px caption fell to 0.07px, too small to click). So `applyProperty`'s
`zoomResistant` branch also rescales `fontSize` by the ratio of the two
counter-scales (`rescaleTextSizeForResist`, `utils/textResistToggle.ts`). At the
camera the switch is flipped under, the label looks exactly as before; from then
on it follows its new model. The size and the column go in ONE bulk write, so a
single undo reverts both (`useComponentHistory`'s `metadata` and `zoomResistant`
cases). Anything else that flips the column must do the same.

The selection chrome must hold up too. With resistance off a text's effective
scale is the raw camera scale (~0.004 at z8), so `objectSelector.setScale`
sizes its handles as `base / s` with no cap. A `min(base / s, base * 3)` cap
once shrank them to 0.06px there, and the text could not be resized.

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
(`text.tsx`).

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
