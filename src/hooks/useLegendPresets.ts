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

export interface LegendPresetInput {
    name: string
    elementType: LegendPresetType
    style: LegendPresetStyle
}

export interface UseLegendPresetsArgs {
    baseId: string
    isPersistedRef: MutableRefObject<boolean>
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
    replacePresets: (next: LegendPreset[]) => void
}

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

    const commit = useCallback(
        (next: LegendPreset[]): void => {
            legendPresetsRef.current = next
            setLegendPresets(next)
            if (!isPersistedRef.current) writeLocal(baseId, next)
        },
        [baseId, isPersistedRef]
    )

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
