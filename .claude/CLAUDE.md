# Code style

- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')
- Use `tabWidth:4` for generating code for all the files (.ts, .tsx, .yaml, .md, etc...)
- The codebase is **TypeScript** (`strict: true`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`). New files must be `.ts` or `.tsx`. Type-only imports use `import type { ... }`.
- For DOM null-safety, use the intermediate-variable pattern: `const el = document.getElementById('x'); if (el) el.style...`

# General guidelines

- Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default
- Refactor code as you go to keep code clean
- Keep file sizes small and put helper functions and components in their own files.
- If you are changing DB table schema/ column types or such types in /schema folder like component or legend preset, always confirm with the actual developer/user before making any change.
- Restrict use of comments wherever possible unless really needed.
- If you are stuck in making architecture decision or code configuration changes, please push back and ask me.

# What mapcursor is

Mapcursor is a tool for **drawing and annotating on maps**. You open a base, drop
points, draw a route, mark an area, sketch with the pencil or annotate with text.
No sign-up; work stays local until you share the canvas.

It is **its own app** — not a library, with no consumers. Build features here.

A **base** is the workspace: the thing a user opens, draws on, shares and
persists (`bases.base` in Postgres, `/map/:id` in the URL, `BaseContext` in
React). Every base is a map — there is one substrate and nothing to choose.

# Code structure

## Core Architecture

**Rendering Stack**: Base → Canvas → ElementRenderer → Component Element → Component Factory

- **Base** — the workspace and main container: a MapLibre basemap with Two.js ink
  on top, plus the sidebar and toolbars. Provides `BaseContext`.
- **Canvas** (`newCanvas.tsx`) — 2D rendering and all user interaction (mouse,
  drag, zoom, pan).
- **Component Elements** — React components that mount a shape into the Two.js
  scene and attach its event listeners.
- **Component Factories** — template generators producing component definitions.

Two things about the substrate that everything else depends on:

- **Ink lives in Two.js surface space and is never rewritten.** The map is jumped
  so that surface (0,0) sits over the base's anchor — that is what makes
  annotations behave as if pinned to the geography. See `src/baseTypes/types.ts`
  and `mapBackdrop.ts`. The anchor is therefore content, not a cache: lose it
  and the whole drawing is redrawn over the fallback (timezone) city. Never let
  a local base's anchor expire or get left behind when its id rotates (see
  `baseTypes/anchorStorage.ts`).
- **The camera is split across two `<g>` transforms** (`src/canvas/renderOrigin.ts`)
  to dodge float32 cancellation at map-scale coordinates. The rendered matrix is
  therefore _not_ the camera — read the camera from `two.scene.scale`.

## React + Two.js Stale Closure Pattern

**Critical architectural constraint**: `addZUI` in `src/newCanvas.tsx` is called **once on mount** via `useEffect([], [])`. All DOM event listeners registered inside it (mouse, dblclick, keydown, etc.) close over the initial `props` and local variables — they never see React state updates.

**Rule**: Any Two.js event handler that needs live React state **must** read from a `useRef`, not from `props` or state directly.

Pattern:

```ts
const myValueRef = useRef<MyType>(props.myValue)
useEffect(() => {
    myValueRef.current = props.myValue
}, [props.myValue])
// pass myValueRef into addZUI, read myValueRef.current inside handlers
```

This is because Two.js attaches raw DOM `addEventListener` calls outside React's reconciliation loop — React cannot re-bind them on re-render. The ref object is stable across renders; `.current` always holds the latest value at call time.

The same constraint applies to element components: `ElementRenderWrapper` freezes
their props at mount, so later state must reach them by custom event.

## Two.js Collection `.filter()` Pitfall

**`two.scene.children` is a Two.js `Collection`, not a plain array** — and
`.filter()` on it lies about `length`.

`Collection extends Array`, so `filter` builds its result via
`ArraySpeciesCreate` → `new Collection(0)`. That constructor treats a _numeric_
argument as an element to push, so the result starts as `[0]`. When the filter
matches nothing, nothing overwrites it:

```js
two.scene.children.filter(() => false).length // → 1, contents [0]  ✗
Array.from(two.scene.children).filter(() => false).length // → 0    ✓
```

This silently defeats `if (result.length > 0)` guards and can feed a bogus `0`
into `two.remove()` — which is one more way to land in the subtractions pitfall
below.

**Rule: `Array.from(...)` (or spread) before any `.filter()`/`.map()`/`.slice()`
on `scene.children`.** `forEach` and `find` are safe (they don't construct a new
Collection). Fixed once in `groupobject.tsx` `handleOnDeleteGroupElements`.

## Two.js scene.subtractions Pitfall

**Symptom**: `Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is no longer a child of this node.` thrown from `_Group2.render` → `subtractions.forEach(svg.group.removeChild)`.

**Why it happens**:

- `two.remove(element)` does NOT remove SVG nodes immediately. It removes the element from `scene.children` and pushes it into `scene.subtractions`. The actual `parent.removeChild(elem)` happens on the next `two.update()`, inside the renderer's `subtractions.forEach`.
- If between `two.remove(element)` and `two.update()` the element's SVG node is detached by some other path — for example, the element was nested inside another group's SVG element which got removed — then Two.js's tracked `parentNode` no longer matches the actual DOM tree. The `removeChild` call throws.
- `scene.flagReset()` only clears `scene.subtractions` after a successful render. **If the render throws, the array stays populated, and every subsequent `two.update()` retries the same broken operation and crashes again** — this is why the same error keeps reappearing as you fix one trigger after another.

**Common triggers**:

1. Removing a parent group via `two.remove([parentGroup])`. Two.js detaches the parent's SVG node from the DOM, taking nested SVG nodes with it. Any element whose Two.js bookkeeping still says "I'm a child of scene.\_renderer.elem" is now lying.
2. Multiple `two.update()` calls firing in close succession from different sources (an event handler, an element component's cleanup, a `requestAnimationFrame` callback). Each can put the SVG in a half-reconciled state that the next one trips over.
3. React component cleanup effects calling `two.remove(group)` after we've already manually removed the same group elsewhere — double subtraction.

**Rules to avoid it**:

- **Don't compete with the element components for Two.js cleanup.** Each shape component calls `two.remove(group)` in its `useEffect` cleanup. If you also call `two.remove` on the same elements from a parent component, you get a double-subtract. Pick one owner: either remove manually and let the cleanup be a no-op (Two.js's `Group.remove` safely skips ids it doesn't own), or do nothing and let the cleanup own it.
- **Don't call `two.update()` inside a Two.js DOM event handler that fires synchronously during another `two.update()`** (notably `blur`, which fires when Two.js detaches a focused SVG node). The outer update is mid-reconciliation; calling `two.update()` again corrupts the SVG tree.
- **If `two.update()` might throw during a tear-down path, wrap it in `try/catch` AND clear `two.scene.subtractions.length = 0; two.scene._flagSubtractions = false`** in the catch. Otherwise the bad subtraction sticks around and every future `two.update()` repeats the crash.

**Where the source lives** (when you need to verify behavior):

- `node_modules/two.js/src/renderers/svg.js` — `svg.group.removeChild` (has a `parentNode != this.elem` early-return check) and `svg.group.render` (calls `subtractions.forEach`).
- `node_modules/two.js/src/group.js` — `subtractions`/`additions` arrays, `flagReset()` clearing logic, the `splice()` helper that pushes into `subtractions` when a child is detached.

**Reference**: `src/components/elements/groupobject.tsx` `handleOnDeleteGroupElements` is the canonical example of cleanly tearing down a group with a `try/catch` + subtraction reset.

## Directory Structure

### `/src/views`

Top-level page views/routes.

- **`Base/`** — the workspace page: `base.tsx` (the big one: GraphQL operations,
  hook composition, `BaseContext` provider), `baseContext.ts` (the context object,
  in its own leaf module so its identity survives HMR — see the comment there),
  `index.tsx`, `errorBoundary.tsx`
- **`Home/`**, **`Support/`**, **`Privacy/`** — marketing and static pages

### `/src/components`

- **`elements/`** — one component per element type, lazily mounted into the
  Two.js scene: `point`, `circle`, `area`, `route`, `pencil`, `text`, `image`,
  `groupobject` (+ `circleLabelEditor.ts`). **This is the complete element set.**
  `image` is local-only for now; see `context/meta-properties.md`.
- **`sidebar/`**
    - `primary.tsx` — the main sidebar; seeds newly created elements from the
      current element defaults
    - `elementProperties.tsx` — the properties toolbar for the current selection.
      The `SETS` map declares which sections render per element kind (`PENCIL`,
      `TEXT`, `POINT`, `AREA`, `ROUTE`, `CIRCLE`, `IMAGE`, `GROUP`); `resolveSetKey()`
      picks the active set. Every change routes through
      `utils/applyProperty.ts` (`createApplyProperty`) — it sets the matching
      default, then applies the same change to the selection if there is one.
    - `shapesToolbar.tsx`, `menuDrawer.tsx`, `placeSearch.tsx` /
      `placeSearchModal.tsx`, `mobileDeleteButton.tsx`, `mobileTextControls.tsx`,
      `shareLinkPopup.tsx`, `shortcutsModal.tsx`, `userDetailsPopup.tsx`
- **`legend/`** — the legend presets UI (panel, wizard, chips, preview)
- **`metaProperties/`** — the meta properties panel (card under the
  legend on desktop, sheet on mobile), its add-property wizard, value fields and
  dialogs. Clicks inside it don't deselect the object: `utils/canvasChrome.ts`
- **`modals/`** — standalone modals (import, size limit, storage limit,
  permission error, map start location)
- **`common/`** — button, modal, portal, dropdown, toast, tooltip, spinner, loader
- **`utils/`** — component-level helpers: `elementRenderWrappers.tsx`
  (`ElementRenderWrapper` / `GroupRenderWrapper`, which Canvas uses to lazily
  mount element components), `objectSelector.ts`, `vertexHandles.ts`,
  `colorPicker.tsx`, `dragger.ts`, `toolbarConnector.ts`
- **`dev/`** — `PerfOverlay.tsx`
- Top-level: `ZoomControls.tsx`, `canvasContextMenu.tsx`, `goToContentButton.tsx`,
  `helpButton.tsx`, `textZoomHint.tsx`, `toolHint.tsx`

### `/src/canvas`

- `selectionController.ts` — the selection box + corner handles
- `renderOrigin.ts` — the split camera transform (see Core Architecture)

### `/src/baseTypes`

The map backdrop.

- `types.ts` — `MapAnchor`, `MapBackdropConfig`, the host/backdrop contract
- `mapBackdrop.ts` — mounts MapLibre and keeps it slaved to the ZUI camera
- `anchorStorage.ts` / `serverConfig.ts` — where a base is pinned, locally and
  on the server row
- `mercator.ts` — lng/lat ⇄ surface-space conversion
- `zoomLimits.ts`, `roadSource.ts`

### `/src/factory`

One factory per element component, generating its template definition:
`point.ts`, `circle.ts`, `circleLabel.ts`, `area.ts`, `route.ts`, `pencil.ts`,
`text.ts`, `image.ts`, plus `main.ts` (the dispatcher).

### `/src/hooks`

Custom hooks extracted from `base.tsx` and `newCanvas.tsx` — see
"Hook composition" below for the ones `base.tsx` composes, plus
`useCanvasClipboard.ts` (copy/paste), `usePlaceSearch.ts` (debounce + abort for
both search faces) and `useTopRightOffset.ts`.

### `/src/utils`

~40 helpers. The load-bearing ones:

- `geometry.ts` — the ONLY module that may construct or destructure
  `metadata: { geometry, properties }`. Position truth lives here.
- `applyProperty.ts` / `applyGroupProperty.ts` — the single mutation path behind
  the properties toolbar
- `counterScale.ts` — zoom resistance (`resolveResist`, `isStrokeScaled`)
- `selectionTheme.ts` — the one description of selection chrome
- `canvasUtils.ts` — pure Two.js helpers (`applyShapeStyle`, `cloneElementData`,
  `resolveShapeFromPath`, `pollUntilElement`)
- `exportBase.ts` / `importBase.ts` (JSON), `exportSelectionAsSvg.ts` (SVG),
  `exportViewport.ts` (PNG of the visible viewport, backdrop included)
- `placeSearch.ts`, `roadSnap.ts`, `roadGraph.ts`
- `viewportStorage.ts`, `drawModeUtils.ts`, `e2eHooks.ts`

### `/src/types`

- `base.ts` — `ComponentRecord`, `ComponentMetadata`, `BaseContextValue`
- `legend.ts`, `two.d.ts`, `global.d.ts`

### `/src/schema`

GraphQL for Hasura: `generated.ts` (codegen output), `queries/`, `mutations/`.

### `/src/constants`

`elementSchema.ts`, `misc.ts` (custom event names live here), `exportHooks.ts`.

### Other

`/src/icons`, `/src/assets`, `/src/styles`, `/src/wireframeAssets`.

## Key Files

- **`App.tsx`** — root component + routing. `/` → Base (unpersisted),
  `/map/:id` → Base, `/home`, `/support`, `/privacy`. `/base/:id` and the
  pre-rename `/board/:id` 301 to `/map/:id` from `public/_redirects` (above the
  SPA catch-all, which matches everything).
- **`newCanvas.tsx`** — the canvas: Two.js setup, `addZUI`, every input handler
- **`elementModules.ts`** — the `import.meta.glob` of element components plus the
  idempotent prefetch that warms a shape's chunk before `React.lazy` needs it
- **`routes.ts`**, **`index.tsx`**, **`serviceWorker.ts`**

## Data Flow

1. **User Interaction** → Canvas event listeners (mouse, drag, zoom)
2. **Component Creation** → Factory generates template → Element renderer creates Two.js object
3. **State Updates** → React Context (BaseContext) + local component state → Component re-renders
4. **Backend Sync** → GraphQL mutations fire only when `isPersisted` is true. In local mode (`/`), state lives in React + localStorage draft only.

## React Context

**BaseContext** (declared in `src/views/Base/baseContext.ts`, provided by
`base.tsx`, read via `useBaseContext()`) carries, broadly:

- identity and persistence (`baseId`, `isPersisted`, `persistBase`, `shareBase`,
  `backgroundBaseId`, `beginBaseImport`)
- Two.js handles, drawing modes, selection state
- the component store and its mutation helpers
- `applyProperty` / `applyGroupProperty`
- legend presets and their CRUD
- bridges up from Canvas: `reorderSelected`, `fitToContent`

**The full shape is `BaseContextValue` in `src/types/base.ts`** — read it there
rather than duplicating it here.

### Hook composition in base.tsx

`base.tsx` composes these in order (order matters — each may depend on the previous):

1. `useElementCountWarning({ ... })` — perf warning past an element threshold
2. `useMediaQueryUtils()` — `isMobile` / `isTablet` / `isLaptop` / `isDesktop`
3. `useDrawingModes()` — draw mode state and setters
4. `useMapBackdrop({ ... })` — mounts the map, owns the anchor and camera sync
5. `useMobileToolbarPanels({ isMobile, selectedComponent })` — panel visibility
6. `useElementDefaults()` — element defaults (stroke/fill/text) and their setters
7. `useLocalDraftPersistence({ ..., onStorageLimitRef })` — draft + quota modal
8. `useComponentHistory({ ... })` — undo/redo stack
9. `useLegendPresets({ ... })` — the base's legend, and writes bound to it
10. `useMetaProperties({ ... })` — base-wide meta property definitions and
    per-object values (exposed as `meta` on `BaseContext`); see
    `context/meta-properties.md`

## Technology Stack

- **Language**: TypeScript (`strict: true`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`)
- **UI Framework**: React (^18.3.1), react-router 7
- **Canvas Rendering**: Two.js (custom DOM-level event handling; see Stale Closure section)
- **Map**: maplibre-gl (^5.24) — needs `canvasContextAttributes: { preserveDrawingBuffer: true }` or PNG export captures a blank backdrop
- **State Management**: React Context (BaseContext) + local component state
- **Backend**: GraphQL (Hasura) with codegen via `yarn codegen` → `src/schema/generated.ts` (never hand-edit). Tables: `bases.base` (the workspace), `components.component` (its elements), `legends.preset`, and `meta.property` / `meta."propertyValue"` (meta properties). **Never build a `gql` document with `${...}` interpolation**: codegen reads the templates statically, silently skips the whole file, and drops every operation type in it. After `yarn codegen`, check no existing export disappeared from `generated.ts`.
- **GraphQL Client**: Apollo Client
- **Error reporting**: @sentry/react
- **Animation**: framer-motion
- **Styling**: CSS + Tailwind CSS
- **Build Tool**: Vite
- **Tests**: Vitest (`yarn test`) + Playwright (`yarn test:e2e`)
- **Package manager**: Yarn (v1.22.22)
- **Type-check**: `yarn typecheck` (runs `tsc --noEmit`)

# Workflow

- Be sure to typecheck when you're done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance

## E2E tests run against a production build

`yarn test:e2e` is one suite with one target. CI
(`.github/workflows/e2e-deploy-preview.yml`) points it at a **Netlify deploy
preview**, which serves a production bundle, not a dev server. Three rules
follow, and all three were broken at once by specs authored locally and merged
without ever running against a preview.

- **Never gate a test affordance on `import.meta.env.DEV`.** That is a
  compile-time constant, so the block is dead-code-eliminated out of the bundle
  and the affordance is simply absent on CI. `src/utils/e2eHooks.ts` owns the
  gate (`E2E_HOOKS`), widened by `VITE_E2E_HOOKS`, which `netlify.toml` sets for
  the deploy-preview context only. Production still ships without the handles
  (`__mcTwo`, `__mcZui`, `__mcRenderOrigin`, `__mcMap`).
- **Never `import('/src/**.ts')`inside`page.evaluate`.** Serving raw TypeScript
is a Vite dev-server behaviour; against a bundle it 404s. A pure function is
asserted in **Node**, by importing it at the top of the spec. Playwright
transpiles those imports, and the closure is checked to be free of
`import.meta` and module-scope DOM access.
- **Read the camera through `readCamera` (`tests/e2e/helpers/index.js`), and let
  it throw.** The two copies it replaced were optional-chained, which turned a
  missing handle into `expect(null).toBeCloseTo(...)` and disguised one cause as
  four unrelated assertion failures.

Also: every spec must import `test` from `./helpers/test.js`, never from
`@playwright/test`. That fixture carries the CI timeouts and hides the Netlify
Drawer, an iframe the preview injects that wins the hit test on `isMobile`
viewports and cannot reproduce locally.

**Before merging a spec, run it against a real bundle.** This is the check that
was missing:

```
VITE_E2E_HOOKS=true yarn build && yarn preview
PLAYWRIGHT_BASE_URL=http://localhost:4173 CI=1 yarn test:e2e
```

## Mobile testing on local network

When testing on a real mobile device (laptop and phone on same WiFi):

1. Replace `localhost` with the laptop's LAN IP (e.g. `10.151.106.95`) in `.env`:
    ```
    VITE_GRAPHQL_ENDPOINT=http://<LAN_IP>:8080/v1/graphql
    VITE_WS_GRAPHQL_ENDPOINT=ws://<LAN_IP>:8080/v1/graphql
    ```
2. Ensure `vite.config.mjs` has `host: true` and `allowedHosts: ['<LAN_IP>']` (no `http://` prefix).
3. Restart the dev server, then open `http://<LAN_IP>:5173` on mobile.
4. **Revert `.env` before committing** — or use `.env.local` for the override so it stays out of git.

# Feature Context

Feature-specific detail lives in `.claude/context/` — read the relevant file
rather than adding its content here:

- `canvas-invariants.md` — cross-file rules for selection, input, geometry,
  deletion and the move-drag fast path. Read before touching `newCanvas.tsx`.
- `zoom-resistance.md` — how elements counter-scale against the camera
- `undo-history.md` — the undo/redo stacks, `recordToHistoryLog`, and
  `undoLastAction()` as the canonical rollback for any failed mutation
- `viewport.md` — what tx/ty/scale mean; how the camera persists
- `reorder.md` — Z-order of elements
- `responsive-design.md` — Tailwind responsive prefixes vs `useMediaQueryUtils`
- `font-guide.md` — the font system and usage rules per area
- `geo-objects-plan.md` — original plan for point/area/route (partly historical)
- `meta-properties.md` — base-wide meta properties, image assets shared with
  image elements, and the orphaned-value sweep (planned)
