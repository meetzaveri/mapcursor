// Pure data operations on meta properties, shared by useMetaProperties,
// persistBase, JSON import/export and paste. No React, no network: the hook
// owns when to read and write; this module owns what the data looks like.
// See .claude/context/meta-properties.md.

import { META_PROPERTIES_KEY_PREFIX } from '../constants/misc'
import { generateUUID } from './misc'
import { convertMetaValue, validateMetaValue } from './metaValue'
import {
    isMetaObjectType,
    isMetaPropertyType,
} from '../types/metaProperty'
import type {
    MetaProperty,
    MetaPropertySet,
    MetaValue,
} from '../types/metaProperty'

export const EMPTY_META_SET: MetaPropertySet = { properties: [], values: [] }

// --- Normalizing rows (server, sidecar, import file) ---------------------

/** A definition row, or null when it isn't one this app can show. */
export function normalizeMetaProperty(row: unknown): MetaProperty | null {
    if (!row || typeof row !== 'object') return null
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.name !== 'string') return null
    if (!isMetaPropertyType(r.type)) return null
    return {
        id: r.id,
        baseId: typeof r.baseId === 'string' ? r.baseId : null,
        name: r.name,
        type: r.type,
        position: typeof r.position === 'number' ? r.position : 0,
        createdBy: typeof r.createdBy === 'string' ? r.createdBy : null,
    }
}

/**
 * A value row, or null. The value is checked against its property's type, so
 * a row that could never render (wrong shape, unknown property) is dropped
 * here rather than shown broken.
 */
export function normalizeMetaValue(
    row: unknown,
    propertiesById: ReadonlyMap<string, MetaProperty>
): MetaValue | null {
    if (!row || typeof row !== 'object') return null
    const r = row as Record<string, unknown>
    if (
        typeof r.id !== 'string' ||
        typeof r.propertyId !== 'string' ||
        typeof r.objectId !== 'string' ||
        !isMetaObjectType(r.objectType)
    ) {
        return null
    }
    const property = propertiesById.get(r.propertyId)
    if (!property) return null
    const checked = validateMetaValue(property.type, r.value)
    if (!checked.ok) return null
    return {
        id: r.id,
        baseId: typeof r.baseId === 'string' ? r.baseId : null,
        propertyId: r.propertyId,
        objectId: r.objectId,
        objectType: r.objectType,
        value: checked.value,
        createdBy: typeof r.createdBy === 'string' ? r.createdBy : null,
    }
}

const byPosition = (a: MetaProperty, b: MetaProperty): number =>
    a.position - b.position

/** A whole set from untrusted input: definitions first, then their values. */
export function normalizeMetaSet(raw: unknown): MetaPropertySet {
    if (!raw || typeof raw !== 'object') return { properties: [], values: [] }
    const r = raw as Record<string, unknown>
    const properties = (Array.isArray(r.properties) ? r.properties : [])
        .map(normalizeMetaProperty)
        .filter((p): p is MetaProperty => p !== null)
        .sort(byPosition)
    const byId = new Map(properties.map((p) => [p.id, p]))
    const values = (Array.isArray(r.values) ? r.values : [])
        .map((v) => normalizeMetaValue(v, byId))
        .filter((v): v is MetaValue => v !== null)
    return { properties, values }
}

// --- Local sidecar ---------------------------------------------------------

export const metaSidecarKey = (baseId: string): string =>
    `${META_PROPERTIES_KEY_PREFIX}${baseId}`

/** A local base's meta properties. Missing or unreadable reads as empty. */
export function readMetaLocal(baseId: string): MetaPropertySet {
    try {
        const raw = localStorage.getItem(metaSidecarKey(baseId))
        if (!raw) return { properties: [], values: [] }
        return normalizeMetaSet(JSON.parse(raw))
    } catch {
        return { properties: [], values: [] }
    }
}

/**
 * Write a local base's meta properties. An empty set removes the key. A full
 * quota is swallowed: the in-memory state stays authoritative for the tab,
 * as with the legend sidecar.
 */
export function writeMetaLocal(baseId: string, set: MetaPropertySet): void {
    try {
        if (set.properties.length === 0 && set.values.length === 0) {
            localStorage.removeItem(metaSidecarKey(baseId))
            return
        }
        localStorage.setItem(metaSidecarKey(baseId), JSON.stringify(set))
    } catch {
        // See above.
    }
}

// --- Orphans ---------------------------------------------------------------

/**
 * Drop values whose object no longer exists. Values deliberately outlive a
 * deleted object (undo re-inserts it with the same id), so this only runs
 * where no undo can follow: draft load, and before carrying a set elsewhere.
 * Shared bases do the same server-side in the weekly sweep.
 */
export function dropOrphanValues(
    set: MetaPropertySet,
    objectIds: ReadonlySet<string>
): MetaPropertySet {
    const values = set.values.filter((v) => objectIds.has(v.objectId))
    return values.length === set.values.length
        ? set
        : { properties: set.properties, values }
}

// --- Moving a set between bases / objects ----------------------------------

function uniqueName(name: string, taken: ReadonlySet<string>): string {
    for (let n = 2; ; n++) {
        const candidate = `${name} (${n})`
        if (!taken.has(candidate.toLowerCase())) return candidate
    }
}

export interface MergeMetaOptions {
    /** The base the result belongs to. */
    baseId: string
    /** Old object id → new object id. Values of unmapped objects are dropped. */
    objectIdMap: ReadonlyMap<string, string>
    /**
     * Leave a definition (and so all its values) out, e.g. image properties
     * on share: a column a shared canvas can't fill yet is just noise.
     */
    skipProperty?: (property: MetaProperty) => boolean
}

export interface MergeMetaResult {
    /** Definitions to ADD to the target (reused ones are not repeated). */
    addedProperties: MetaProperty[]
    /** Every carried value, with fresh ids, pointing at target properties. */
    values: MetaValue[]
}

/**
 * Carry `incoming` into a base that already has `targetProperties`. Every
 * carried row gets a fresh id. Used three ways:
 *
 * - share (persistBase): target is empty, so it is a plain re-key;
 * - JSON merge-import: an imported property with the same name AND type as an
 *   existing one is reused, so its values line up under one column; the same
 *   name with a different type is renamed "Name (2)", since one name can't
 *   hold two types;
 * - (paste copies values only; see copyValuesToObjects).
 */
export function mergeMetaSets(
    targetProperties: readonly MetaProperty[],
    incoming: MetaPropertySet,
    { baseId, objectIdMap, skipProperty }: MergeMetaOptions
): MergeMetaResult {
    const taken = new Set(targetProperties.map((p) => p.name.toLowerCase()))
    const targetByName = new Map(
        targetProperties.map((p) => [p.name.toLowerCase(), p])
    )
    const propertyIdMap = new Map<string, string>()
    const addedProperties: MetaProperty[] = []

    ;[...incoming.properties].sort(byPosition).forEach((property) => {
        if (skipProperty?.(property)) return
        const existing = targetByName.get(property.name.toLowerCase())
        if (existing && existing.type === property.type) {
            propertyIdMap.set(property.id, existing.id)
            return
        }
        const name = existing ? uniqueName(property.name, taken) : property.name
        taken.add(name.toLowerCase())
        const added: MetaProperty = {
            id: generateUUID(),
            baseId,
            name,
            type: property.type,
            position: targetProperties.length + addedProperties.length,
            createdBy: null,
        }
        addedProperties.push(added)
        propertyIdMap.set(property.id, added.id)
    })

    const values: MetaValue[] = []
    incoming.values.forEach((value) => {
        const objectId = objectIdMap.get(value.objectId)
        const propertyId = propertyIdMap.get(value.propertyId)
        // A skipped definition has no entry in propertyIdMap, so its values
        // fall out here too.
        if (!objectId || !propertyId) return
        values.push({
            ...value,
            id: generateUUID(),
            baseId,
            objectId,
            propertyId,
            createdBy: null,
        })
    })

    return { addedProperties, values }
}

/**
 * Copies of the values on `objectIdMap`'s source objects, for their new copies
 * (paste / duplicate, within one base). Definitions are base-wide, so they are
 * shared, not copied. An image value keeps its `assetId`: the bytes are stored
 * once, so a pasted point's photo costs nothing.
 */
export function copyValuesToObjects(
    values: readonly MetaValue[],
    objectIdMap: ReadonlyMap<string, string>,
    baseId: string | null
): MetaValue[] {
    const copies: MetaValue[] = []
    values.forEach((value) => {
        const objectId = objectIdMap.get(value.objectId)
        if (!objectId) return
        copies.push({
            ...value,
            id: generateUUID(),
            baseId,
            objectId,
            createdBy: null,
        })
    })
    return copies
}

export interface TypeChangePlan {
    /** The values that fit the new type, already converted. */
    converted: MetaValue[]
    /** The values that don't, and will be cleared. */
    cleared: MetaValue[]
}

/** What happens to a property's values when its type changes. */
export function planTypeChange(
    values: readonly MetaValue[],
    from: MetaProperty['type'],
    to: MetaProperty['type']
): TypeChangePlan {
    const converted: MetaValue[] = []
    const cleared: MetaValue[] = []
    values.forEach((v) => {
        const next = convertMetaValue(from, to, v.value)
        if (next) converted.push({ ...v, value: next.value })
        else cleared.push(v)
    })
    return { converted, cleared }
}
