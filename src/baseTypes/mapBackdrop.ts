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

const POSITRON_STYLE_URL =
    'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY

export const BASEMAP_STYLE_URL = CARTO_API_KEY
    ? `${POSITRON_STYLE_URL}?key=${encodeURIComponent(CARTO_API_KEY)}`
    : POSITRON_STYLE_URL

const WATER_FILL = '#c2d8e3'
const WATERWAY_LINE = '#b8d2df'

function paintWater(map: MapLibreMap): void {
    try {
        if (map.getLayer('water')) {
            map.setPaintProperty('water', 'fill-color', WATER_FILL)
        }
        if (map.getLayer('waterway')) {
            map.setPaintProperty('waterway', 'line-color', WATERWAY_LINE)
        }
    } catch {}
}

const OPAQUE_BACKDROP_CLASS = 'mc-opaque-backdrop'
const MAP_CONTAINER_ID = 'mc-map-bg'

interface MapHandle extends MapBackdropHandle {
    map: MapLibreMap
    anchor: MapAnchor
    lastCamera: CameraChangeEvent | null
    container: HTMLElement
    disposed: boolean
}

function defaultAnchor(): MapAnchor {
    return {
        lngLat: [...resolveTimezoneCity().lngLat],
        zoom: DEFAULT_ANCHOR_ZOOM,
    }
}

function syncMapToZui(handle: MapHandle, camera: CameraChangeEvent): void {
    const { map, anchor } = handle
    if (!map || !anchor) return

    const { scale, tx, ty } = camera
    if (!Number.isFinite(scale) || scale <= 0) return

    const targetZoom = anchor.zoom + Math.log2(scale)
    const rect = handle.container.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2

    map.jumpTo({ center: anchor.lngLat, zoom: targetZoom })

    const anchorPoint = map.project(anchor.lngLat)
    const desiredCenter = map.unproject([
        anchorPoint.x + (cx - tx),
        anchorPoint.y + (cy - ty),
    ])
    map.jumpTo({ center: desiredCenter, zoom: targetZoom })
}

export const MIN_ROAD_SNAP_ZOOM = 8

const MAX_ROAD_POLYLINES = 12000

function readRoadSnapshot(handle: MapHandle): RoadSnapshot | null {
    const { map, anchor } = handle
    if (handle.disposed || !map) return null

    const mapZoom = map.getZoom()
    if (!Number.isFinite(mapZoom) || mapZoom < MIN_ROAD_SNAP_ZOOM) return null
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
        ctx: MapBackdropMountContext
    ): Promise<MapBackdropHandle> {
        const [maplibregl, , { default: workerUrl }] = await Promise.all([
            import('maplibre-gl'),
            import('maplibre-gl/dist/maplibre-gl.css'),
            import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
        ])
        maplibregl.setWorkerUrl(workerUrl)

        const mapEl = document.createElement('div')
        mapEl.id = MAP_CONTAINER_ID
        container.appendChild(mapEl)
        document.body.classList.add(OPAQUE_BACKDROP_CLASS)

        const saved = config.mapAnchor
        const anchor: MapAnchor = saved
            ? { lngLat: [...saved.lngLat], zoom: saved.zoom }
            : defaultAnchor()

        const map = new maplibregl.Map({
            container: mapEl,
            style: BASEMAP_STYLE_URL,
            center: anchor.lngLat,
            zoom: anchor.zoom,
            interactive: false,
            attributionControl: { compact: true },
            fadeDuration: 0,
            canvasContextAttributes: { preserveDrawingBuffer: true },
            transformConstrain: (lngLat, zoom) => ({
                center: lngLat,
                zoom: zoom ?? 0,
            }),
        })

        map.on('styledata', () => {
            paintWater(map)
            addAirportLabels(map)
        })
        map.once('load', () => ctx.onFirstPaint())

        const handle: MapHandle = {
            map,
            anchor,
            lastCamera: null,
            container: mapEl,
            disposed: false,
        }

        if (E2E_HOOKS) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(window as any).__mcMap = handle
        }

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
