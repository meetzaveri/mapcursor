import { DEFAULT_ANCHOR_ZOOM } from '../utils/timezoneCities'

export interface ZoomLimits {
    min: number
    max: number
}

const MIN_MAP_ZOOM = 1
const MAX_MAP_ZOOM = 19

export const MAP_ZOOM_LIMITS: ZoomLimits = {
    min: Math.pow(2, MIN_MAP_ZOOM - DEFAULT_ANCHOR_ZOOM),
    max: Math.pow(2, MAX_MAP_ZOOM - DEFAULT_ANCHOR_ZOOM),
}
