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
    /** Only the records that passed validation. */
    components: ComponentStore
    /** Restored on "Open as new canvas"; null when the file carried none. */
    viewport: BaseViewport | null
    /** Total records seen in the file (valid + skipped). */
    total: number
    /** Records dropped for being malformed / unknown. */
    skipped: number
    /**
     * The file's legend, or an empty list. Validated the same way records are —
     * a preset whose `elementType` is not a mark this app can draw captions
     * nothing, so it is dropped rather than shown as a dead legend row.
     */
    legendPresets: LegendPreset[]
    /**
     * The anchor the file's records were measured against, or null when the
     * file carries none. "Open as new canvas" adopts it; without it the new
     * local base had no anchor at all, and the next load drew the imported
     * canvas over the browser's timezone city.
     */
    mapAnchor: MapAnchor | null
    /** The file's meta properties (2.1+); empty when it has none. */
    metaProperties: MetaPropertySet
    /** Image bytes (assetId → data URL) from a 2.1+ export; {} when absent. */
    assets: Record<string, string>
    /** Image records left out because the target is a shared base. */
    excludedImages: number
}

/**
 * Open a native file picker and resolve with the chosen file's text — or null
 * if the user cancels. Accepts both the branded export (`.json`) and the raw
 * draft backup the load-side rescue produces (same `components` shape).
 */
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
        // Geometry, not `x`/`y`, is what makes a record renderable: the columns
        // are only a cache of it. Checking it here is also what stops a file
        // written before the geometry envelope from importing as a set of rows
        // that mount as nothing — they are counted in `skipped` instead.
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

/**
 * Parse + validate an imported base file. Mirrors `persistBase`'s defensive
 * skip: records missing a `componentType` (or geometry) are dropped and
 * counted rather than failing the whole import. Throws only when the file
 * isn't valid JSON or has no `components` object at all.
 */
export function parseImportedBase(text: string): ParsedImport {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = JSON.parse(text) as any // throws on malformed JSON
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
        // Absent in a pre-legend file, which is not an error: those canvases
        // simply have no legend, exactly as they did before the feature.
        legendPresets: parseLegendPresets(raw?.legendPresets),
        mapAnchor: isMapAnchor(raw?.mapAnchor) ? raw.mapAnchor : null,
        metaProperties: normalizeMetaSet(raw?.metaProperties),
        assets: parseAssets(raw?.assets),
        excludedImages: 0,
    }
}

/**
 * Drop image records (and their bytes) from a parsed import. Shared bases
 * don't support images yet: they're never persisted, so an imported image
 * would render once and vanish on refresh.
 */
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
