import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, useRef, useState } from 'react'
import { useLocalDraftPersistence } from './useLocalDraftPersistence'
import { DRAFT_STORAGE_KEY } from '../constants/misc'
import { renderHook, unmountAllHooks } from '../utils/testing/renderHook'
import type { ComponentRecord, ComponentStore } from '../types/base'

// The load path treats a draft as over budget via this check. A flag lets one
// test hold a draft behind the rescue modal without writing 3 MB.
const overBudget = { value: false }
vi.mock('../utils/baseSizeGuard', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('../utils/baseSizeGuard')>()
    return {
        ...actual,
        isRawDraftOverBudget: (raw: string): boolean =>
            overBudget.value || actual.isRawDraftOverBudget(raw),
    }
})

const SAVE_DEBOUNCE_MS = 500

const point = (id: string): ComponentRecord =>
    ({
        id,
        componentType: 'point',
        baseId: 'local-base',
        metadata: {
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {},
        },
    }) as ComponentRecord

const writeDraft = (components: ComponentStore): string => {
    const raw = JSON.stringify({
        baseId: 'local-base',
        components,
        timestamp: Date.now(),
    })
    localStorage.setItem(DRAFT_STORAGE_KEY, raw)
    return raw
}

const storedIds = (): string[] | null => {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (raw === null) return null
    return Object.keys(JSON.parse(raw).components ?? {})
}

// The hook with a real component store, the way base.tsx drives it.
function useHarness(): {
    store: ComponentStore
    setStore: (next: ComponentStore) => void
    api: ReturnType<typeof useLocalDraftPersistence>
} {
    const [store, setStore] = useState<ComponentStore>({})
    const backgroundBaseIdRef = useRef<string | null>(null)
    const api = useLocalDraftPersistence({
        isPersisted: false,
        localBaseId: 'local-base',
        componentStore: store,
        setComponentStore: setStore,
        backgroundBaseIdRef,
        setBackgroundBaseId: () => {},
    })
    return { store, setStore, api }
}

beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    overBudget.value = false
})

afterEach(() => {
    // A mounted hook keeps its `pagehide` listener, and would act on the next
    // test's draft (they share one localStorage key).
    unmountAllHooks()
    vi.useRealTimers()
})

const flushSave = (): void => {
    act(() => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 50)
    })
}

describe('useLocalDraftPersistence: an emptied canvas', () => {
    it('clears the draft when the last element is deleted', () => {
        writeDraft({ a: point('a') })
        const { result } = renderHook(useHarness)
        expect(Object.keys(result.current.store)).toEqual(['a'])

        act(() => result.current.setStore({}))
        flushSave()

        // Before the fix the draft still held `a`, so a reload brought it back.
        expect(storedIds()).toBeNull()
        expect(result.current.api.draftSizeBytes).toBe(0)
    })

    it('writes the draft again if the element comes back (undo)', () => {
        writeDraft({ a: point('a') })
        const { result } = renderHook(useHarness)
        act(() => result.current.setStore({}))
        flushSave()
        act(() => result.current.setStore({ a: point('a') }))
        flushSave()
        expect(storedIds()).toEqual(['a'])
    })

    it('clears on page hide inside the debounce window too', () => {
        writeDraft({ a: point('a') })
        const { result } = renderHook(useHarness)
        act(() => result.current.setStore({}))
        act(() => {
            window.dispatchEvent(new Event('pagehide'))
        })
        expect(storedIds()).toBeNull()
    })
})

describe('useLocalDraftPersistence: an empty store that is NOT a deletion', () => {
    it('leaves the draft alone on the first render, before anything loads', () => {
        // A draft with no elements restores nothing, so the store is empty
        // from the first render on. That is "not loaded", not "deleted".
        writeDraft({})
        renderHook(useHarness)
        flushSave()
        act(() => {
            window.dispatchEvent(new Event('pagehide'))
        })
        expect(storedIds()).toEqual([])
    })

    it('never clears a draft held unparsed behind the rescue modal', () => {
        overBudget.value = true
        const raw = writeDraft({ a: point('a'), b: point('b') })
        const { result } = renderHook(useHarness)

        expect(result.current.api.showBaseTooLargeModal).toBe(true)
        expect(result.current.store).toEqual({})
        flushSave()
        act(() => {
            window.dispatchEvent(new Event('pagehide'))
        })

        // The user hasn't chosen yet; their only copy must survive.
        expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBe(raw)
    })
})
