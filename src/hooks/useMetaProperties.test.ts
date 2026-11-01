import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, createElement, useRef } from 'react'
import type { ReactNode } from 'react'
import {
    ApolloClient,
    ApolloLink,
    ApolloProvider,
    InMemoryCache,
    Observable,
} from '@apollo/client'
import type { Operation } from '@apollo/client'
import { useMetaProperties, META_IMAGE_SHARED_ERROR } from './useMetaProperties'
import type { MetaCell, MetaHistoryOp } from './useMetaProperties'
import type { HistoryEntry } from './useComponentHistory'
import { metaSidecarKey, readMetaLocal } from '../utils/metaPropertyStore'
import { renderHook, unmountAllHooks } from '../utils/testing/renderHook'
import type { MetaProperty } from '../types/metaProperty'

const BASE = 'local-base'
const IMG = {
    assetId: 'hash',
    url: null,
    mimeType: 'image/png',
    naturalWidth: 1,
    naturalHeight: 1,
}
const POINT: MetaCell = { objectId: 'point-1', objectType: 'point' }
const ROUTE: MetaCell = { objectId: 'route-1', objectType: 'route' }

// A client that records every operation and answers with `respond`.
function recordingClient(
    respond: (op: Operation) => Record<string, unknown> = () => ({})
): { client: ApolloClient<unknown>; ops: Operation[] } {
    const ops: Operation[] = []
    const link = new ApolloLink(
        (op) =>
            new Observable((observer) => {
                ops.push(op)
                observer.next({ data: respond(op) })
                observer.complete()
            })
    )
    return {
        ops,
        client: new ApolloClient({
            link,
            cache: new InMemoryCache({ addTypename: false }),
        }) as ApolloClient<unknown>,
    }
}

type Api = ReturnType<typeof useMetaProperties>

function mount(
    persisted: boolean,
    client = recordingClient().client,
    seed?: unknown[]
): { meta: { current: Api }; history: HistoryEntry[] } {
    const history: HistoryEntry[] = []
    const { result } = renderHook(
        () => {
            const isPersistedRef = useRef(persisted)
            return useMetaProperties({
                baseId: BASE,
                isPersistedRef,
                seed,
                recordToHistoryLog: (entry) => history.push(entry),
            })
        },
        (children: ReactNode) => createElement(ApolloProvider, { client, children })
    )
    return { meta: result, history }
}

const opsOf = (entry: HistoryEntry | undefined): MetaHistoryOp[] =>
    entry?.action === 'META' ? entry.ops : []

// What the real history hook does on Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.
async function undo(meta: { current: Api }, entry: HistoryEntry | undefined) {
    await act(async () => meta.current.applyHistory(opsOf(entry), 'undo'))
}
async function redo(meta: { current: Api }, entry: HistoryEntry | undefined) {
    await act(async () => meta.current.applyHistory(opsOf(entry), 'redo'))
}

async function addNew(
    meta: { current: Api },
    name: string,
    type: MetaProperty['type'],
    value: unknown,
    cell = POINT
): Promise<MetaProperty> {
    let property: MetaProperty | undefined
    await act(async () => {
        const r = await meta.current.addPropertyToObject(
            { create: { name, type } },
            cell,
            value
        )
        if (!r.ok) throw new Error(r.error)
        property = r.property
    })
    return property!
}

const valueOf = async (meta: { current: Api }, cell = POINT): Promise<unknown[]> =>
    (await meta.current.loadValues(cell.objectId)).map((v) => v.value)

beforeEach(() => localStorage.clear())
afterEach(() => unmountAllHooks())

describe('local canvas: adding properties', () => {
    it('creates the property and its value as ONE undo step', async () => {
        const { meta, history } = mount(false)
        await addNew(meta, ' Hours ', 'text', '9–5')
        expect(meta.current.metaProperties.map((p) => p.name)).toEqual(['Hours'])
        expect(history).toHaveLength(1)
        expect(opsOf(history[0]).map((o) => o.kind)).toEqual([
            'createProperty',
            'setValue',
        ])
        expect(readMetaLocal(BASE).values).toHaveLength(1)
    })

    it('refuses a taken name and a bad value, leaving nothing behind', async () => {
        const { meta, history } = mount(false)
        await addNew(meta, 'Hours', 'text', '9–5')
        let r: Awaited<ReturnType<Api['addPropertyToObject']>>
        await act(async () => {
            r = await meta.current.addPropertyToObject(
                { create: { name: 'hours', type: 'integer' } },
                POINT,
                3
            )
        })
        expect(r!.ok).toBe(false)
        await act(async () => {
            r = await meta.current.addPropertyToObject(
                { create: { name: 'Rating', type: 'integer' } },
                POINT,
                '4.5'
            )
        })
        expect(r!).toEqual({ ok: false, error: 'Enter a whole number.' })
        // No stray "Rating" definition, no extra undo step.
        expect(meta.current.metaProperties.map((p) => p.name)).toEqual(['Hours'])
        expect(history).toHaveLength(1)
    })
})

describe('local canvas: undo / redo of every edit', () => {
    it('add property: undo removes both; redo brings both back, same ids', async () => {
        const { meta, history } = mount(false)
        const hours = await addNew(meta, 'Hours', 'text', '9–5')
        const [stored] = await meta.current.loadValues(POINT.objectId)

        await undo(meta, history[0])
        expect(meta.current.metaProperties).toEqual([])
        expect(await valueOf(meta)).toEqual([])
        expect(localStorage.getItem(metaSidecarKey(BASE))).toBeNull()

        await redo(meta, history[0])
        expect(meta.current.metaProperties.map((p) => p.id)).toEqual([hours.id])
        expect(await meta.current.loadValues(POINT.objectId)).toEqual([stored])
    })

    it('edit value: undo restores the old value; redo the new', async () => {
        const { meta, history } = mount(false)
        const hours = await addNew(meta, 'Hours', 'text', '9–5')
        await act(async () => {
            await meta.current.setValue(hours, POINT, 'Open 24/7')
        })
        expect(await valueOf(meta)).toEqual(['Open 24/7'])
        expect(opsOf(history[1]).map((o) => o.kind)).toEqual(['setValue'])

        await undo(meta, history[1])
        expect(await valueOf(meta)).toEqual(['9–5'])
        await redo(meta, history[1])
        expect(await valueOf(meta)).toEqual(['Open 24/7'])
    })

    it('remove from object: undo re-attaches it to the same object', async () => {
        const { meta, history } = mount(false)
        await addNew(meta, 'Photo', 'image', IMG)
        const [value] = await meta.current.loadValues(POINT.objectId)
        await act(async () => {
            await meta.current.removeValue(value!)
        })
        expect(await valueOf(meta)).toEqual([])

        await undo(meta, history[1])
        expect(await meta.current.loadValues(POINT.objectId)).toEqual([value])
        await redo(meta, history[1])
        expect(await valueOf(meta)).toEqual([])
    })

    it('rename: undo restores the old name; redo the new', async () => {
        const { meta, history } = mount(false)
        const hours = await addNew(meta, 'Hours', 'text', '9–5')
        await act(async () => {
            await meta.current.renameProperty(hours.id, 'Opening hours')
        })
        await undo(meta, history[1])
        expect(meta.current.metaProperties[0]!.name).toBe('Hours')
        await redo(meta, history[1])
        expect(meta.current.metaProperties[0]!.name).toBe('Opening hours')
    })

    it('delete property: undo brings it back with EVERY value it had', async () => {
        const { meta, history } = mount(false)
        const hours = await addNew(meta, 'Hours', 'text', '9–5')
        await act(async () => {
            await meta.current.addPropertyToObject({ existing: hours }, ROUTE, 'All day')
        })
        await act(async () => {
            await meta.current.deleteProperty(hours.id)
        })
        expect(meta.current.metaProperties).toEqual([])
        expect(await valueOf(meta, ROUTE)).toEqual([])

        await undo(meta, history[2])
        expect(meta.current.metaProperties.map((p) => p.id)).toEqual([hours.id])
        expect(await valueOf(meta, POINT)).toEqual(['9–5'])
        expect(await valueOf(meta, ROUTE)).toEqual(['All day'])
        // And it survives a reload of the sidecar.
        expect(readMetaLocal(BASE).values).toHaveLength(2)

        await redo(meta, history[2])
        expect(meta.current.metaProperties).toEqual([])
    })

    it('undoing several steps in a row walks back through them', async () => {
        const { meta, history } = mount(false)
        const hours = await addNew(meta, 'Hours', 'text', 'a')
        await act(async () => {
            await meta.current.setValue(hours, POINT, 'b')
        })
        await act(async () => {
            await meta.current.setValue(hours, POINT, 'c')
        })
        await undo(meta, history[2])
        expect(await valueOf(meta)).toEqual(['b'])
        await undo(meta, history[1])
        expect(await valueOf(meta)).toEqual(['a'])
        await undo(meta, history[0])
        expect(meta.current.metaProperties).toEqual([])
    })
})

describe('change property type', () => {
    it('converts what fits, clears the rest; undo restores type and all values', async () => {
        const { meta, history } = mount(false)
        const qty = await addNew(meta, 'Quantity', 'text', '12')
        await act(async () => {
            await meta.current.addPropertyToObject({ existing: qty }, ROUTE, 'a dozen')
        })

        const plan = await meta.current.previewTypeChange(qty.id, 'integer')
        expect(plan?.converted.map((v) => v.value)).toEqual([12])
        expect(plan?.cleared.map((v) => v.value)).toEqual(['a dozen'])

        await act(async () => {
            const r = await meta.current.changePropertyType(qty.id, 'integer')
            expect(r.ok).toBe(true)
        })
        expect(meta.current.metaProperties[0]!.type).toBe('integer')
        expect(await valueOf(meta, POINT)).toEqual([12])
        expect(await valueOf(meta, ROUTE)).toEqual([])
        expect(opsOf(history[2]).map((o) => o.kind)).toEqual(['changeType'])

        await undo(meta, history[2])
        expect(meta.current.metaProperties[0]!.type).toBe('text')
        expect(await valueOf(meta, POINT)).toEqual(['12'])
        // The value that had been cleared is back, on its object.
        expect(await valueOf(meta, ROUTE)).toEqual(['a dozen'])

        await redo(meta, history[2])
        expect(meta.current.metaProperties[0]!.type).toBe('integer')
        expect(await valueOf(meta, POINT)).toEqual([12])
        expect(await valueOf(meta, ROUTE)).toEqual([])
    })

    it('is refused to Image on a shared canvas', async () => {
        const { meta, history } = mount(true, recordingClient().client, [
            { id: 'p', baseId: BASE, name: 'Hours', type: 'text', position: 0 },
        ])
        let r: Awaited<ReturnType<Api['changePropertyType']>>
        await act(async () => {
            r = await meta.current.changePropertyType('p', 'image')
        })
        expect(r!).toEqual({ ok: false, error: META_IMAGE_SHARED_ERROR })
        expect(history).toHaveLength(0)
    })

    it('shared: retypes, rewrites converted cells, deletes cleared cells', async () => {
        const rows = [
            { id: 'v1', baseId: BASE, propertyId: 'p', objectId: 'o1', objectType: 'point', value: '5' },
            { id: 'v2', baseId: BASE, propertyId: 'p', objectId: 'o2', objectType: 'point', value: 'five' },
        ]
        const { client, ops } = recordingClient((op) =>
            op.operationName === 'getMetaValuesForBase'
                ? { metaValues: rows }
                : op.operationName === 'upsertMetaValue'
                  ? { value: { ...op.variables.object, createdBy: null } }
                  : {}
        )
        const { meta } = mount(true, client, [
            { id: 'p', baseId: BASE, name: 'Count', type: 'text', position: 0 },
        ])
        await act(async () => {
            await meta.current.changePropertyType('p', 'integer')
        })
        const names = ops.map((o) => o.operationName)
        expect(names).toEqual([
            'getMetaValuesForBase',
            'updateMetaProperty',
            'upsertMetaValue',
            'deleteMetaValueByCell',
        ])
        expect(ops[1]!.variables.updateObj.type).toBe('integer')
        expect(ops[2]!.variables.object).toMatchObject({ objectId: 'o1', value: 5 })
        expect(ops[3]!.variables).toEqual({ propertyId: 'p', objectId: 'o2' })
    })
})

describe('local canvas: paste', () => {
    it('copies values onto the new objects, keeping image refs', async () => {
        const { meta } = mount(false)
        await addNew(meta, 'Photo', 'image', IMG)
        await act(async () => {
            await meta.current.copyValuesForPaste(new Map([['point-1', 'copy']]))
        })
        const copied = await meta.current.loadValues('copy')
        expect(copied.map((v) => v.value)).toEqual([IMG])
        expect(await valueOf(meta)).toHaveLength(1)
    })
})

describe('shared canvas', () => {
    const seed = [{ id: 'p', baseId: BASE, name: 'Hours', type: 'text', position: 0 }]

    it('refuses image properties and image values', async () => {
        const { meta } = mount(true, recordingClient().client, [
            { id: 'ph', baseId: BASE, name: 'Photo', type: 'image', position: 0 },
        ])
        let r: Awaited<ReturnType<Api['addPropertyToObject']>>
        await act(async () => {
            r = await meta.current.addPropertyToObject(
                { create: { name: 'Pic', type: 'image' } },
                POINT,
                IMG
            )
        })
        expect(r!).toEqual({ ok: false, error: META_IMAGE_SHARED_ERROR })
        expect(meta.current.metaProperties.map((p) => p.name)).toEqual(['Photo'])
    })

    it('upserts a value, never sends createdBy, and undo deletes the cell', async () => {
        const { client, ops } = recordingClient((op) =>
            op.operationName === 'upsertMetaValue'
                ? { value: { ...op.variables.object, id: 'server-row', createdBy: 'u1' } }
                : op.operationName === 'getMetaValuesForObject'
                  ? { metaValues: [] }
                  : {}
        )
        const { meta, history } = mount(true, client, seed)
        await act(async () => {
            await meta.current.loadValues(POINT.objectId)
        })
        const hours = meta.current.metaProperties[0]!
        await act(async () => {
            await meta.current.setValue(hours, POINT, '24/7')
        })
        const upsert = ops.find((o) => o.operationName === 'upsertMetaValue')!
        expect(upsert.variables.object).toMatchObject({
            baseId: BASE,
            propertyId: 'p',
            objectId: 'point-1',
            objectType: 'point',
            value: '24/7',
        })
        expect(upsert.variables.object).not.toHaveProperty('createdBy')

        // The cell was empty, so undo deletes it, addressed by CELL (an
        // upsert keeps the server's row id, so ids can't be trusted).
        await undo(meta, history[0])
        const del = ops.find((o) => o.operationName === 'deleteMetaValueByCell')!
        expect(del.variables).toEqual({ propertyId: 'p', objectId: 'point-1' })
    })

    it('undo of a delete re-inserts the property, then its values', async () => {
        const stored = {
            id: 'v1',
            baseId: BASE,
            propertyId: 'p',
            objectId: 'point-1',
            objectType: 'point',
            value: '9–5',
        }
        const { client, ops } = recordingClient((op) =>
            op.operationName === 'getMetaValuesForBase' ? { metaValues: [stored] } : {}
        )
        const { meta, history } = mount(true, client, seed)
        await act(async () => {
            await meta.current.deleteProperty('p')
        })
        expect(ops.map((o) => o.operationName)).toEqual([
            'getMetaValuesForBase',
            'deleteMetaProperty',
        ])
        await undo(meta, history[0])
        expect(ops.slice(2).map((o) => o.operationName)).toEqual([
            'insertMetaProperty',
            'insertBulkMetaValues',
        ])
        expect(ops[3]!.variables.objects[0]).toMatchObject({ id: 'v1', value: '9–5' })
    })
})

describe('persistToBase (share)', () => {
    it('inserts definitions then values, re-keyed, without images', async () => {
        const { client, ops } = recordingClient()
        const { meta } = mount(false, client)
        const hours = await addNew(meta, 'Hours', 'text', '9–5')
        await addNew(meta, 'Photo', 'image', IMG)
        await act(async () => {
            await meta.current.persistToBase(
                'server-base',
                new Map([['point-1', 'server-a']])
            )
        })
        expect(ops.map((o) => o.operationName)).toEqual([
            'insertBulkMetaProperties',
            'insertBulkMetaValues',
        ])
        const [props, values] = ops.map(
            (o) => o.variables.objects as Record<string, unknown>[]
        )
        expect(props!.map((p) => p.name)).toEqual(['Hours'])
        expect(props![0]!.baseId).toBe('server-base')
        expect(props![0]!.id).not.toBe(hours.id)
        expect(values).toHaveLength(1)
        expect(values![0]).toMatchObject({
            baseId: 'server-base',
            objectId: 'server-a',
            propertyId: props![0]!.id,
            value: '9–5',
        })
    })
})
