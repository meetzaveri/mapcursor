import type { ComponentRecord, ComponentStore } from '../types/base'
import { GROUP_COMPONENT, IMAGE_COMPONENT } from '../constants/misc'
import { readGeometry } from './geometry'
import { isLegendPresetType } from './../types/legend'
import type { LegendPreset } from '../types/legend'
import type { MapAnchor } from '../baseTypes/types'
import { isMapAnchor } from '../baseTypes/anchorStorage'
import type { MetaPropertySet } from '../types/metaProperty'
import { normalizeMetaSet } from './metaPropertyStore'

export interface BaseViewport {
    scale: number
    tx: number
    ty: number
}

export interface ParsedImport {
    components: ComponentStore
    viewport: BaseViewport | null
    total: number
    skipped: number
    legendPresets: LegendPreset[]
    mapAnchor: MapAnchor | null
    metaProperties: MetaPropertySet
    assets: Record<string, string>
    excludedImages: number
}

export function openBaseFilePicker(): Promise<string | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json,.craftbase,application/json'
        input.onchange = (): void => {
            const file = input.files?.[0]
            if (!file) {
                resolve(null)
                return
            }
            file.text()
                .then(resolve)
                .catch(() => resolve(null))
        }
        input.click()
    })
}

function isValidRecord(value: unknown): value is ComponentRecord {
    if (!value || typeof value !== 'object') return false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = value as any
    return (
        typeof r.componentType === 'string' &&
        r.componentType.length > 0 &&
        r.componentType !== GROUP_COMPONENT &&
        readGeometry(r) !== null
    )
}

function parseLegendPresets(value: unknown): LegendPreset[] {
    if (!Array.isArray(value)) return []
    const out: LegendPreset[] = []
    value.forEach((row) => {
        if (!row || typeof row !== 'object') return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = row as any
        if (typeof r.id !== 'string') return
        if (!isLegendPresetType(r.elementType)) return
        out.push({
            id: r.id,
            baseId: null,
            name: typeof r.name === 'string' ? r.name : '',
            elementType: r.elementType,
            style:
                r.style && typeof r.style === 'object'
                    ? r.style
                    : {},
            position: typeof r.position === 'number' ? r.position : 0,
            createdBy: null,
        })
    })
    return out
}

function parseAssets(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object') return {}
    const out: Record<string, string> = {}
    Object.entries(value as Record<string, unknown>).forEach(([id, url]) => {
        if (typeof url === 'string' && url.startsWith('data:image/')) {
            out[id] = url
        }
    })
    return out
}

function isValidViewport(value: unknown): value is BaseViewport {
    if (!value || typeof value !== 'object') return false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = value as any
    return (
        Number.isFinite(v.scale) &&
        Number.isFinite(v.tx) &&
        Number.isFinite(v.ty)
    )
}

export function parseImportedBase(text: string): ParsedImport {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = JSON.parse(text) as any
    const rawComponents = raw?.components
    if (!rawComponents || typeof rawComponents !== 'object') {
        throw new Error('File does not contain a canvas (no components).')
    }

    const entries = Object.entries(rawComponents as Record<string, unknown>)
    const components: ComponentStore = {}
    let skipped = 0
    for (const [id, value] of entries) {
        if (isValidRecord(value)) {
            components[id] = value
        } else {
            skipped++
        }
    }

    return {
        components,
        viewport: isValidViewport(raw?.viewport) ? raw.viewport : null,
        total: entries.length,
        skipped,
        legendPresets: parseLegendPresets(raw?.legendPresets),
        mapAnchor: isMapAnchor(raw?.mapAnchor) ? raw.mapAnchor : null,
        metaProperties: normalizeMetaSet(raw?.metaProperties),
        assets: parseAssets(raw?.assets),
        excludedImages: 0,
    }
}

export function excludeImages(parsed: ParsedImport): ParsedImport {
    const components: ComponentStore = {}
    let excluded = 0
    Object.entries(parsed.components).forEach(([id, comp]) => {
        if (comp.componentType === IMAGE_COMPONENT) excluded++
        else components[id] = comp
    })
    return {
        ...parsed,
        components,
        assets: {},
        excludedImages: parsed.excludedImages + excluded,
    }
}
