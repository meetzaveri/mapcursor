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

export const metaSidecarKey = (baseId: string): string =>
    `${META_PROPERTIES_KEY_PREFIX}${baseId}`

export function readMetaLocal(baseId: string): MetaPropertySet {
    try {
        const raw = localStorage.getItem(metaSidecarKey(baseId))
        if (!raw) return { properties: [], values: [] }
        return normalizeMetaSet(JSON.parse(raw))
    } catch {
        return { properties: [], values: [] }
    }
}

export function writeMetaLocal(baseId: string, set: MetaPropertySet): void {
    try {
        if (set.properties.length === 0 && set.values.length === 0) {
            localStorage.removeItem(metaSidecarKey(baseId))
            return
        }
        localStorage.setItem(metaSidecarKey(baseId), JSON.stringify(set))
    } catch {
    }
}

export function dropOrphanValues(
    set: MetaPropertySet,
    objectIds: ReadonlySet<string>
): MetaPropertySet {
    const values = set.values.filter((v) => objectIds.has(v.objectId))
    return values.length === set.values.length
        ? set
        : { properties: set.properties, values }
}

function uniqueName(name: string, taken: ReadonlySet<string>): string {
    for (let n = 2; ; n++) {
        const candidate = `${name} (${n})`
        if (!taken.has(candidate.toLowerCase())) return candidate
    }
}

export interface MergeMetaOptions {
    baseId: string
    objectIdMap: ReadonlyMap<string, string>
    skipProperty?: (property: MetaProperty) => boolean
}

export interface MergeMetaResult {
    addedProperties: MetaProperty[]
    values: MetaValue[]
}

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
    converted: MetaValue[]
    cleared: MetaValue[]
}

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
