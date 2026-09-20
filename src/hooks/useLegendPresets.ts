import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { useMutation } from '@apollo/client'

import {
    DELETE_LEGEND_PRESET,
    INSERT_LEGEND_PRESET,
    UPDATE_LEGEND_PRESET,
} from '../schema/mutations'
import { LEGEND_PRESETS_KEY_PREFIX } from '../constants/misc'
import { generateUUID } from '../utils/misc'
import type {
    LegendPreset,
    LegendPresetStyle,
    LegendPresetType,
} from '../types/legend'
import { isLegendPresetType } from '../types/legend'

/**
 * The legend presets of one base, and every write to them.
 *
 * Gated on `isPersistedRef` exactly as every component mutation in base.tsx is:
 * on `/base/:id` a write goes to Hasura, on `/` it goes to a localStorage
 * sidecar. The id is minted CLIENT-side in both modes rather than letting
 * Postgres default it — an element binds to a preset the instant it is created,
 * so there is no point at which we could afford to wait for a server round trip
 * to learn what to bind to. `id` is in the insert permission's column list, so
 * the server takes ours.
 */

export interface LegendPresetInput {
    name: string
    elementType: LegendPresetType
    style: LegendPresetStyle
}

export interface UseLegendPresetsArgs {
    baseId: string
    isPersistedRef: MutableRefObject<boolean>
    /** `legendPresets` off GET_COMPONENTS_FOR_BASE_QUERY; undefined in local mode. */
    seed: readonly unknown[] | undefined
}

export interface UseLegendPresetsApi {
    legendPresets: LegendPreset[]
    legendPresetsRef: MutableRefObject<LegendPreset[]>
    createPreset: (input: LegendPresetInput) => LegendPreset
    updatePreset: (
        id: string,
        patch: Partial<LegendPresetInput>
    ) => LegendPreset | null
    deletePreset: (id: string) => void
    /** Wholesale replace — used by import and by persistBase's re-key. */
    replacePresets: (next: LegendPreset[]) => void
}

/**
 * Rows arrive from Hasura as opaque jsonb + text. Anything whose `elementType`
 * is not one of the four is dropped rather than rendered: a legend entry that
 * captions no possible mark is noise, and the CHECK constraint means it can
 * only appear if someone wrote to the table by hand.
 */
function normalizePreset(row: unknown): LegendPreset | null {
    if (!row || typeof row !== 'object') return null
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string') return null
    if (!isLegendPresetType(r.elementType as string)) return null
    const style =
        r.style && typeof r.style === 'object'
            ? (r.style as LegendPresetStyle)
            : {}
    return {
        id: r.id,
        baseId: typeof r.baseId === 'string' ? r.baseId : null,
        name: typeof r.name === 'string' ? r.name : '',
        elementType: r.elementType as LegendPresetType,
        style,
        position: typeof r.position === 'number' ? r.position : 0,
        createdBy: typeof r.createdBy === 'string' ? r.createdBy : null,
    }
}

const keyFor = (baseId: string): string =>
    `${LEGEND_PRESETS_KEY_PREFIX}${baseId}`

function readLocal(baseId: string): LegendPreset[] {
    try {
        const raw = localStorage.getItem(keyFor(baseId))
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed
            .map(normalizePreset)
            .filter((p): p is LegendPreset => p !== null)
    } catch (_) {
        return []
    }
}

/**
 * Write the local sidecar for a base directly.
 *
 * Exported for `persistBase`, which rotates the local base id and has to carry
 * the legend onto the new one — the same move it already makes for the anchor
 * and the camera. Without it, sharing a canvas would silently empty the legend
 * of the `/` session the user is still sitting in.
 */
export function writeLegendPresetsLocal(
    baseId: string,
    presets: LegendPreset[]
): void {
    writeLocal(baseId, presets)
}

function writeLocal(baseId: string, presets: LegendPreset[]): void {
    try {
        localStorage.setItem(keyFor(baseId), JSON.stringify(presets))
    } catch (_) {
        // A full quota costs the legend's local mirror, never the session.
        // The in-memory list stays authoritative for this tab either way.
    }
}

export function useLegendPresets({
    baseId,
    isPersistedRef,
    seed,
}: UseLegendPresetsArgs): UseLegendPresetsApi {
    const [legendPresets, setLegendPresets] = useState<LegendPreset[]>([])
    const legendPresetsRef = useRef<LegendPreset[]>([])

    const [insertLegendPreset] = useMutation(INSERT_LEGEND_PRESET, {
        ignoreResults: true,
    })
    const [updateLegendPreset] = useMutation(UPDATE_LEGEND_PRESET, {
        ignoreResults: true,
    })
    const [deleteLegendPreset] = useMutation(DELETE_LEGEND_PRESET, {
        ignoreResults: true,
    })

    // One writer for both halves of the state, so the ref can never lag the
    // list. Callers inside Two.js handlers read the ref; React reads the list.
    const commit = useCallback(
        (next: LegendPreset[]): void => {
            legendPresetsRef.current = next
            setLegendPresets(next)
            if (!isPersistedRef.current) writeLocal(baseId, next)
        },
        [baseId, isPersistedRef]
    )

    // Seed. In persisted mode the query is the truth; in local mode the
    // sidecar is. Runs on baseId change too, because share and import both
    // rotate the id under a mounted component.
    useEffect(() => {
        if (seed !== undefined) {
            const rows = seed
                .map(normalizePreset)
                .filter((p): p is LegendPreset => p !== null)
            legendPresetsRef.current = rows
            setLegendPresets(rows)
            return
        }
        const local = readLocal(baseId)
        legendPresetsRef.current = local
        setLegendPresets(local)
    }, [seed, baseId])

    const createPreset = useCallback(
        (input: LegendPresetInput): LegendPreset => {
            const preset: LegendPreset = {
                id: generateUUID(),
                baseId,
                name: input.name,
                elementType: input.elementType,
                style: input.style,
                position: legendPresetsRef.current.length,
                createdBy: null,
            }
            commit([...legendPresetsRef.current, preset])
            if (isPersistedRef.current) {
                // `createdBy` is omitted deliberately — Hasura stamps it from
                // the x-hasura-user-id header. Sending one would be rejected
                // (it is not an insertable column) and, worse, forgeable.
                insertLegendPreset({
                    variables: {
                        object: {
                            id: preset.id,
                            baseId,
                            name: preset.name,
                            elementType: preset.elementType,
                            style: preset.style,
                            position: preset.position,
                        },
                    },
                }).catch(() => {})
            }
            return preset
        },
        [baseId, commit, insertLegendPreset, isPersistedRef]
    )

    const updatePreset = useCallback(
        (id: string, patch: Partial<LegendPresetInput>): LegendPreset | null => {
            const current = legendPresetsRef.current.find((p) => p.id === id)
            if (!current) return null
            const next: LegendPreset = {
                ...current,
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.elementType !== undefined
                    ? { elementType: patch.elementType }
                    : {}),
                ...(patch.style !== undefined ? { style: patch.style } : {}),
            }
            commit(
                legendPresetsRef.current.map((p) => (p.id === id ? next : p))
            )
            if (isPersistedRef.current) {
                updateLegendPreset({
                    variables: {
                        id,
                        updateObj: {
                            name: next.name,
                            elementType: next.elementType,
                            style: next.style,
                            updatedAt: Math.floor(Date.now() / 1000),
                        },
                    },
                }).catch(() => {})
            }
            return next
        },
        [commit, isPersistedRef, updateLegendPreset]
    )

    /**
     * Removes the caption, never the styling.
     *
     * The FK is ON DELETE SET NULL, so bound elements keep exactly how they
     * look and simply stop being explained. The caller is responsible for
     * clearing `legendPresetId` in the in-memory store to match — the DB does
     * its half on its own, but nothing tells a mounted element component.
     */
    const deletePreset = useCallback(
        (id: string): void => {
            commit(legendPresetsRef.current.filter((p) => p.id !== id))
            if (isPersistedRef.current) {
                deleteLegendPreset({ variables: { id } }).catch(() => {})
            }
        },
        [commit, deleteLegendPreset, isPersistedRef]
    )

    const replacePresets = useCallback(
        (next: LegendPreset[]): void => commit(next),
        [commit]
    )

    return {
        legendPresets,
        legendPresetsRef,
        createPreset,
        updatePreset,
        deletePreset,
        replacePresets,
    }
}
