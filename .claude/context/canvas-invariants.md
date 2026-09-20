# Canvas interaction invariants

Rules that live in more than one file, each of which had drifted at least once.

## Selection chrome

**The selection chrome is described in `src/utils/selectionTheme.ts`, and nowhere
else.** Four separate paths draw "this is selected" — `SelectionController`
(`src/canvas/selectionController.ts`: box + 4 corner dots for circle and text),
the legacy `ObjectSelector` (`components/utils/objectSelector.ts`: text, point,
pencil, group), `vertexHandles` (route, area) and `groupobject`'s own resize
dots. Each had picked its own colours and widths, so a point read amber while a
route read indigo, and a circle's ring thickened as you zoomed in.

Two rules the tokens encode:

- The **box** follows the theme's ink (`getSelectionStroke`, live off
  `--color-ink`) while the **grab dots** are fixed indigo (`HANDLE_STROKE`) in
  both themes.
- Every number is in **screen px**, so each consumer divides by the camera scale
  or counter-scales its shape.

The one that is easy to miss is `Two.Points`: the renderer divides `size` by the
scene scale for you but does **not** touch `linewidth`, which is a world unit
like any other stroke — that asymmetry is exactly how the circle's ring drifted
away from the route's.

Asserted by `map-circle.spec.js` ("rings its resize handles in the shared handle
indigo") and `geo-move-paste-select.spec.js`, which imports
`SELECTION_HANDLE_FILL` rather than hardcoding it.

## Camera input model

The map is the only substrate, so there is one input idiom and it is the one
every mapping product uses:

- The **wheel only ever zooms**. No modifier needed.
- A **drag over empty canvas pans** (`beginMousePan` in `newCanvas.tsx`), reached
  from the `shape === null` arm of mousedown **after** the selection clearing —
  so a click that never moves still deselects, and a drag that starts on an
  element still moves that element.
- **`shift`+drag** is the only box-select.

`beginMousePan` binds to `window`, not `domElement`, so a release outside the
canvas still ends the pan. The wheel listener is `{ passive: false }` and calls
`preventDefault()` unconditionally: the SVG is a fixed full-viewport surface with
nothing behind it to scroll, and without it `ctrl`+wheel page-zooms the browser
and Safari reads a horizontal two-finger swipe as back-navigation. The legacy
`mousewheel` alias is deliberately **not** bound alongside `wheel` — a browser
firing both would double-apply the zoom.

**A wheel event's units are per-browser and per-device.** `wheelZoomStep`
(`utils/wheelZoom.ts`) is the single reader. It prefers `wheelDeltaY` where it
exists, because that is what shipped and it is _not_ a fixed multiple of
`deltaY` (a discrete notch reports 120 against a `deltaY` of 100; a trackpad
reports 3x) — deriving one from the other changes the feel of one device to fix
the other. Firefox sets neither and reports LINE units, which worked out to a
~0.3% zoom per notch. The step is clamped because macOS trackpads keep emitting
inertial events after the fingers lift, and one of those can otherwise cross
several zoom levels in a frame.

`map-wheel-zoom.spec.js` is the only spec in the suite that drives a real `wheel`
event or a real camera drag. Every other zoom test reaches in through
`window.__mcZui` plus a synthetic `zoomChanged`, and would pass no matter what
the input handlers did.

## Geometry is the source of truth

**`metadata.geometry` is the single source of truth for position; `x`/`y` are a
cache.** Every record carries `metadata: { geometry, properties }` — a GeoJSON
Feature minus its redundant `type` tag, uniform across every componentType.

`src/utils/geometry.ts` is the ONLY module that may construct or destructure it,
and the rule that makes the whole thing hold is that its writers
(`geometryFields` / `setGeometry` / `translateGeometry` / `scaleGeometry`) emit
`metadata`, `x` and `y` **together**, always deriving the columns from the
geometry.

Never write `x`/`y` on their own, and never read them back as truth — use
`geometryOrigin(record)` (where a shape is drawn from) or
`geometryCenter(record)` (where it visually sits, which is what paste needs; a
route's origin is wherever the first click happened to fall).

Two details that are easy to get wrong by hand, which is why fixtures build
through the real constructors (`pointAt` / `lineThrough` / `polygonOver` in
`tests/e2e/helpers`):

- A polygon is STORED closed per RFC 7946 but RENDERED open (`geometryPositions`
  opens it, because `factory/area.ts` builds its path with `closed = true` and
  closes the shape itself).
- A pencil's per-point widths live in `properties.widths` as a parallel array —
  never as a third coordinate element, which in GeoJSON means altitude.

Covered by `tests/e2e/geometry-envelope.spec.js`.

**Factories take their origin from the geometry, not from their `x`/`y`
arguments.** `factory/main.ts` resolves it through `geometryOrigin`, which is
also what retired the `x === 0 ? 500 : x` coercion that used to stand there. On a
map that was a live bug, not a nicety: surface (0, 0) IS the georeference anchor,
so anything drawn exactly on it was teleported 500 units east.

## Selection and deletion

**Bare-canvas clicks clear the selection from the hit test, not from the DOM.**
"Selected" is drawn by three owners — the controller's box, the element-owned
chrome that answers `clearSelector` (text, point) and the React
`selectedComponent` behind the properties toolbar and area/route's vertex
handles — and the `shape === null` branch of mousedown clears all three. It used
to clear only the first, leaving the rest to a `lastChild?.id === 'two-0'` test
that matched only when the press landed on the wrapper div rather than the SVG or
the map canvas: hence deselecting an area took two clicks and a route three.

**Deleting a record does NOT unmount its element component.** This is the one
most likely to bite. `handleSetComponentsToRender` only ever _adds_ wrappers, and
`ElementRenderWrapper` snapshots its record at mount — so dropping the row from
`componentStore` leaves the element painted on the canvas until a reload.
**Every delete path must pair the store write with its own `two.remove`**, and
the mobile trash button does (`removeFromScene` in `mobileDeleteButton.tsx`).
Element cleanups still remove their own group for real unmounts; that path is
guarded on the group still being in the scene, per the `scene.subtractions` note
in CLAUDE.md.

**Paste moves the selection to the clone.** The clipboard clears the source's
chrome and dispatches `SELECT_COMPONENT_EVENT` once the clone has mounted;
`newCanvas` answers it — `selectionController.attach` for the shapes it owns, a
synthetic `click` plus `buildToolbarState` for everything that draws its own
chrome.

## The move-drag fast path

**It writes the SVG `transform` ATTRIBUTE**, not `style.transform`, and sets no
`will-change`. Both work on desktop; the CSS pair (a promoted layer on an SVG
`<g>`) is what made elements vanish for the length of a drag on mobile. Because
it writes the same attribute Two.js renders, `clearCssMove` must flag
`_flagMatrix` on the element (and the selection chrome) or Two.js sees a clean
node and leaves the last drag frame standing. The win being protected is skipping
the full-scene `two.update()` per frame — never the compositing.

**That attribute must be one `matrix(...)`, never `translate(...) scale(...)`.**
They are numerically identical, and Blink still does not invalidate them alike.
Far from the map anchor the coordinates are enormous (San Francisco sits ~18.2M
surface units out on a base anchored in Ahmedabad, past the 2^24 float32 integer
limit), and in the transform-list form the element was placed correctly and then
simply not repainted: it vanished for the whole drag and returned on release,
when `two.update()` rewrote the matrix. It hit every element type, not one,
because the fast path is shared.

Two traps for whoever debugs the next one of these: the position is never wrong,
so `getBoundingClientRect` reads clean the entire time and only pixels show it;
and it needs a real GPU, so headless rasterization paints it correctly and no
headless test can catch the regression.

## Modes, editing and chrome

**Pan mode navigates; it never authors.** `newCanvas`'s `dblclick` returns early
under `isPanMode()`, and `point.tsx` / `text.tsx` repeat the guard inside their
editors — their dblclick listeners are bound to their own SVG nodes and never
reach the canvas handler. A tool whose whole job is moving the view must not drop
the user into a text field.

**A live `linewidth` edit on a counter-scaled stroke must itself be
counter-scaled.** route / area / pencil / circle paint
`linewidth * computeCounterScale(scale, resist)`; writing the raw value onto the
path made the widest step hairline-thin below the anchor until the next
`zoomChanged` re-applied the factor. `applyProperty` scales what it paints and
persists the logical width (`isStrokeScaled`). See
[zoom-resistance.md](./zoom-resistance.md).

**Mobile text editing is driven by events, not refs.** The editors are DOM
overlays built inside element components; the ✓/✗ and ✏️ are React
(`mobileTextControls.tsx`). They talk through `TEXT_EDIT_START`/`TEXT_EDIT_END`
(editor → chrome) and `TEXT_EDIT_COMMIT`/`TEXT_EDIT_CANCEL` (chrome → editor),
and the buttons act on **click** while cancelling the **press**: the press must
not blur the editor (blur is what commits, so ✗ would become ✓), and acting on
the press ended the edit mid-gesture, letting the tap's own click land on the
delete button that had just re-mounted in that slot.

**Tooltips are mouse-and-keyboard only.** `Tooltip` opens on `pointerenter` with
`pointerType === 'mouse'` and on `:focus-visible`, never on touch: a tap fires
the compatibility mouse sequence and then leaves the element hovered with no
`mouseleave` to follow, so a tapped button's bubble stayed up for the session.
Gating on the pointer rather than on a device check keeps a touchscreen laptop
right — cursor gets hints, finger does not. A global
`pointerdown`/`scroll`/`blur` sweep closes any bubble that does get open. Covered
by `tests/e2e/tooltip-touch.spec.js`.

**An open modal owns the screen.** `Modal`'s backdrop carries `z-index: 1000` —
it has to out-stack the canvas chrome (10–20) and the toast (50), or the dimmed
page still takes clicks. The dev perf overlay sits above it at 10000.

**Place search has two faces, one brain.** `usePlaceSearch` owns the debounce and
abort; `placeSearch.tsx` is the desktop top-bar field and `placeSearchModal.tsx`
(opened from the menu) is the mobile one. Landing somewhere new — a search pick,
or either answer to the first-run location prompt — ends in `enterPanMode()`.

---

Covered by `tests/e2e/map-mobile-controls.spec.js`,
`tests/e2e/canvas-interaction-fixes.spec.js`,
`tests/e2e/geo-move-paste-select.spec.js` and `tests/e2e/map-wheel-zoom.spec.js`.
