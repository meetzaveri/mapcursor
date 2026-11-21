import { useCallback, useEffect, useRef, useState } from 'react'
import { readAnchorConfig, writeAnchorConfig } from '../baseTypes/anchorStorage'
import type {
    MapBackdropConfig,
    MapBackdropHandle,
    MapAnchor,
} from '../baseTypes/types'
import type { ServerBaseConfig } from '../baseTypes/serverConfig'
import type { CameraChangeEvent } from '../types/base'
import { SKIP_CHROME_REVEAL } from '../utils/e2eHooks'

type MapBackdropModule = typeof import('../baseTypes/mapBackdrop')['mapBackdrop']

export const BASE_ROOT_ID = 'mc-base-root'

const FIRST_PAINT_FALLBACK_MS = 3500

export interface MapBackdropOptions {
    baseId: string
    serverConfig?: ServerBaseConfig | null
}

export interface MapBackdropApi {
    hadStoredMapAnchor: boolean
    ready: boolean
    firstPaint: boolean
    handleCameraChange: (camera: CameraChangeEvent) => void
    captureBackdrop: (width: number, height: number) => Promise<string | null>
    readConfig: () => MapBackdropConfig
    setMapAnchor: (anchor: MapAnchor) => void
}

export function useMapBackdrop({
    baseId,
    serverConfig,
}: MapBackdropOptions): MapBackdropApi {
    const [initialConfig] = useState<MapBackdropConfig>(() => {
        const local = readAnchorConfig(baseId)
        return {
            mapAnchor: serverConfig?.mapAnchor ?? local.mapAnchor ?? null,
        }
    })
    const [ready, setReady] = useState(false)
    const [firstPaint, setFirstPaint] = useState(SKIP_CHROME_REVEAL)
    const markFirstPaint = useCallback((): void => setFirstPaint(true), [])

    useEffect(() => {
        const timer = window.setTimeout(markFirstPaint, FIRST_PAINT_FALLBACK_MS)
        return (): void => window.clearTimeout(timer)
    }, [markFirstPaint])

    const handleRef = useRef<MapBackdropHandle | null>(null)
    const backdropRef = useRef<MapBackdropModule | null>(null)
    const lastCameraRef = useRef<CameraChangeEvent | null>(null)
    const mountTokenRef = useRef(0)
    const mountingRef = useRef(false)

    const configRef = useRef<MapBackdropConfig>(initialConfig)

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
                { saveConfig, onFirstPaint: markFirstPaint }
            )
            if (token !== mountTokenRef.current) {
                mapBackdrop.unmount(handle)
                return
            }

            handleRef.current = handle
            backdropRef.current = mapBackdrop
            setReady(true)

            const camera = lastCameraRef.current
            if (camera) mapBackdrop.syncCamera(handle, camera)
        } catch (err) {
            console.error('Map backdrop mount failed', err)
            markFirstPaint()
        } finally {
            mountingRef.current = false
        }
    }, [saveConfig, markFirstPaint])

    const handleCameraChange = useCallback(
        (camera: CameraChangeEvent): void => {
            lastCameraRef.current = camera
            const handle = handleRef.current
            const backdrop = backdropRef.current
            if (handle && backdrop) {
                backdrop.syncCamera(handle, camera)
                return
            }
            void mount()
        },
        [mount]
    )

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
        firstPaint,
        handleCameraChange,
        captureBackdrop,
        readConfig,
        setMapAnchor,
    }
}
