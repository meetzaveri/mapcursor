import { useState, useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import {
    DRAFT_STORAGE_KEY,
    DRAFT_EXPIRY_MS,
    BACKGROUND_BASE_STORAGE_KEY,
    STORAGE_QUOTA_ERROR_NAME,
    GROUP_COMPONENT,
} from '../constants/misc'
import type { ComponentStore } from '../types/base'
import {
    isRawDraftOverBudget,
    readRawDraft,
    downloadRawDraftBackup,
    measureStoredDraftUtf8Bytes,
    MAX_DRAFT_UTF8_BYTES,
} from '../utils/baseSizeGuard'
import { localAssetSources, pruneUnusedAssets } from '../utils/assetUses'
import {
    dropOrphanValues,
    readMetaLocal,
    writeMetaLocal,
} from '../utils/metaPropertyStore'

export interface LocalDraftPersistenceOptions {
    isPersisted: boolean
    localBaseId: string
    componentStore: ComponentStore
    setComponentStore: Dispatch<SetStateAction<ComponentStore>>
    backgroundBaseIdRef: MutableRefObject<string | null>
    setBackgroundBaseId: Dispatch<SetStateAction<string | null>>
    onStorageLimitRef?: MutableRefObject<(() => void) | null>
    onDraftOverBudgetRef?: MutableRefObject<(() => void) | null>
    isMobile?: boolean
}

export interface LocalDraftPersistenceApi {
    showStorageLimitModal: boolean
    setShowStorageLimitModal: Dispatch<SetStateAction<boolean>>
    storageLimitBaseUrl: string | null
    setStorageLimitBaseUrl: Dispatch<SetStateAction<string | null>>
    handleStartNewCanvas: () => void
    handleContinueOnSavedBase: () => void
    showBaseTooLargeModal: boolean
    handleDownloadBaseBackup: () => void
    handleStartFreshFromTooLarge: () => void
    handleOpenBaseAnyway: () => void
    draftSizeBytes: number
}

interface PersistedDraft {
    baseId?: string
    components?: ComponentStore
    timestamp?: number
}

export function useLocalDraftPersistence({
    isPersisted,
    localBaseId,
    componentStore,
    setComponentStore,
    backgroundBaseIdRef,
    setBackgroundBaseId,
    onStorageLimitRef,
    onDraftOverBudgetRef,
    isMobile,
}: LocalDraftPersistenceOptions): LocalDraftPersistenceApi {
    const [showStorageLimitModal, setShowStorageLimitModal] = useState(false)
    const [draftSizeBytes, setDraftSizeBytes] = useState(0)
    const [storageLimitBaseUrl, setStorageLimitBaseUrl] = useState<
        string | null
    >(null)
    const [showBaseTooLargeModal, setShowBaseTooLargeModal] = useState(false)
    const deferredRawDraftRef = useRef<string | null>(null)
    const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const hasHadContentRef = useRef(false)

    useEffect(() => {
        if (isPersisted) return

        const savedBgBaseId = localStorage.getItem(BACKGROUND_BASE_STORAGE_KEY)
        if (savedBgBaseId) {
            backgroundBaseIdRef.current = savedBgBaseId
            setBackgroundBaseId(savedBgBaseId)
        }

        let storeForCleanup: ComponentStore | null = {}
        try {
            const draft = localStorage.getItem(DRAFT_STORAGE_KEY)
            if (draft) {
                if (isRawDraftOverBudget(draft)) {
                    deferredRawDraftRef.current = draft
                    setShowBaseTooLargeModal(true)
                    storeForCleanup = null
                } else {
                    const parsed = JSON.parse(draft) as PersistedDraft
                    const age = Date.now() - (parsed.timestamp ?? 0)
                    if (age < DRAFT_EXPIRY_MS && parsed.components) {
                        const safeComponents = Object.fromEntries(
                            Object.entries(parsed.components).filter(
                                ([, v]) =>
                                    v?.componentType !== GROUP_COMPONENT
                            )
                        ) as ComponentStore
                        if (Object.keys(safeComponents).length > 0) {
                            setComponentStore(safeComponents)
                        }
                        storeForCleanup = safeComponents
                    } else {
                        localStorage.removeItem(DRAFT_STORAGE_KEY)
                        localStorage.removeItem(BACKGROUND_BASE_STORAGE_KEY)
                    }
                }
            }
        } catch {
            localStorage.removeItem(DRAFT_STORAGE_KEY)
            localStorage.removeItem(BACKGROUND_BASE_STORAGE_KEY)
        }

        if (storeForCleanup) {
            const meta = readMetaLocal(localBaseId)
            const pruned = dropOrphanValues(
                meta,
                new Set(Object.keys(storeForCleanup))
            )
            if (pruned !== meta) writeMetaLocal(localBaseId, pruned)

            void pruneUnusedAssets(localAssetSources(storeForCleanup))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (isPersisted) return
        if (Object.keys(componentStore).length > 0) {
            hasHadContentRef.current = true
        }
        if (!hasHadContentRef.current) return

        const writeDraft = (): void => {
            try {
                const componentsToSave = Object.fromEntries(
                    Object.entries(componentStore).filter(
                        ([, v]) => v?.componentType !== GROUP_COMPONENT
                    )
                ) as ComponentStore
                if (Object.keys(componentsToSave).length === 0) {
                    localStorage.removeItem(DRAFT_STORAGE_KEY)
                    setDraftSizeBytes(0)
                    return
                }
                localStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify({
                        baseId: localBaseId,
                        components: componentsToSave,
                        timestamp: Date.now(),
                    })
                )

                const bytes = measureStoredDraftUtf8Bytes()
                setDraftSizeBytes(bytes)
                if (bytes > MAX_DRAFT_UTF8_BYTES) {
                    onDraftOverBudgetRef?.current?.()
                }
            } catch (e) {
                if (
                    e instanceof DOMException &&
                    e.name === STORAGE_QUOTA_ERROR_NAME
                ) {
                    onStorageLimitRef?.current?.()
                }
            }
        }

        if (draftSaveTimerRef.current) {
            clearTimeout(draftSaveTimerRef.current)
        }
        draftSaveTimerRef.current = setTimeout(writeDraft, 500)

        const flushDraftSave = (): void => {
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current)
                draftSaveTimerRef.current = null
            }
            writeDraft()
        }
        window.addEventListener('pagehide', flushDraftSave)

        return (): void => {
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current)
            }
            window.removeEventListener('pagehide', flushDraftSave)
        }
    }, [componentStore, isPersisted])

    const handleStartNewCanvas = (): void => {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        setShowStorageLimitModal(false)
        setStorageLimitBaseUrl(null)
        window.location.href = '/'
    }

    const handleContinueOnSavedBase = (): void => {
        setShowStorageLimitModal(false)
        if (storageLimitBaseUrl) {
            window.location.href = storageLimitBaseUrl
        }
    }

    const handleDownloadBaseBackup = (): void => {
        const raw = readRawDraft()
        if (raw) downloadRawDraftBackup(raw)
    }

    const handleStartFreshFromTooLarge = (): void => {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        deferredRawDraftRef.current = null
        setShowBaseTooLargeModal(false)
        window.location.href = '/'
    }

    const handleOpenBaseAnyway = (): void => {
        const raw = deferredRawDraftRef.current
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as PersistedDraft
                if (parsed.components) {
                    const safeComponents = Object.fromEntries(
                        Object.entries(parsed.components).filter(
                            ([, v]) => v?.componentType !== GROUP_COMPONENT
                        )
                    ) as ComponentStore
                    if (Object.keys(safeComponents).length > 0) {
                        setComponentStore(safeComponents)
                    }
                }
            } catch {
            }
            deferredRawDraftRef.current = null
        }
        setShowBaseTooLargeModal(false)
    }

    return {
        showStorageLimitModal,
        setShowStorageLimitModal,
        storageLimitBaseUrl,
        setStorageLimitBaseUrl,
        handleStartNewCanvas,
        handleContinueOnSavedBase,
        showBaseTooLargeModal,
        handleDownloadBaseBackup,
        handleStartFreshFromTooLarge,
        handleOpenBaseAnyway,
        draftSizeBytes,
    }
}
