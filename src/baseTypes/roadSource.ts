// The one seam between MapLibre and the road snapper.
//
// `mapBackdrop.ts` is the only module allowed to import maplibre-gl (it carries
// the ~1MB lazy chunk), and the snapper must not drag that into the main
// bundle. So the backdrop REGISTERS a reader here on mount, and the snapper
// pulls plain surface-space polylines through it — no map object ever crosses.
//
// Same shape as the existing camera bridge: a module-level slot, written once
// at mount and cleared on unmount, read from Two.js's stale-closure event
// handlers where a React prop could never reach.

import type { RoadPolyline } from '../utils/roadGraph'

/** One reading of the roads currently in the loaded tiles. */
export interface RoadSnapshot {
    polylines: RoadPolyline[]
    /** From `surfaceUnitsPerMeter(anchor)` — real-world tolerances need it. */
    unitsPerMeter: number
    /** Live map zoom: the coarser the tiles, the wider the snapper's weld. */
    mapZoom: number
    /** Latitude of the view, for converting tile steps to metres. */
    latitude: number
}

export type RoadSource = () => RoadSnapshot | null

let source: RoadSource | null = null

export function setRoadSource(fn: RoadSource | null): void {
    source = fn
}

/**
 * Read the roads on screen. `null` whenever snapping cannot work — no map
 * mounted, tiles still loading, or zoomed out past MIN_ROAD_SNAP_ZOOM.
 */
export function readRoads(): RoadSnapshot | null {
    if (!source) return null
    try {
        return source()
    } catch (err) {
        // A failed read must degrade to unsnapped drawing, never break the tool.
        console.error('Road source read failed', err)
        return null
    }
}
