import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { useApolloClient } from '@apollo/client'

import {
    DELETE_META_PROPERTY,
    DELETE_META_VALUE_BY_CELL,
    INSERT_BULK_META_PROPERTIES,
    INSERT_BULK_META_VALUES,
    INSERT_META_PROPERTY,
    UPDATE_META_PROPERTY,
    UPSERT_META_VALUE,
} from '../schema/mutations'
import {
    GET_META_VALUES_FOR_BASE,
    GET_META_VALUES_FOR_OBJECT,
    GET_META_VALUES_FOR_OBJECTS,
} from '../schema/queries'
import { generateUUID } from '../utils/misc'
import {
    copyValuesToObjects,
    mergeMetaSets,
    normalizeMetaProperty,
    normalizeMetaValue,
    planTypeChange,
    readMetaLocal,
    writeMetaLocal,
} from '../utils/metaPropertyStore'
import type { TypeChangePlan } from '../utils/metaPropertyStore'
import { validateMetaPropertyName, validateMetaValue } from '../utils/metaValue'
import type {
    MetaObjectType,
    MetaProperty,
    MetaPropertySet,
    MetaPropertyType,
    MetaValue,
} from '../types/metaProperty'
import type { HistoryEntry } from './useComponentHistory'

export const META_IMAGE_SHARED_ERROR =
    "Images aren't supported on shared canvases yet."

export type MetaHistoryOp =
    | { kind: 'createProperty'; property: MetaProperty }
    | { kind: 'deleteProperty'; property: MetaProperty; values: MetaValue[] }
    | { kind: 'renameProperty'; id: string; from: string; to: string }
    | {
          kind: 'changeType'
          id: string
          from: MetaPropertyType
          to: MetaPropertyType
          before: MetaValue[]
          after: MetaValue[]
      }
    | { kind: 'setValue'; prev: MetaValue | null; next: MetaValue }
    | { kind: 'removeValue'; value: MetaValue }

export type MetaHistoryDirection = 'undo' | 'redo'

export interface UseMetaPropertiesArgs {
    baseId: string
    isPersistedRef: MutableRefObject<boolean>
    seed: readonly unknown[] | undefined
    recordToHistoryLog: (entry: HistoryEntry) => void
}

export interface MetaCell {
    objectId: string
    objectType: MetaObjectType
}

export type MetaWriteResult<T = object> =
    | ({ ok: true } & T)
    | { ok: false; error: string }

export type MetaPropertyChoice =
    | { existing: MetaProperty }
    | { create: { name: string; type: MetaPropertyType } }

export interface UseMetaPropertiesApi {
    metaProperties: MetaProperty[]
    metaPropertiesRef: MutableRefObject<MetaProperty[]>
    valuesVersion: number
    validateNewName: (name: string) => MetaWriteResult<{ name: string }>
    loadValues: (objectId: string) => Promise<MetaValue[]>
    addPropertyToObject: (
        choice: MetaPropertyChoice,
        cell: MetaCell,
        rawValue: unknown
    ) => Promise<MetaWriteResult<{ property: MetaProperty }>>
    setValue: (
        property: MetaProperty,
        cell: MetaCell,
        rawValue: unknown
    ) => Promise<MetaWriteResult>
    removeValue: (value: MetaValue) => Promise<MetaWriteResult>
    renameProperty: (id: string, name: string) => Promise<MetaWriteResult>
    previewTypeChange: (
        id: string,
        to: MetaPropertyType
    ) => Promise<TypeChangePlan | null>
    changePropertyType: (
        id: string,
        to: MetaPropertyType
    ) => Promise<MetaWriteResult>
    deleteProperty: (id: string) => Promise<MetaWriteResult>
    applyHistory: (
        ops: readonly MetaHistoryOp[],
        direction: MetaHistoryDirection
    ) => Promise<void>
    copyValuesForPaste: (objectIdMap: ReadonlyMap<string, string>) => Promise<void>
    mergeIncoming: (
        incoming: MetaPropertySet,
        objectIdMap: ReadonlyMap<string, string>
    ) => Promise<void>
    readLocalSet: () => MetaPropertySet
    exportSet: () => Promise<MetaPropertySet>
    persistToBase: (
        serverBaseId: string,
        objectIdMap: ReadonlyMap<string, string>
    ) => Promise<void>
}

const nowIso = (): string => new Date().toISOString()

const valueColumns = (v: MetaValue): Record<string, unknown> => ({
    id: v.id,
    baseId: v.baseId,
    propertyId: v.propertyId,
    objectId: v.objectId,
    objectType: v.objectType,
    value: v.value,
})

const propertyColumns = (p: MetaProperty): Record<string, unknown> => ({
    id: p.id,
    baseId: p.baseId,
    name: p.name,
    type: p.type,
    position: p.position,
})

const sameCell = (
    a: { propertyId: string; objectId: string },
    b: { propertyId: string; objectId: string }
): boolean => a.propertyId === b.propertyId && a.objectId === b.objectId

const errorText = (e: unknown, fallback: string): string =>
    e instanceof Error && e.message ? e.message : fallback

export function useMetaProperties({
    baseId,
    isPersistedRef,
    seed,
    recordToHistoryLog,
}: UseMetaPropertiesArgs): UseMetaPropertiesApi {
    const client = useApolloClient()
    const [metaProperties, setMetaProperties] = useState<MetaProperty[]>([])
    const metaPropertiesRef = useRef<MetaProperty[]>([])
    const localValuesRef = useRef<MetaValue[]>([])
    const cellCacheRef = useRef<Map<string, MetaValue[]>>(new Map())
    const [valuesVersion, setValuesVersion] = useState(0)
    const bumpValues = useCallback(() => setValuesVersion((v) => v + 1), [])
    const recordRef = useRef(recordToHistoryLog)
    recordRef.current = recordToHistoryLog

    const shared = (): boolean => isPersistedRef.current

    const commit = useCallback(
        (properties: MetaProperty[], values?: MetaValue[]): void => {
            metaPropertiesRef.current = properties
            setMetaProperties(properties)
            if (values) localValuesRef.current = values
            if (!isPersistedRef.current) {
                writeMetaLocal(baseId, {
                    properties,
                    values: localValuesRef.current,
                })
            }
        },
        [baseId, isPersistedRef]
    )

    useEffect(() => {
        cellCacheRef.current = new Map()
        if (seed !== undefined) {
            const rows = seed
                .map(normalizeMetaProperty)
                .filter((p): p is MetaProperty => p !== null)
                .sort((a, b) => a.position - b.position)
            metaPropertiesRef.current = rows
            localValuesRef.current = []
            setMetaProperties(rows)
        } else {
            const local = readMetaLocal(baseId)
            metaPropertiesRef.current = local.properties
            localValuesRef.current = local.values
            setMetaProperties(local.properties)
        }
        setValuesVersion((v) => v + 1)
    }, [seed, baseId])

    const propertiesById = (): Map<string, MetaProperty> =>
        new Map(metaPropertiesRef.current.map((p) => [p.id, p]))

    const normalizeRows = (rows: readonly unknown[] | undefined): MetaValue[] => {
        const byId = propertiesById()
        return (rows ?? [])
            .map((r) => normalizeMetaValue(r, byId))
            .filter((v): v is MetaValue => v !== null)
    }

    const findCell = (propertyId: string, objectId: string): MetaValue | null => {
        const pool = shared()
            ? cellCacheRef.current.get(objectId) ?? []
            : localValuesRef.current
        return pool.find((v) => sameCell(v, { propertyId, objectId })) ?? null
    }

    const cachePut = (value: MetaValue): void => {
        const list = cellCacheRef.current.get(value.objectId) ?? []
        cellCacheRef.current.set(value.objectId, [
            ...list.filter((v) => !sameCell(v, value)),
            value,
        ])
    }
    const cacheDrop = (cell: { propertyId: string; objectId: string }): void => {
        const list = cellCacheRef.current.get(cell.objectId)
        if (list) {
            cellCacheRef.current.set(
                cell.objectId,
                list.filter((v) => !sameCell(v, cell))
            )
        }
    }

    const insertPropertyRaw = async (property: MetaProperty): Promise<void> => {
        if (metaPropertiesRef.current.some((p) => p.id === property.id)) return
        commit(
            [...metaPropertiesRef.current, property].sort(
                (a, b) => a.position - b.position
            )
        )
        if (shared()) {
            try {
                await client.mutate({
                    mutation: INSERT_META_PROPERTY,
                    variables: { object: propertyColumns(property) },
                })
            } catch (e) {
                commit(metaPropertiesRef.current.filter((p) => p.id !== property.id))
                throw e
            }
        }
    }

    const deletePropertyRaw = async (id: string): Promise<void> => {
        const before = metaPropertiesRef.current
        commit(
            before.filter((p) => p.id !== id),
            localValuesRef.current.filter((v) => v.propertyId !== id)
        )
        cellCacheRef.current.forEach((list, objectId) =>
            cellCacheRef.current.set(
                objectId,
                list.filter((v) => v.propertyId !== id)
            )
        )
        bumpValues()
        if (shared()) {
            try {
                await client.mutate({ mutation: DELETE_META_PROPERTY, variables: { id } })
            } catch (e) {
                commit(before)
                throw e
            }
        }
    }

    const renamePropertyRaw = async (id: string, name: string): Promise<void> => {
        const before = metaPropertiesRef.current
        commit(before.map((p) => (p.id === id ? { ...p, name } : p)))
        if (shared()) {
            try {
                await client.mutate({
                    mutation: UPDATE_META_PROPERTY,
                    variables: { id, updateObj: { name, updatedAt: nowIso() } },
                })
            } catch (e) {
                commit(before)
                throw e
            }
        }
    }

    const retypePropertyRaw = async (
        id: string,
        type: MetaPropertyType
    ): Promise<void> => {
        const before = metaPropertiesRef.current
        commit(before.map((p) => (p.id === id ? { ...p, type } : p)))
        if (shared()) {
            try {
                await client.mutate({
                    mutation: UPDATE_META_PROPERTY,
                    variables: { id, updateObj: { type, updatedAt: nowIso() } },
                })
            } catch (e) {
                commit(before)
                throw e
            }
        }
    }

    const putValueRaw = async (value: MetaValue): Promise<MetaValue> => {
        if (!shared()) {
            const others = localValuesRef.current.filter((v) => !sameCell(v, value))
            commit(metaPropertiesRef.current, [...others, value])
            bumpValues()
            return value
        }
        const { data } = await client.mutate({
            mutation: UPSERT_META_VALUE,
            variables: { object: { ...valueColumns(value), updatedAt: nowIso() } },
        })
        const stored = normalizeMetaValue(data?.value, propertiesById()) ?? value
        cachePut(stored)
        bumpValues()
        return stored
    }

    const putValuesRaw = async (values: readonly MetaValue[]): Promise<void> => {
        if (values.length === 0) return
        if (!shared()) {
            const incoming = [...values]
            const others = localValuesRef.current.filter(
                (v) => !incoming.some((n) => sameCell(n, v))
            )
            commit(metaPropertiesRef.current, [...others, ...incoming])
            bumpValues()
            return
        }
        await client.mutate({
            mutation: INSERT_BULK_META_VALUES,
            variables: { objects: values.map(valueColumns) },
        })
        values.forEach(cachePut)
        bumpValues()
    }

    const dropValueRaw = async (cell: {
        propertyId: string
        objectId: string
    }): Promise<void> => {
        if (!shared()) {
            commit(
                metaPropertiesRef.current,
                localValuesRef.current.filter((v) => !sameCell(v, cell))
            )
            bumpValues()
            return
        }
        await client.mutate({
            mutation: DELETE_META_VALUE_BY_CELL,
            variables: { propertyId: cell.propertyId, objectId: cell.objectId },
        })
        cacheDrop(cell)
        bumpValues()
    }

    const applyOp = async (
        op: MetaHistoryOp,
        direction: MetaHistoryDirection
    ): Promise<void> => {
        const undo = direction === 'undo'
        switch (op.kind) {
            case 'createProperty':
                return undo
                    ? deletePropertyRaw(op.property.id)
                    : insertPropertyRaw(op.property)
            case 'deleteProperty':
                if (undo) {
                    await insertPropertyRaw(op.property)
                    await putValuesRaw(op.values)
                    return
                }
                return deletePropertyRaw(op.property.id)
            case 'renameProperty':
                return renamePropertyRaw(op.id, undo ? op.from : op.to)
            case 'changeType': {
                await retypePropertyRaw(op.id, undo ? op.from : op.to)
                const keep = undo ? op.before : op.after
                const drop = undo
                    ? []
                    : op.before.filter((b) => !op.after.some((a) => sameCell(a, b)))
                for (const v of keep) await putValueRaw(v)
                for (const v of drop) await dropValueRaw(v)
                return
            }
            case 'setValue':
                if (undo) {
                    if (op.prev) await putValueRaw(op.prev)
                    else await dropValueRaw(op.next)
                    return
                }
                await putValueRaw(op.next)
                return
            case 'removeValue':
                if (undo) await putValueRaw(op.value)
                else await dropValueRaw(op.value)
                return
        }
    }

    const record = (ops: MetaHistoryOp[]): void => {
        if (ops.length > 0) recordRef.current({ action: 'META', ops })
    }

    const loadValues = useCallback(
        async (objectId: string): Promise<MetaValue[]> => {
            if (!isPersistedRef.current) {
                return localValuesRef.current.filter((v) => v.objectId === objectId)
            }
            const { data } = await client.query({
                query: GET_META_VALUES_FOR_OBJECT,
                variables: { baseId, objectId },
                fetchPolicy: 'network-only',
            })
            const values = normalizeRows(data?.metaValues)
            cellCacheRef.current.set(objectId, values)
            return values
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [baseId, client, isPersistedRef]
    )

    const validateNewName = (name: string): MetaWriteResult<{ name: string }> =>
        validateMetaPropertyName(name, metaPropertiesRef.current)

    const checkValue = (
        type: MetaPropertyType,
        rawValue: unknown
    ): MetaWriteResult<{ value: unknown }> => {
        if (shared() && type === 'image') {
            return { ok: false, error: META_IMAGE_SHARED_ERROR }
        }
        return validateMetaValue(type, rawValue)
    }

    const addPropertyToObject = async (
        choice: MetaPropertyChoice,
        cell: MetaCell,
        rawValue: unknown
    ): Promise<MetaWriteResult<{ property: MetaProperty }>> => {
        let property: MetaProperty
        let isNew = false
        if ('existing' in choice) {
            property = choice.existing
        } else {
            const named = validateNewName(choice.create.name)
            if (!named.ok) return named
            property = {
                id: generateUUID(),
                baseId,
                name: named.name,
                type: choice.create.type,
                position: metaPropertiesRef.current.length,
                createdBy: null,
            }
            isNew = true
        }
        const checked = checkValue(property.type, rawValue)
        if (!checked.ok) return checked

        const ops: MetaHistoryOp[] = []
        try {
            if (isNew) {
                await insertPropertyRaw(property)
                ops.push({ kind: 'createProperty', property })
            }
            const prev = findCell(property.id, cell.objectId)
            const next = await putValueRaw({
                id: prev?.id ?? generateUUID(),
                baseId,
                propertyId: property.id,
                objectId: cell.objectId,
                objectType: cell.objectType,
                value: checked.value,
                createdBy: null,
            })
            ops.push({ kind: 'setValue', prev, next })
            return { ok: true, property }
        } catch (e) {
            return { ok: false, error: errorText(e, "Couldn't save that value.") }
        } finally {
            record(ops)
        }
    }

    const setValue = async (
        property: MetaProperty,
        cell: MetaCell,
        rawValue: unknown
    ): Promise<MetaWriteResult> => {
        const checked = checkValue(property.type, rawValue)
        if (!checked.ok) return checked
        const prev = findCell(property.id, cell.objectId)
        try {
            const next = await putValueRaw({
                id: prev?.id ?? generateUUID(),
                baseId,
                propertyId: property.id,
                objectId: cell.objectId,
                objectType: cell.objectType,
                value: checked.value,
                createdBy: null,
            })
            record([{ kind: 'setValue', prev, next }])
            return { ok: true }
        } catch (e) {
            return { ok: false, error: errorText(e, "Couldn't save that value.") }
        }
    }

    const removeValue = async (value: MetaValue): Promise<MetaWriteResult> => {
        try {
            await dropValueRaw(value)
            record([{ kind: 'removeValue', value }])
            return { ok: true }
        } catch (e) {
            return { ok: false, error: errorText(e, "Couldn't remove that value.") }
        }
    }

    const renameProperty = async (
        id: string,
        name: string
    ): Promise<MetaWriteResult> => {
        const current = metaPropertiesRef.current.find((p) => p.id === id)
        if (!current) return { ok: false, error: 'That property is gone.' }
        const named = validateMetaPropertyName(name, metaPropertiesRef.current, id)
        if (!named.ok) return named
        if (named.name === current.name) return { ok: true }
        try {
            await renamePropertyRaw(id, named.name)
            record([{ kind: 'renameProperty', id, from: current.name, to: named.name }])
            return { ok: true }
        } catch (e) {
            return { ok: false, error: errorText(e, "Couldn't rename that property.") }
        }
    }

    const snapshotValues = async (propertyId: string): Promise<MetaValue[]> => {
        if (!shared()) {
            return localValuesRef.current.filter((v) => v.propertyId === propertyId)
        }
        const { data } = await client.query({
            query: GET_META_VALUES_FOR_BASE,
            variables: { baseId },
            fetchPolicy: 'network-only',
        })
        return normalizeRows(data?.metaValues).filter(
            (v) => v.propertyId === propertyId
        )
    }

    const deleteProperty = async (id: string): Promise<MetaWriteResult> => {
        const property = metaPropertiesRef.current.find((p) => p.id === id)
        if (!property) return { ok: false, error: 'That property is gone.' }
        try {
            const values = await snapshotValues(id)
            await deletePropertyRaw(id)
            record([{ kind: 'deleteProperty', property, values }])
            return { ok: true }
        } catch (e) {
            return { ok: false, error: errorText(e, "Couldn't delete that property.") }
        }
    }

    const previewTypeChange = async (
        id: string,
        to: MetaPropertyType
    ): Promise<TypeChangePlan | null> => {
        const property = metaPropertiesRef.current.find((p) => p.id === id)
        if (!property) return null
        return planTypeChange(await snapshotValues(id), property.type, to)
    }

    const changePropertyType = async (
        id: string,
        to: MetaPropertyType
    ): Promise<MetaWriteResult> => {
        const property = metaPropertiesRef.current.find((p) => p.id === id)
        if (!property) return { ok: false, error: 'That property is gone.' }
        if (property.type === to) return { ok: true }
        if (shared() && to === 'image') {
            return { ok: false, error: META_IMAGE_SHARED_ERROR }
        }
        const op: MetaHistoryOp & { kind: 'changeType' } = {
            kind: 'changeType',
            id,
            from: property.type,
            to,
            before: [],
            after: [],
        }
        try {
            op.before = await snapshotValues(id)
            op.after = planTypeChange(op.before, property.type, to).converted
            await applyOp(op, 'redo')
            record([op])
            return { ok: true }
        } catch (e) {
            await applyOp(op, 'undo').catch(() => bumpValues())
            return { ok: false, error: errorText(e, "Couldn't change the type.") }
        }
    }

    const applyHistory = async (
        ops: readonly MetaHistoryOp[],
        direction: MetaHistoryDirection
    ): Promise<void> => {
        const ordered = direction === 'undo' ? [...ops].reverse() : ops
        for (const op of ordered) {
            try {
                await applyOp(op, direction)
            } catch (e) {
                console.error(`[meta] ${direction} of ${op.kind} failed`, e)
                bumpValues()
                return
            }
        }
    }

    const copyValuesForPaste = useCallback(
        async (objectIdMap: ReadonlyMap<string, string>): Promise<void> => {
            if (objectIdMap.size === 0) return
            if (!isPersistedRef.current) {
                const copies = copyValuesToObjects(
                    localValuesRef.current,
                    objectIdMap,
                    baseId
                )
                if (copies.length === 0) return
                commit(metaPropertiesRef.current, [
                    ...localValuesRef.current,
                    ...copies,
                ])
                bumpValues()
                return
            }
            const { data } = await client.query({
                query: GET_META_VALUES_FOR_OBJECTS,
                variables: { baseId, objectIds: [...objectIdMap.keys()] },
                fetchPolicy: 'network-only',
            })
            const copies = copyValuesToObjects(
                normalizeRows(data?.metaValues),
                objectIdMap,
                baseId
            )
            if (copies.length === 0) return
            await client.mutate({
                mutation: INSERT_BULK_META_VALUES,
                variables: { objects: copies.map(valueColumns) },
            })
            bumpValues()
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [baseId, bumpValues, client, commit, isPersistedRef]
    )

    const mergeIncoming = useCallback(
        async (
            incoming: MetaPropertySet,
            objectIdMap: ReadonlyMap<string, string>
        ): Promise<void> => {
            const isShared = isPersistedRef.current
            const { addedProperties, values } = mergeMetaSets(
                metaPropertiesRef.current,
                incoming,
                {
                    baseId,
                    objectIdMap,
                    skipProperty: isShared
                        ? (p): boolean => p.type === 'image'
                        : undefined,
                }
            )
            if (addedProperties.length === 0 && values.length === 0) return
            if (isShared) {
                if (addedProperties.length > 0) {
                    await client.mutate({
                        mutation: INSERT_BULK_META_PROPERTIES,
                        variables: {
                            objects: addedProperties.map(propertyColumns),
                        },
                    })
                }
                if (values.length > 0) {
                    await client.mutate({
                        mutation: INSERT_BULK_META_VALUES,
                        variables: { objects: values.map(valueColumns) },
                    })
                }
            }
            commit(
                [...metaPropertiesRef.current, ...addedProperties],
                isShared ? undefined : [...localValuesRef.current, ...values]
            )
            bumpValues()
        },
        [baseId, bumpValues, client, commit, isPersistedRef]
    )

    const readLocalSet = useCallback(
        (): MetaPropertySet => ({
            properties: metaPropertiesRef.current,
            values: localValuesRef.current,
        }),
        []
    )

    const exportSet = useCallback(async (): Promise<MetaPropertySet> => {
        if (!isPersistedRef.current) return readLocalSet()
        const { data } = await client.query({
            query: GET_META_VALUES_FOR_BASE,
            variables: { baseId },
            fetchPolicy: 'network-only',
        })
        return {
            properties: metaPropertiesRef.current,
            values: normalizeRows(data?.metaValues),
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseId, client, isPersistedRef, readLocalSet])

    const persistToBase = useCallback(
        async (
            serverBaseId: string,
            objectIdMap: ReadonlyMap<string, string>
        ): Promise<void> => {
            const { addedProperties, values } = mergeMetaSets([], readLocalSet(), {
                baseId: serverBaseId,
                objectIdMap,
                skipProperty: (p) => p.type === 'image',
            })
            if (addedProperties.length > 0) {
                await client.mutate({
                    mutation: INSERT_BULK_META_PROPERTIES,
                    variables: { objects: addedProperties.map(propertyColumns) },
                })
            }
            if (values.length > 0) {
                await client.mutate({
                    mutation: INSERT_BULK_META_VALUES,
                    variables: { objects: values.map(valueColumns) },
                })
            }
        },
        [client, readLocalSet]
    )

    return {
        metaProperties,
        metaPropertiesRef,
        valuesVersion,
        validateNewName,
        loadValues,
        addPropertyToObject,
        setValue,
        removeValue,
        renameProperty,
        previewTypeChange,
        changePropertyType,
        deleteProperty,
        applyHistory,
        copyValuesForPaste,
        mergeIncoming,
        readLocalSet,
        exportSet,
        persistToBase,
    }
}
