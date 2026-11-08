export const offsetHeight = 0
export const GROUP_COMPONENT = 'groupobject'
// Standalone image element. Local-only until shared bases host images; see
// .claude/context/meta-properties.md.
export const IMAGE_COMPONENT = 'image'

// Fired on window by an image element once its bitmap has painted or turned
// out to be missing ({ id }). useImageDrop listens to drop its loader.
export const IMAGE_SETTLED_EVENT = 'imageNodeSettled'
// Fired on window by the toolbar's Image tool with the picked files
// ({ files }). The canvas places them at the viewport centre.
export const INSERT_IMAGE_FILES_EVENT = 'insertImageFiles'

// Default canvas text font (single source of truth). Kept in sync with the
// `--font-sketch` var in App.css and the Tailwind `sketch` token. Every
// canvas-text fallback (`family || DEFAULT_TEXT_FONT_FAMILY`) references this
// so the default lives in exactly one place.
//
// Self-hosted (src/styles/fonts.css), not a Google family — hence
// SELF_HOSTED_FONT_FILES in utils/svgExportShared.ts, which embeds the binary
// so exports don't fall back. The picker offers this and 'Frutiger' and
// nothing else; 'Caveat Brush' is
// still loaded from Google Fonts because records authored before the swap
// carry it in `properties.textFontFamily` and nothing migrates that field.
export const DEFAULT_TEXT_FONT_FAMILY = 'Avenir'

// The ring colour of every grab handle in the app — route and area vertex dots,
// the corner dots on a shape, a text block, a map circle or a multi-element
// group. One colour, so "grab here to reshape" reads the same whatever is
// selected. Deliberately fixed in both themes, unlike the selection BOX, which
// follows the theme's ink to stay readable over the basemap.
//
// Consumers import it (with the rest of the chrome tokens) from
// utils/selectionTheme, which re-exports it — that module is the description of
// the selection chrome; this is just where the value lives.
export const HANDLE_STROKE = '#6965db'

export const RUBBER_MODE_KEY = 'rubberMode'

// Eraser size: the eraser deletes whole elements via a point hit test, not
// pixel painting, so size is a tolerance around the cursor — a bigger size
// widens the forgiving radius for catching thin strokes/small shapes.
// Persisted like the other draw mode keys so re-opening eraser mode remembers
// the last pick.
export type EraserSize = 'small' | 'medium' | 'large'
export const ERASER_SIZE_KEY = 'eraserSize'
export const DEFAULT_ERASER_SIZE: EraserSize = 'medium'
export const ERASER_SIZES: readonly EraserSize[] = ['small', 'medium', 'large']

// On-screen DIAMETER in px of the dot the size selector shows for each size.
// This is the eraser's visual identity: the trail drawn on the canvas uses the
// exact same number, so the beam is the same circle as the swatch that was
// picked. Change it here and both move together.
export const ERASER_DOT_PX: Record<EraserSize, number> = {
    small: 6,
    medium: 10,
    large: 14,
}

// Hit-test tolerance RADIUS in px, deliberately separate from the dot above:
// the dot is what the eraser looks like, this is how far it reaches. It runs
// wider than the dot on purpose so sweeping feels forgiving rather than
// pixel-exact (small stays a bare point test).
export const ERASER_SIZE_RADIUS: Record<EraserSize, number> = {
    small: 0,
    medium: 10,
    large: 20,
}

export const VIEWPORT_KEY_PREFIX = 'mapcursor_viewport_'
export const MOBILE_VIEWPORT_KEY_PREFIX = 'mapcursor_mobile_viewport_'
export const VIEWPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Per-base map anchor — the georeference surface (0,0) is pinned to. A sidecar
// key deliberately kept OUT of the draft blob, so the draft's size guard and
// rescue path are unaffected by it. It is swept on the viewport TTL, EXCEPT the
// current local base's anchor, which never expires by age: it is what the
// elements on screen are measured from, not a cache (baseTypes/anchorStorage.ts).
export const MAP_ANCHOR_KEY_PREFIX = 'mapcursor_map_anchor_'

// Per-base legend presets, for a canvas that has not been persisted yet.
// A sidecar like the anchor, and out of the draft blob for the same reason —
// but deliberately NOT part of the viewport TTL sweep: the camera is a cache
// that can be rebuilt, a legend is authored content. It is
// dropped only when its base is persisted (persistBase rotates it) or cleared.
export const LEGEND_PRESETS_KEY_PREFIX = 'mapcursor_legend_presets_'

// Per-base meta properties (definitions + values), for a canvas that has not
// been persisted yet. A sidecar like the legend, out of the draft blob and out
// of the TTL sweep for the same reason: it is authored content. Image values
// hold an ImageAssetRef only; the bytes are in IndexedDB (utils/assetStore.ts).
// See .claude/context/meta-properties.md.
export const META_PROPERTIES_KEY_PREFIX = 'mapcursor_meta_'

// The legend preset ARMED per element type — what the next mark drawn with
// that tool will wear. UI state, not content, so it is one flat key rather
// than a per-base sidecar; base.tsx re-syncs it against the live legend, so a
// preset that was deleted or restyled can never reach a creation path stale.
//
// In localStorage rather than only in React because `finishGeoDraw` reads it
// from inside `addZUI`, whose handlers bind once on mount and never see a
// state update (see the stale-closure rule in CLAUDE.md).
export const ARMED_LEGEND_PRESETS_KEY = 'mapcursor_armed_legend_presets'

// Every component type mapcursor can author. These are `componentType` values
// on `components.component`, and each one names the element module that renders
// it (`components/elements/<componentType>.tsx` — see elementModules.ts).
export const componentTypes = {
    point: 'point',
    area: 'area',
    route: 'route',
    circle: 'circle',
    pencil: 'pencil',
    text: 'text',
} as const

/** The three placed map objects, which share the multi-click/click-to-place UI. */
export const mapObjectTypes = {
    point: 'point',
    area: 'area',
    route: 'route',
} as const

export type MapObjectType = keyof typeof mapObjectTypes

export const isMapObjectType = (type: string | null | undefined): boolean =>
    type === mapObjectTypes.point ||
    type === mapObjectTypes.area ||
    type === mapObjectTypes.route

/** Is this standalone text (as opposed to a label hanging off a point)? */
export const isStandaloneTextType = (
    type: string | null | undefined
): boolean => type === 'text'

// Draw mode localStorage keys
export const ARROW_DRAW_MODE_KEY = 'arrowDrawMode'
export const TEXT_DRAW_MODE_KEY = 'textDrawMode'
export const PENDING_SHAPE_TYPE_KEY = 'pendingShapeType'
export const PENDING_SHAPE_PROPS_KEY = 'pendingShapeProps'
export const LAST_ADDED_ELEMENT_ID_KEY = 'lastAddedElementId'
export const PENCIL_MODE_KEY = 'pencilMode'
export const PAN_MODE_KEY = 'panMode'

// Geo draw modes. AREA/ROUTE use multi-click vertex placement; POINT is a
// single click-to-place. The active geo type is stashed alongside the flag.
export const DRAW_MODE_KEY = 'drawMode'
export const DRAW_TYPE_KEY = 'drawType'
export const DRAW_PROPS_KEY = 'drawProps'
export const POINT_PLACE_MODE_KEY = 'pointPlaceMode'

// Pin/point counter-scale: 1/scale^resist keeps the pin legible when zoomed
// out. apparent size ∝ scale^(1 - resist), so 0 = scales with the world and
// 1 = fully fixed on screen (see utils/counterScale.ts for the derivation).
export const DEFAULT_RESIST = 0.9

// Map text (text) counter-scale. Text on a map base spans 18 zoom stops
// (map zoom 1..19 against a z16 anchor), and at resist 0 an 18px label renders
// at 18 * 2^(mapZoom - 16) px — 0.3px over a county, which is why map text was
// unreadable anywhere but the anchor zoom. At 0.9 that same label stays within
// roughly 6px..22px across the whole range.
//
// This is the knob to turn when tuning legibility: 1 pins text to a constant
// screen size (true map-label behaviour), 0 restores the old scales-with-the-
// geography model. Per-record `properties.resist` overrides it.
export const TEXT_RESIST = 0.9

// Image counter-scale: none. An image is glued to the map and scales with it,
// like the geography under it (apparent ∝ scale^1). Per-record
// `properties.resist` still overrides it.
export const IMAGE_RESIST = 0

// The user-facing on/off switch for the above is the `zoomResistant` column,
// not metadata: `false` means resist 0, absent/true means TEXT_RESIST. It is
// read by `resolveResist`'s text arm (a text's whole group) only. Every other
// type ignores the column — a circle's label scales with the map (see
// `circleLabelScale` in utils/counterScale.ts).
//
// Fired when that switch is toggled from the properties panel or reverted by
// undo, for text. ElementRenderWrapper freezes each element's
// props at mount, so a column write never reaches the component through React —
// this is the same escape hatch `standaloneTextReverted` uses.
export const TEXT_RESIST_CHANGED_EVENT = 'textResistChanged'

/**
 * "The webfonts have finished loading" — no payload; each listener re-reads its
 * own family and size.
 *
 * Canvas labels are centred on their font's CAP BAND, which can only be
 * measured from the face that is actually resolving (utils/fontMetrics.ts). Our
 * faces are `font-display: swap`, so the first paint happens against a fallback
 * — and a label placed then sits a couple of percent of its size off centre for
 * the rest of the session unless something re-places it. That is this event's
 * whole job. ElementRenderWrapper freezes props at mount, so, as with
 * TEXT_RESIST_CHANGED_EVENT, the news cannot arrive through React.
 */
export const FONTS_LOADED_EVENT = 'fontsLoaded'

/**
 * "Select this element" — `{ id }`. Answered by newCanvas, which owns selection.
 *
 * Paste is the caller: the clone has to take the selection off the element it
 * was copied from, and the clipboard hook has no route into the canvas's
 * pointer handling. Dispatch only after the element has actually mounted (the
 * scene group must exist).
 */
export const SELECT_COMPONENT_EVENT = 'selectComponent'

/**
 * The text-editing handshake between an element's imperative editor (the
 * `<input>`/`<textarea>` overlays in point.tsx and text.tsx) and the mobile
 * chrome that has to drive it.
 *
 * A phone has no Enter or Escape, so an open editor needs on-screen ✓/✗ — and
 * those buttons are React, while the editor is a DOM node created inside a
 * Two.js element component. `START`/`END` announce the editor's lifetime,
 * `COMMIT`/`CANCEL` are the two answers back. Cancel means "put back what was
 * there when the editor opened", which only the editor knows — hence a request
 * rather than a value.
 */
/**
 * "This text's bounds changed — re-box its selection." Carries the element id;
 * every text on the base hears it, only the named one acts.
 *
 * The properties toolbar resizes a text by mutating its Two.Text nodes
 * directly (see `handleTextSizeChange`), which repaints the glyphs but leaves
 * the selection box on the bounds it was built from. What happened next was
 * decided by a focus difference rather than by any deliberate design: Chromium
 * fires `blur` on the text's SVG group when the toolbar takes focus, so
 * `elementOnBlurHandler` hid the stale box; Firefox does not, so it stayed on
 * screen at the old size. One browser silently dropped the selection, the
 * other showed a wrong one.
 *
 * Both are now the same thing — the box is re-measured and kept — which is
 * what the drag-to-resize path (`onResizeMouseMove`) has always done.
 */
export const TEXT_SELECTOR_REFRESH_EVENT = 'textSelectorRefresh'

export const TEXT_EDIT_START_EVENT = 'textEditStart'
export const TEXT_EDIT_END_EVENT = 'textEditEnd'
export const TEXT_EDIT_COMMIT_EVENT = 'commitTextEdit'
export const TEXT_EDIT_CANCEL_EVENT = 'cancelTextEdit'
// The generic point: a small filled circle with an editable label beside it.
// One design, no categories. POINT_RADIUS is the circle radius in surface units
// at scale 1 — the group counter-scales (DEFAULT_RESIST above), so the pin
// stays legible zoomed out. POINT_LABEL_GAP is the clear space between the
// circle's edge and the start of the label.
//
// POINT_COLOR is the circle's shipped colour and the only part the user can
// change. The label is fixed black by design, so a point's name always reads as
// the same annotation ink no matter how the pin itself is coloured. '#000' (not
// '#000000') matches the black the rest of the canvas defaults to — see
// PENCIL_DEFAULT_COLOR — which is also the form themeColorFlip pairs with white.
//
// Points only ever render over the map base, and the basemap has no dark
// variant, so black stays readable in either theme. Ship a dark basemap and
// this needs to become theme-derived ink instead.
export const POINT_RADIUS = 8
export const POINT_LABEL_GAP = 5
export const POINT_COLOR = '#FF5630'
export const POINT_LABEL_COLOR = '#000'

// A white ring around every pin, so it separates from the basemap and from
// other pins or ink of a similar colour. Fixed by design like the label, and
// not stored on the record: a point's `stroke` column mirrors its fill (see
// applyProperty), so it cannot also describe the ring. Width is in surface
// units, and the stroke is centred on the circle's edge, so the pin's visual
// radius is POINT_RADIUS + POINT_BORDER_WIDTH / 2.
export const POINT_BORDER_COLOR = '#fff'
export const POINT_BORDER_WIDTH = 2

// A soft shadow under the ring, so a pin still separates from a pale basemap
// at a distance, where the white ring alone blends into it. Drawn as stacked
// translucent discs behind the pin (spread = how far past the ring's outer
// edge, in surface units), not an SVG filter. Discs are plain geometry: they
// survive every rebuild and both exports, and they scale with the pin.
// Nudged down slightly so it reads as a shadow, not a halo.
export const POINT_SHADOW_LAYERS: readonly { spread: number; alpha: number }[] =
    [
        { spread: 2.5, alpha: 0.08 },
        { spread: 1.25, alpha: 0.16 },
    ]
export const POINT_SHADOW_OFFSET_Y = 0.75

// The map circle's label ink — the DEFAULT, not a fixed value: unlike a point's
// (a 10px pin whose name hangs outside it), a circle's label sits inside a
// filled ring the user colours, so it needs its own control. Matches
// POINT_LABEL_COLOR as the starting point, and carries the same caveat —
// circles only ever render over the basemap, which has no dark variant, so ship
// a dark basemap and this needs to become theme-derived ink instead.
export const CIRCLE_LABEL_COLOR = '#000'
export const POINT_LABEL_FONT_SIZE = 18

// The point label's own size ladder, deliberately tighter than the whiteboard's
// TEXT_SIZES_ARRAY (24–72): a point's label is an annotation hanging off a 10px
// pin, and the whiteboard ladder's SMALLEST step is already larger than the
// design default. `M` is POINT_LABEL_FONT_SIZE, so a point that has never been
// touched reads as M in the toolbar. No mobile variant — a point counter-scales
// to a constant apparent size, so one ladder covers both.
export const POINT_LABEL_SIZES: { label: string; value: number }[] = [
    { label: 'S', value: 14 },
    { label: 'M', value: POINT_LABEL_FONT_SIZE },
    { label: 'L', value: 24 },
    { label: 'XL', value: 32 },
]

/**
 * The point-label size a toolbar size *label* means.
 *
 * The label is the unit the text defaults travel in (`defaultTextSize` is
 * `'S' | 'M' | 'L' | 'XL'`, not a pixel count), which is what lets one default
 * be shared across ladders: pick XL on a map label and a new point comes out at
 * the point ladder's XL, not the whiteboard's 72px. An unknown label falls back
 * to the design default.
 */
export function pointLabelSizeFor(label: string | null | undefined): number {
    return (
        POINT_LABEL_SIZES.find((s) => s.label === label)?.value ??
        POINT_LABEL_FONT_SIZE
    )
}

// Per-type initial defaults for new geo objects (distinct, map-appropriate
// colors from the prototypes). Users recolor afterward via the properties
// toolbar. Kept client-side so geo creation doesn't depend on a DB round-trip.
export const ELEMENT_DEFAULTS: Record<
    MapObjectType,
    { stroke: string; linewidth: number }
> = {
    point: { stroke: POINT_COLOR, linewidth: 3 },
    area: { stroke: '#A32D2D', linewidth: 2 },
    route: { stroke: '#3B82F6', linewidth: 3 },
}

// The map circle is componentType 'circle' + objectClass 'geo' — not a type of
// its own — so it cannot live in ELEMENT_DEFAULTS, which is keyed by
// MapObjectType. Its fill is deliberately NOT the shared `defaultFill`: that
// default is the whiteboard's pale shape fill, which at 50% over a basemap is
// invisible. Stroke is not listed because a new map circle takes its fill as
// its stroke, so the two read as one mark until the user separates them.
//
// `linewidth: 0` is the border: a radius map is BORDERLESS. It answers "what is
// within this distance", and a hard ring reads as an edge the data does not
// have — the translucent disc alone is the mark. Nothing offers a width for it
// (see SETS.CIRCLE and PRESET_STYLE_KEYS.circle), so the value is not a default
// the user can move off; it is the shape of the mark.
export const CIRCLE_DEFAULTS = {
    fill: '#A32D2D',
    linewidth: 0,
    opacity: 0.5,
} as const

// Multi-click draw preview (area / route / curvedLine): the dots and rubber-band
// are a *drawing aid*, so they are sized in SCREEN pixels and divided by the
// live camera scale before going into the scene. Without that they are plain
// surface-space marks, and on the map base — where zooming out drives the ZUI
// scale far below 1 — a 4px dot and a 2px line render sub-pixel and effectively
// disappear at the exact zoom levels where a route is easiest to trace.
//
// PREVIEW_MIN_STROKE_PX is a floor, not a replacement: a user who picked a
// fat stroke still previews it fat.
export const PREVIEW_DOT_PX = 5
export const PREVIEW_MIN_STROKE_PX = 3
// Opacity for the committed segments vs. the live rubber-band to the cursor.
// The rubber-band stays lighter so it reads as provisional, but not so light
// that it vanishes against a busy basemap.
export const PREVIEW_SEGMENT_OPACITY = 0.85
export const PREVIEW_RUBBER_OPACITY = 0.6

// Minimum vertices required to finish a multi-click draw.
export const MIN_VERTICES: Record<'area' | 'route', number> = {
    area: 3,
    route: 2,
}

// Default ink for strokes. Pure black so it flips cleanly to white on a theme
// toggle (see themeColorFlip): #000 in light, #fff in dark.
export const PENCIL_DEFAULT_COLOR = '#000'
export const SHAPE_DEFAULT_STROKE = '#000'

// Draft persistence
export const DRAFT_STORAGE_KEY = 'mapcursor_local_draft'
export const DRAFT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000
export const BACKGROUND_BASE_STORAGE_KEY = 'mapcursor_background_base_id'
export const STORAGE_QUOTA_ERROR_NAME = 'QuotaExceededError'

// Bottom offset of the hint slot from the bottom of the page, shared by #tool-hint
// and #geo-text-zoom-hint — only ever one of them is up at a time, and they
// must land in the same place.
export const HINT_SLOT_BOTTOM = '20px'

// On mobile the toolbar is pinned bottom-left, so there is no "below the
// toolbar" slot — the hint goes to the empty strip along the TOP instead,
// between the menu button and the share button. Both of those are 46px tall
// and sit at top: 8px, so the hint shares that line and grows downward.
//
// The insets clear each neighbour by 8px: the menu is 40px wide at left 10px,
// and the share button is 46px wide at a 15px right inset. If either of those
// buttons is ever resized, these move with them.
// In the canvas-chrome band (10-20), under the toast and well under a modal.
// Note this cannot be tuned to sit below the menu drawer: that drawer's inner
// z-20 is trapped in the stacking context its own wrapper creates at z-10, so
// the hint is above it at any value in this band. The mobile copy is kept to
// two lines instead, which keeps the pill clear of the drawer entirely.
export const HINT_SLOT_Z = 20

export const HINT_SLOT_MOBILE_TOP = '8px'
export const HINT_SLOT_MOBILE_LEFT = '58px'
export const HINT_SLOT_MOBILE_RIGHT = '69px'

// One-shot tip pointing at the "Zoom resistant" switch, shown under the primary
// toolbar the first time a user zooms a map base that has text on it. Same
// Set once, never shown again.
export const TEXT_ZOOM_HINT_DISMISSED_KEY = 'mapcursor_text_zoom_hint_dismissed'

// Stable identity for the local (unsaved) base at `/`.
//
// `localBaseId` normally comes from the local draft, which keys the viewport and
// base-type sidecars. But a draft only exists once the user has DRAWN something
// — so someone who lands on `/`, switches to the map base and picks a starting
// city has nothing to carry that id across a refresh, and would be asked the
// same question again on every reload.
//
// This key is claimed lazily: nothing writes it just for visiting `/`. It is
// written the first time an answer worth remembering is stored against the
// local base (see `rememberLocalBaseId` in base.tsx), which keeps an untouched
// visit byte-identical in localStorage, exactly like the base-type sidecar.
export const LOCAL_BASE_ID_KEY = 'mapcursor_local_base_id'

// Perf-testing flag: the O(N) per-frame scene scans that ride along with
// dragging — `reanchorArrowsForShape` (legacy move path), `shapeHasBoundArrows`
// (CSS fast-path eligibility) and the hover-detect endpoint scan. Disable to
// isolate their cost from the Two.js render/paint cost during stress tests.
// Read live (see `src/utils/featureFlags.ts`). Defaults to enabled.
export const DRAG_SCANS_ENABLED_KEY = 'mapcursor_drag_scans_enabled'

// Feature-flag preference: viewport culling. Hides scene elements whose
// screen-space bounds fall outside the viewport so the SVG renderer skips
// painting them — the lever against the pan/zoom paint cost on dense bases.
// Read live (see `src/utils/featureFlags.ts`). Defaults to disabled.
export const VIEWPORT_CULLING_ENABLED_KEY = 'mapcursor_viewport_culling_enabled'

// Snap route drawing to the roads in the basemap's vector tiles. Default ON —
// following a street is what a route on a map is FOR, and the straight-line
// draw is the special case (hold Alt to get it back for one segment).
export const ROUTE_SNAP_ENABLED_KEY = 'mapcursor_route_snap_enabled'

// Screen-pixel travel below which a route draw reuses the standing snapped
// preview instead of searching the road graph again. Pointers fire at 120Hz+
// and a graph search is real work; three pixels of hand tremor cannot change
// which street the cursor is on.
export const ROUTE_SNAP_MIN_MOVE_PX = 3

// Canvas rendering constants
export const HOVER_THRESHOLD = 15
export const HOVER_COLOR = 'rgba(105, 101, 219, 0.7)'
export const SELECTION_PREVIEW_STROKE = '#505F79'
export const DEFAULT_PREVIEW_OPACITY = 0.6
export const LINE_HEIGHT_MULTIPLIER = 1.6
export const PENCIL_DISTANCE_THROTTLE = 3
export const DEFAULT_TEXT_SIZE = 36
