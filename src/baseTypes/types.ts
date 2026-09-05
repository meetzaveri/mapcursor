// The map backdrop — the substrate every base is drawn on.
//
// A **base** is the workspace: the document a user opens, shares and persists.
// There is exactly one substrate under it, a MapLibre basemap, so there is no
// longer a "base type" to choose. What used to be a swappable `BaseTypeProvider`
// is now a single module (`mapType.ts`) and this file holds only the shapes the
// host and that module pass between them.
//
// The critical property is unchanged: **ink lives in Two.js surface space**.
// Element coordinates are never rewritten; the map is jumped so that surface
// (0,0) always sits over `anchor.lngLat`. That is what makes annotations behave
// as if pinned to the geography.

import type { CameraChangeEvent } from '../types/base'

/** Where a base is pinned. `lngLat` is [lng, lat] — MapLibre's order. */
export interface MapAnchor {
    lngLat: [number, number]
    zoom: number
}

/**
 * Persisted per-base backdrop state, written to `mapcursor_map_anchor_<baseId>`.
 *
 * The anchor is the **georeference**: every element's stored x/y only means
 * somewhere on Earth relative to it. Losing it scatters the ink, which is why
 * the server row carries a copy too (see `serverConfig.ts`).
 */
export interface MapBackdropConfig {
    mapAnchor?: MapAnchor | null
}

/**
 * Opaque instance returned by `mount`, carrying the MapLibre map. No caller
 * outside `mapType.ts` should reach into it.
 */
export interface MapBackdropHandle {
    readonly disposed: boolean
}

/**
 * Host callbacks handed to the backdrop at mount. The backdrop can't always
 * know its final config synchronously, so it reports back through here rather
 * than the host having to poll.
 */
export interface MapBackdropMountContext {
    /** Persist a partial config update for the current base. */
    saveConfig(patch: Partial<MapBackdropConfig>): void
}

/**
 * Zoom-button step, in ZUI zoom units (log2 of scale — 1 doubles the scale).
 * One whole map zoom level per click, matching every other map UI and making
 * the 18-level range crossable.
 */
export const MAP_ZOOM_STEP = 1

export type { CameraChangeEvent }
