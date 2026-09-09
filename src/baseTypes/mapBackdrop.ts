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
export const BASEMAP_STYLE_URL =
    'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

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

/** The vector source id in the Positron style, and the layer roads live in. */
const ROAD_SOURCE_ID = 'carto'
const ROAD_SOURCE_LAYER = 'transportation'

/**
 * Below this map zoom the tileset carries only the arterial network — minor
 * roads, service roads and paths simply are not in the tile, so snapping would
 * drag a route onto a main road a kilometre away and look broken rather than
 * absent. Refusing outright, and letting the caller draw straight, is the
 * honest answer.
 */
export const MIN_ROAD_SNAP_ZOOM = 12

/**
 * OMT `transportation` classes that are not roads a route can be drawn along.
 *
 * Rail and aerialway are the ones that actually bite: they cross the road
 * network constantly, share no junctions with it, and would happily capture a
 * cursor that strayed over a level crossing. Ferries are excluded for the same
 * reason. Paths and tracks are deliberately KEPT — a walking route down a
 * footpath is exactly the thing this feature is for.
 */
const NON_ROAD_CLASSES = new Set([
    'rail',
    'transit',
    'aerialway',
    'ferry',
    'raceway',
])

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
    if (!map.getSource(ROAD_SOURCE_ID)) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let features: any[]
    try {
        features = map.querySourceFeatures(ROAD_SOURCE_ID, {
            sourceLayer: ROAD_SOURCE_LAYER,
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
        const roadClass = String(feature?.properties?.class ?? '')
        if (NON_ROAD_CLASSES.has(roadClass)) continue
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
        const [{ default: maplibregl }] = await Promise.all([
            import('maplibre-gl'),
            // Bundled into this lazy chunk so it lands after first paint.
            import('maplibre-gl/dist/maplibre-gl.css'),
        ])

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
