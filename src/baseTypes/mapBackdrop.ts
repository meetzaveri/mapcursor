// The map backdrop — an OpenStreetMap basemap slaved to the ZUI camera.
//
// The contract: **ink never moves**. Element coordinates stay in Two.js surface
// space; instead the map is jumped so that surface (0,0) always sits over
// `anchor.lngLat`. Pan/zoom the canvas and the map follows, which is what makes
// annotations behave as if pinned to the geography.
//
// maplibre-gl (~1MB) is imported dynamically here and nowhere else, so it lands
// after first paint rather than blocking it.

import type {
    MapBackdropConfig,
    MapBackdropHandle,
    MapBackdropMountContext,
    MapAnchor,
} from './types'
import type { CameraChangeEvent } from '../types/base'
import { E2E_HOOKS } from '../utils/e2eHooks'
import {
    resolveTimezoneCity,
    DEFAULT_ANCHOR_ZOOM,
} from '../utils/timezoneCities'
import { makeLngLatToSurface, surfaceUnitsPerMeter } from './mercator'
import { setRoadSource, type RoadSnapshot } from './roadSource'
import { findRoadSource } from './roadSchema'
import { addAirportLabels } from './airportLabels'
import type { RoadPolyline } from '../utils/roadGraph'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapLibreMap = any

/**
 * CARTO's Positron basemap — OpenStreetMap data drawn as *vector* tiles with a
 * muted, low-contrast palette, so the map reads as a backdrop and the ink on top
 * stays the loudest thing on screen. No API key.
 *
 * Why not osm.org's own tiles: `tile.openstreetmap.org` serves exactly one
 * design (Standard/Carto) as pre-rendered PNGs with labels baked into the
 * pixels — there is nothing to restyle, and it caps out at z19. A vector style
 * is client-rendered, so labels stay sharp at fractional zoom and the whole
 * palette is ours to override later.
 *
 * Kept as a single exported constant on purpose: swapping providers (or moving
 * to self-hosted tiles) stays a one-line change here rather than a hunt through
 * the provider. Attribution ships inside the style's TileJSON — both CARTO's and
 * OSM's — so `attributionControl` surfaces it without our help.
 */
const POSITRON_STYLE_URL =
    'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

/**
 * The key goes on the style URL only: CARTO puts it on the tile, sprite and
 * glyph URLs inside the style it returns, so MapLibre needs no
 * `transformRequest`. It ships in the client bundle like every `VITE_` var, so
 * it is public. Restricting it by domain is CARTO's job, not ours. Unset falls
 * back to the keyless endpoint, so a build without the var still has a map.
 */
const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY

export const BASEMAP_STYLE_URL = CARTO_API_KEY
    ? `${POSITRON_STYLE_URL}?key=${encodeURIComponent(CARTO_API_KEY)}`
    : POSITRON_STYLE_URL

/**
 * Water, pushed back toward being water.
 *
 * Positron ships water at `#d4dadc` and rivers at `#d1dbdf` — hue ~195°, but
 * around 6% saturation, so the eye reads both as grey. That is deliberate on
 * CARTO's part: Positron is built to sit UNDER data, and every feature is
 * desaturated so the overlay carries the colour. It also means a lake reads as
 * a field and a river as a road, which on a map people annotate geography with
 * is a loss.
 *
 * These lift the saturation just far enough to be legible as water and no
 * further. The ceiling is set by the chrome: the UI accent is indigo (~243°)
 * precisely because blue belongs to water, and that separation only holds while
 * water stays pale. Saturate past roughly this point and the basemap starts
 * competing with the ink drawn on it — which is the problem Positron was
 * chosen to avoid.
 *
 * Applied per layer rather than by swapping styles: Voyager has bluer water
 * (`#b0d0d6`) but colours roads, parks and landuse too, and the calm ground is
 * the reason Positron is here.
 */
const WATER_FILL = '#c2d8e3'
const WATERWAY_LINE = '#b8d2df'

/**
 * Repaint the water layers, once the style has them.
 *
 * `setPaintProperty` throws if the layer is not in the style yet, and a style
 * loaded over the network is not ready when `new Map()` returns — hence the
 * `styledata` hook rather than a call after construction. `styledata` fires on
 * every style mutation, not just the first, so each layer is checked with
 * `getLayer` and the whole thing is a no-op once applied. Failing here must
 * never take the backdrop down: worst case the map keeps CARTO's grey.
 */
function paintWater(map: MapLibreMap): void {
    try {
        if (map.getLayer('water')) {
            map.setPaintProperty('water', 'fill-color', WATER_FILL)
        }
        if (map.getLayer('waterway')) {
            map.setPaintProperty('waterway', 'line-color', WATERWAY_LINE)
        }
    } catch {
        // A style without these layers, or one mid-swap. Not worth a broken map.
    }
}

// DEFAULT_ANCHOR_ZOOM lives in utils/timezoneCities — see the note there.

// Zoom limits live in ./zoomLimits — the camera needs them before this
// (dynamically imported) provider exists. See the note there.

const OPAQUE_BACKDROP_CLASS = 'mc-opaque-backdrop'
const MAP_CONTAINER_ID = 'mc-map-bg'

interface MapHandle extends MapBackdropHandle {
    map: MapLibreMap
    anchor: MapAnchor
    /** Last camera seen, so an async anchor change can re-sync immediately. */
    lastCamera: CameraChangeEvent | null
    container: HTMLElement
    disposed: boolean
}

/**
 * Where a base opens when it has never been told a place.
 *
 * Derived from the browser's IANA timezone — no permission prompt, no network,
 * available synchronously so the map's very first frame is already in roughly
 * the right part of the world. It is only a *starting* view: the host offers
 * the user a place to search on first visit (MapStartLocationModal), and the
 * place search stays available forever after.
 *
 * This deliberately replaced an *automatic* `navigator.geolocation` call, which
 * prompted the user unbidden the instant they switched base, never fired at all
 * on some mobile browsers, and left everyone else on a hard-coded city.
 *
 * Geolocation is back in `utils/geolocation.ts`, but only behind an explicit
 * tap in MapStartLocationModal — never on mount. That is what answers the first
 * objection; the other two are answered by a timeout backstop and by this
 * function, which is the fallback every failed lookup lands on. So this is
 * still the anchor a base opens with, and the prompt only ever replaces it.
 */
function defaultAnchor(): MapAnchor {
    return {
        lngLat: [...resolveTimezoneCity().lngLat],
        zoom: DEFAULT_ANCHOR_ZOOM,
    }
}

/**
 * Mirrors the Two.js ZUI camera onto the MapLibre map.
 *
 * Two.js: `screenPoint = sceneTranslation + surfacePoint * sceneScale`. We treat
 * surface (0,0) at scale 1 as `anchor.lngLat` at `anchor.zoom`, so
 * `targetZoom = anchor.zoom + log2(scale)` keeps tile resolution in lockstep
 * with the canvas.
 */
function syncMapToZui(handle: MapHandle, camera: CameraChangeEvent): void {
    const { map, anchor } = handle
    if (!map || !anchor) return

    const { scale, tx, ty } = camera
    if (!Number.isFinite(scale) || scale <= 0) return

    const targetZoom = anchor.zoom + Math.log2(scale)
    const rect = handle.container.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2

    // Step 1: park the map on the anchor at the new zoom, so project() returns
    // pixel coordinates in that zoom's reference frame.
    map.jumpTo({ center: anchor.lngLat, zoom: targetZoom })

    // Step 2: shift so the surface origin lands at (tx, ty) on screen.
    const anchorPoint = map.project(anchor.lngLat)
    const desiredCenter = map.unproject([
        anchorPoint.x + (cx - tx),
        anchorPoint.y + (cy - ty),
    ])
    map.jumpTo({ center: desiredCenter, zoom: targetZoom })
}

// ── Roads, for snap-to-road route drawing ────────────────────────────────────

/**
 * Below this map zoom routes draw straight.
 *
 * Zoomed out, the tiles carry fewer roads (z8 is highways and main roads
 * only), and that is fine: at city-to-region scale those are the roads a route
 * is drawn along. Snapping used to stop at z12, partly for that reason and
 * partly because coarse tiles left the network in pieces. roadSnap.ts now
 * welds to the tile grid (`roadWeldMeters`), which holds together down to z8.
 * Past that the view is state-wide and a route is a sketch, not a road trace.
 */
export const MIN_ROAD_SNAP_ZOOM = 8

/**
 * Cap on how much geometry one rebuild will take. A screenful of dense city at
 * z17 runs to a few thousand linestrings; this only bites on a pathological
 * viewport, and losing the tail of the list degrades snapping at the screen
 * edge rather than stalling the draw.
 */
const MAX_ROAD_POLYLINES = 12000

/**
 * Read the roads under the current viewport, in surface space.
 *
 * `querySourceFeatures` — not `queryRenderedFeatures`. The rendered query is
 * gated on what the STYLE paints, which for a backdrop we deliberately keep
 * muted is the wrong question entirely; the source query returns what is in the
 * loaded tiles regardless of how (or whether) it is drawn.
 *
 * Two consequences of reading tiles rather than a routing service. Geometry is
 * clipped per tile, so one road arrives as several features and a junction
 * arrives as coincident vertices in two of them — both handled by node welding
 * in `buildRoadGraph`. And coverage is exactly the loaded viewport: pan, and the
 * caller must rebuild.
 */
function readRoadSnapshot(handle: MapHandle): RoadSnapshot | null {
    const { map, anchor } = handle
    if (handle.disposed || !map) return null

    const mapZoom = map.getZoom()
    if (!Number.isFinite(mapZoom) || mapZoom < MIN_ROAD_SNAP_ZOOM) return null
    // The road source is discovered from the style, not hard-coded: CARTO
    // renamed it when it moved to Protomaps tiles. See roadSchema.ts.
    const road = findRoadSource(map)
    if (!road) return null
    const { sourceId, schema } = road

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let features: any[]
    try {
        features = map.querySourceFeatures(sourceId, {
            sourceLayer: schema.sourceLayer,
        })
    } catch (err) {
        console.error('Road source query failed', err)
        return null
    }
    if (!features || features.length === 0) return null

    const toSurface = makeLngLatToSurface(anchor)
    const polylines: RoadPolyline[] = []

    const pushLine = (coords: [number, number][], roadClass: string): void => {
        if (!Array.isArray(coords) || coords.length < 2) return
        const points = coords.map(([lng, lat]) => toSurface(lng, lat))
        polylines.push({ roadClass, points })
    }

    for (const feature of features) {
        if (polylines.length >= MAX_ROAD_POLYLINES) break
        const props = feature?.properties ?? {}
        if (schema.isExcluded(props)) continue
        const roadClass = schema.roadClass(props)
        const geometry = feature?.geometry
        if (!geometry) continue
        if (geometry.type === 'LineString') {
            pushLine(geometry.coordinates, roadClass)
        } else if (geometry.type === 'MultiLineString') {
            for (const part of geometry.coordinates) {
                pushLine(part, roadClass)
            }
        }
    }

    if (polylines.length === 0) return null
    return {
        polylines,
        unitsPerMeter: surfaceUnitsPerMeter(anchor),
        mapZoom,
        latitude: map.getCenter().lat,
    }
}

export const mapBackdrop = {
    async mount(
        container: HTMLElement,
        config: MapBackdropConfig,
        // Unused: the anchor is resolved synchronously from the timezone, and a
        // real choice arrives later via setAnchor (the host persists it).
        _ctx: MapBackdropMountContext
    ): Promise<MapBackdropHandle> {
        // maplibre v6 ships ESM-only with named exports (no default export),
        // so take the module namespace itself.
        const [maplibregl, , { default: workerUrl }] = await Promise.all([
            import('maplibre-gl'),
            // Bundled into this lazy chunk so it lands after first paint.
            import('maplibre-gl/dist/maplibre-gl.css'),
            // v6 resolves its worker relative to its own module URL, which
            // Vite's dep pre-bundling relocates, so the default URL 404s and
            // no tiles render. Hand it a Vite-managed URL instead. The worker
            // file is self-contained, so emitting it as a plain asset works.
            import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
        ])
        maplibregl.setWorkerUrl(workerUrl)

        const mapEl = document.createElement('div')
        mapEl.id = MAP_CONTAINER_ID
        container.appendChild(mapEl)
        document.body.classList.add(OPAQUE_BACKDROP_CLASS)

        // A persisted anchor is authoritative: the saved Two.js viewport was
        // recorded against it, so reusing it is what makes a refresh land on the
        // same view. Only a base that has never picked a place falls back to
        // the timezone guess — and the host then offers to replace it.
        const saved = config.mapAnchor
        const anchor: MapAnchor = saved
            ? { lngLat: [...saved.lngLat], zoom: saved.zoom }
            : defaultAnchor()

        const map = new maplibregl.Map({
            container: mapEl,
            style: BASEMAP_STYLE_URL,
            center: anchor.lngLat,
            zoom: anchor.zoom,
            // The Two.js canvas above owns every gesture; the map only follows.
            interactive: false,
            attributionControl: { compact: true },
            fadeDuration: 0,
            // Required for captureBackdrop: without it the WebGL drawing buffer
            // is cleared after each frame and toDataURL returns a blank image.
            // (maplibre v5 moved this under canvasContextAttributes.)
            canvasContextAttributes: { preserveDrawingBuffer: true },
            // Accept every centre we ask for, unclamped.
            //
            // By default maplibre keeps the world filling the viewport, which
            // silently pulls the centre back toward the equator once you are
            // zoomed far enough out. Here that clamp is corruption: the map is a
            // slave to the ZUI camera, so a centre we asked for and didn't get
            // means the backdrop no longer matches the ink — pan north at world
            // zoom and every route slides off its geography by however much
            // maplibre decided to hold back. We own the camera; the map follows.
            transformConstrain: (lngLat, zoom) => ({
                center: lngLat,
                zoom: zoom ?? 0,
            }),
        })

        // Positron's water is grey by design; see paintWater. Its land is
        // left as CARTO draws it: the faint tints leave room for the areas
        // people draw on top. It never names airports; see airportLabels.ts.
        map.on('styledata', () => {
            paintWater(map)
            addAirportLabels(map)
        })

        const handle: MapHandle = {
            map,
            anchor,
            lastCamera: null,
            container: mapEl,
            disposed: false,
        }

        // Debug handle for inspecting the camera mirror from the console or a
        // headless harness — same pattern, and same gate, as __mcZui / __mcTwo
        // in newCanvas. See src/utils/e2eHooks.ts.
        if (E2E_HOOKS) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(window as any).__mcMap = handle
        }

        // Hand the road snapper a way to read the tiles without importing
        // maplibre itself. Cleared in unmount.
        setRoadSource(() => readRoadSnapshot(handle))

        return handle
    },

    syncCamera(handle: MapBackdropHandle, camera: CameraChangeEvent): void {
        const h = handle as MapHandle
        if (h.disposed) return
        h.lastCamera = camera
        syncMapToZui(h, camera)
    },

    setAnchor(handle: MapBackdropHandle, anchor: MapAnchor): void {
        const h = handle as MapHandle
        if (h.disposed) return
        h.anchor = { lngLat: [...anchor.lngLat], zoom: anchor.zoom }
        if (h.lastCamera) syncMapToZui(h, h.lastCamera)
    },

    readConfig(handle: MapBackdropHandle): Partial<MapBackdropConfig> {
        const h = handle as MapHandle
        return { mapAnchor: h.anchor }
    },

    async captureBackdrop(handle: MapBackdropHandle): Promise<string | null> {
        const h = handle as MapHandle
        if (h.disposed || !h.map) return null
        try {
            // preserveDrawingBuffer keeps the last rendered frame readable, so
            // there's no need to force a repaint first. Throws SecurityError if
            // the style's sprite sheet ever arrives without CORS headers — the
            // vector tiles themselves are ArrayBuffers and can't taint the
            // canvas, but the sprite is an <img> (CARTO sends `allow-origin: *`).
            return h.map.getCanvas().toDataURL('image/png')
        } catch (err) {
            console.error('Map backdrop capture failed', err)
            return null
        }
    },

    unmount(handle: MapBackdropHandle): void {
        const h = handle as MapHandle
        if (h.disposed) return
        h.disposed = true
        setRoadSource(null)
        document.body.classList.remove(OPAQUE_BACKDROP_CLASS)
        try {
            h.map?.remove()
        } catch (err) {
            console.error('Map teardown failed', err)
        }
        h.container?.remove()
    },
}

export default mapBackdrop
