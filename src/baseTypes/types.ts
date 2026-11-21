import type { CameraChangeEvent } from '../types/base'

export interface MapAnchor {
    lngLat: [number, number]
    zoom: number
}

export interface MapBackdropConfig {
    mapAnchor?: MapAnchor | null
}

export interface MapBackdropHandle {
    readonly disposed: boolean
}

export interface MapBackdropMountContext {
    saveConfig(patch: Partial<MapBackdropConfig>): void
    onFirstPaint(): void
}

export const MAP_ZOOM_STEP = 1

export type { CameraChangeEvent }
