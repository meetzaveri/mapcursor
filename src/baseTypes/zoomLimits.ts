// How far the camera may zoom, as ZUI scale.
//
// Kept in its own module — with no dependencies beyond the anchor zoom — because
// the camera needs these BEFORE the backdrop exists. `mapType.ts` carries ~1MB of
// maplibre behind a dynamic import, so on a page load the canvas is created and
// the saved viewport restored while that chunk is still in flight. This table is
// plain arithmetic, so the camera can be given the right range immediately.

import { DEFAULT_ANCHOR_ZOOM } from '../utils/timezoneCities'

export interface ZoomLimits {
    min: number
    max: number
}

/**
 * The map zoom range the camera can reach, and — through
 * `mapZoom = anchor.zoom + log2(zuiScale)` — the ZUI scale limits that produce
 * it. z1 is the whole world in view; z19 is OSM's deepest tile.
 *
 * The relation between the two zooms is fixed (it is what keeps ink glued to the
 * map), so the only way to widen what the user can see is to widen the scale
 * range itself.
 */
const MIN_MAP_ZOOM = 1
const MAX_MAP_ZOOM = 19

export const MAP_ZOOM_LIMITS: ZoomLimits = {
    min: Math.pow(2, MIN_MAP_ZOOM - DEFAULT_ANCHOR_ZOOM),
    max: Math.pow(2, MAX_MAP_ZOOM - DEFAULT_ANCHOR_ZOOM),
}
