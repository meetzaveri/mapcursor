import { MAP_ZOOM_LIMITS } from './zoomLimits'
import type { MapAnchor } from './types'

const TILE_SIZE = 512

function project(
    lngLat: [number, number],
    zoom: number
): { x: number; y: number } {
    const worldSize = TILE_SIZE * Math.pow(2, zoom)
    const [lng, lat] = lngLat
    const clampedLat = Math.max(-85.051129, Math.min(85.051129, lat))
    const sinLat = Math.sin((clampedLat * Math.PI) / 180)
    return {
        x: worldSize * (lng / 360 + 0.5),
        y:
            worldSize *
            (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)),
    }
}

export function lngLatToSurface(
    lngLat: [number, number],
    anchor: MapAnchor
): { x: number; y: number } {
    const target = project(lngLat, anchor.zoom)
    const origin = project(anchor.lngLat, anchor.zoom)
    return { x: target.x - origin.x, y: target.y - origin.y }
}

export function surfaceToLngLat(
    point: { x: number; y: number },
    anchor: MapAnchor
): [number, number] {
    const worldSize = TILE_SIZE * Math.pow(2, anchor.zoom)
    const origin = project(anchor.lngLat, anchor.zoom)
    const x = origin.x + point.x
    const y = origin.y + point.y

    const rawLng = (x / worldSize - 0.5) * 360
    const lng = ((((rawLng + 180) % 360) + 360) % 360) - 180
    const lat =
        (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / worldSize))) * 180) /
        Math.PI
    return [lng, lat]
}

export function mapZoomForScale(scale: number, anchor: MapAnchor): number {
    return anchor.zoom + Math.log2(scale)
}

export function scaleForMapZoom(mapZoom: number, anchor: MapAnchor): number {
    const raw = Math.pow(2, mapZoom - anchor.zoom)
    const { min, max } = MAP_ZOOM_LIMITS
    return Math.max(min, Math.min(max, raw))
}

export function surfaceUnitsPerMeter(anchor: MapAnchor): number {
    const lat = Math.max(-85.051129, Math.min(85.051129, anchor.lngLat[1]))
    const metersPerUnit =
        (40075016.686 * Math.cos((lat * Math.PI) / 180)) /
        (TILE_SIZE * Math.pow(2, anchor.zoom))
    return 1 / metersPerUnit
}

export function makeLngLatToSurface(
    anchor: MapAnchor
): (lng: number, lat: number) => { x: number; y: number } {
    const worldSize = TILE_SIZE * Math.pow(2, anchor.zoom)
    const origin = project(anchor.lngLat, anchor.zoom)
    return (lng: number, lat: number) => {
        const clampedLat = Math.max(-85.051129, Math.min(85.051129, lat))
        const sinLat = Math.sin((clampedLat * Math.PI) / 180)
        return {
            x: worldSize * (lng / 360 + 0.5) - origin.x,
            y:
                worldSize *
                    (0.5 -
                        Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) -
                origin.y,
        }
    }
}
