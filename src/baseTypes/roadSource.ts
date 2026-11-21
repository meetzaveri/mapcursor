import type { RoadPolyline } from '../utils/roadGraph'

export interface RoadSnapshot {
    polylines: RoadPolyline[]
    unitsPerMeter: number
    mapZoom: number
    latitude: number
}

export type RoadSource = () => RoadSnapshot | null

let source: RoadSource | null = null

export function setRoadSource(fn: RoadSource | null): void {
    source = fn
}

export function readRoads(): RoadSnapshot | null {
    if (!source) return null
    try {
        return source()
    } catch (err) {
        console.error('Road source read failed', err)
        return null
    }
}
