// Owns the map backdrop for a base: mounting it, feeding it the camera, and
// persisting its anchor.
//
// Mount timing is the subtle part. The backdrop slot (`#mc-base-root`) lives
// inside newCanvas's render tree, so mounting from an effect here would race the
// canvas and find no container. The mount is driven by the first camera event
// instead: newCanvas fires onCameraChange once immediately after the viewport is
// restored, which both proves the DOM exists and hands us the restored camera,
// so the map lands on the user's saved view rather than at the origin.

import { useCallback, useEffect, useRef, useState } from 'react'
import { readAnchorConfig, writeAnchorConfig } from '../baseTypes/anchorStorage'
import type {
    MapBackdropConfig,
    MapBackdropHandle,
    MapAnchor,
} from '../baseTypes/types'
import type { ServerBaseConfig } from '../baseTypes/serverConfig'
import type { CameraChangeEvent } from '../types/base'

type MapBackdropModule = typeof import('../baseTypes/mapBackdrop')['mapBackdrop']

export const BASE_ROOT_ID = 'mc-base-root'

export interface MapBackdropOptions {
    baseId: string
    /**
     * The base row as fetched from the server, for a persisted base. Null on
     * `/`, where there is no row yet.
     *
     * Must be available on the FIRST render, which is why the caller resolves it
     * from an already-gated query rather than an effect. Everything downstream —
     * the viewport key the camera restores under, the zoom limits it is clamped
     * to, and the anchor the backdrop mounts on — is decided before this hook's
     * first commit. A late arrival doesn't correct them; it corrupts them.
     */
    serverConfig?: ServerBaseConfig | null
}

export interface MapBackdropApi {
    /**
     * Did this base arrive with a map anchor already persisted?
     *
     * Snapshotted at init and never updated, on purpose: it answers "has this
     * base ever settled on a place", which is what the first-visit location
     * prompt gates on. Reading the LIVE config would answer "is an anchor set
     * right now", which is always true once the map mounts (it fills in a
     * timezone guess), so the prompt would never appear.
     *
     * Counts a SERVER anchor too. That is what keeps "where are you mapping?"
     * shut for someone opening a shared map: the base has very much settled on a
     * place — just not by them.
     */
    hadStoredMapAnchor: boolean
    /** True once the backdrop has actually mounted. */
    ready: boolean
    /** Feed every ZUI camera update here. Also triggers the deferred mount. */
    handleCameraChange: (camera: CameraChangeEvent) => void
    /** Rasterize the live backdrop for PNG export; null when there's nothing. */
    captureBackdrop: (width: number, height: number) => Promise<string | null>
    /** Current persisted-shape config, for the JSON export envelope. */
    readConfig: () => MapBackdropConfig
    /** Recentre the backdrop on a place and persist it. */
    setMapAnchor: (anchor: MapAnchor) => void
}

export function useMapBackdrop({
    baseId,
    serverConfig,
}: MapBackdropOptions): MapBackdropApi {
    // Resolved exactly once — Base re-renders on every component-store change,
    // and a localStorage read + JSON.parse per render is real work on a large
    // base.
    const [initialConfig] = useState<MapBackdropConfig>(() => {
        const local = readAnchorConfig(baseId)
        return {
            // The server anchor outranks the local one. It is the georeference
            // every persisted element's x/y was measured against, so a divergent
            // local key is not a preference — it is corruption, and honouring it
            // would scatter the ink across the wrong continent.
            mapAnchor: serverConfig?.mapAnchor ?? local.mapAnchor ?? null,
        }
    })
    const [ready, setReady] = useState(false)

    const handleRef = useRef<MapBackdropHandle | null>(null)
    // Cached at mount. `syncCamera` runs on every camera event, so it has to be
    // a plain synchronous call — resolving the dynamic import per frame would
    // add a microtask each time and let two camera updates land out of order.
    const backdropRef = useRef<MapBackdropModule | null>(null)
    const lastCameraRef = useRef<CameraChangeEvent | null>(null)
    // Bumped on teardown so a dynamic import that resolves after unmount doesn't
    // mount a map into a container that is already gone.
    const mountTokenRef = useRef(0)
    const mountingRef = useRef(false)

    const configRef = useRef<MapBackdropConfig>(initialConfig)

    // The backdrop reports async state back through this. Merged into the live
    // config and persisted, so the next load reuses it.
    const saveConfig = useCallback(
        (patch: Partial<MapBackdropConfig>): void => {
            const merged = { ...configRef.current, ...patch }
            configRef.current = merged
            writeAnchorConfig(baseId, merged)
        },
        [baseId]
    )

    const mount = useCallback(async (): Promise<void> => {
        if (mountingRef.current || handleRef.current) return
        const container = document.getElementById(BASE_ROOT_ID)
        if (!container) return

        mountingRef.current = true
        const token = mountTokenRef.current
        try {
            const { mapBackdrop } = await import('../baseTypes/mapBackdrop')
            if (token !== mountTokenRef.current) return

            const handle = await mapBackdrop.mount(
                container,
                configRef.current,
                { saveConfig }
            )
            if (token !== mountTokenRef.current) {
                mapBackdrop.unmount(handle)
                return
            }

            handleRef.current = handle
            backdropRef.current = mapBackdrop
            setReady(true)

            // Land on the current camera immediately, so the backdrop never
            // shows at the origin for a frame before the next pan.
            const camera = lastCameraRef.current
            if (camera) mapBackdrop.syncCamera(handle, camera)
        } finally {
            mountingRef.current = false
        }
    }, [saveConfig])

    const handleCameraChange = useCallback(
        (camera: CameraChangeEvent): void => {
            lastCameraRef.current = camera
            const handle = handleRef.current
            const backdrop = backdropRef.current
            if (handle && backdrop) {
                backdrop.syncCamera(handle, camera)
                return
            }
            // First camera event — the canvas DOM now exists, so mount.
            void mount()
        },
        [mount]
    )

    // Tear down on unmount so MapLibre's GPU context is released rather than
    // leaking across base navigations.
    useEffect(() => {
        return (): void => {
            mountTokenRef.current++
            const handle = handleRef.current
            const backdrop = backdropRef.current
            handleRef.current = null
            backdropRef.current = null
            if (handle && backdrop) backdrop.unmount(handle)
        }
    }, [])

    // `width`/`height` are accepted for call-site symmetry with the PNG export
    // path; the map rasterizes its own live canvas at whatever size it is.
    const captureBackdrop = useCallback(
        async (_width: number, _height: number): Promise<string | null> => {
            const handle = handleRef.current
            const backdrop = backdropRef.current
            if (!handle || !backdrop) return null
            return backdrop.captureBackdrop(handle)
        },
        []
    )

    const setMapAnchor = useCallback(
        (anchor: MapAnchor): void => {
            const handle = handleRef.current
            const backdrop = backdropRef.current
            if (!handle || !backdrop) return
            backdrop.setAnchor(handle, anchor)
            saveConfig({ mapAnchor: anchor })
        },
        [saveConfig]
    )

    const readConfig = useCallback((): MapBackdropConfig => {
        return { ...configRef.current }
    }, [])

    return {
        hadStoredMapAnchor: Boolean(initialConfig.mapAnchor),
        ready,
        handleCameraChange,
        captureBackdrop,
        readConfig,
        setMapAnchor,
    }
}
