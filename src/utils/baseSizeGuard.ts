import type { ComponentStore } from '../types/base'
import { GROUP_COMPONENT, DRAFT_STORAGE_KEY } from '../constants/misc'

export const MAX_DRAFT_BYTES = 5 * 1024 * 1024

export const MAX_DRAFT_UTF8_BYTES = 3 * 1024 * 1024

export function measureStoredDraftUtf8Bytes(): number {
    let raw: string | null = null
    try {
        raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    } catch {
        raw = null
    }
    return raw ? new TextEncoder().encode(raw).length : 0
}

export function selectPersistableComponents(
    store: ComponentStore
): ComponentStore {
    return Object.fromEntries(
        Object.entries(store).filter(
            ([, v]) =>
                v?.componentType !== GROUP_COMPONENT
        )
    ) as ComponentStore
}

export function measureBytes(serialized: string): number {
    return serialized.length * 2
}

export function draftFitsForStore(store: ComponentStore): boolean {
    const persistable = selectPersistableComponents(store)
    if (Object.keys(persistable).length === 0) return true
    const serialized = JSON.stringify({ components: persistable })

    const PROBE_KEY = '__mapcursor_fit_probe__'
    let current: string | null = null
    try {
        current = localStorage.getItem(DRAFT_STORAGE_KEY)
    } catch {
        current = null
    }
    try {
        if (current != null) localStorage.removeItem(DRAFT_STORAGE_KEY)
        localStorage.setItem(PROBE_KEY, serialized)
        return true
    } catch {
        return false
    } finally {
        try {
            localStorage.removeItem(PROBE_KEY)
        } catch {
        }
        if (current != null) {
            try {
                localStorage.setItem(DRAFT_STORAGE_KEY, current)
            } catch {
            }
        }
    }
}

export function readRawDraft(): string | null {
    try {
        return localStorage.getItem(DRAFT_STORAGE_KEY)
    } catch {
        return null
    }
}

export function isRawDraftOverBudget(raw: string): boolean {
    return measureBytes(raw) > MAX_DRAFT_BYTES
}

export function downloadRawDraftBackup(raw: string): void {
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `craftbase-canvas-backup-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
