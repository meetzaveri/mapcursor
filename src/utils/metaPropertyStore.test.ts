import { describe, it, expect, beforeEach } from 'vitest'
import {
    copyValuesToObjects,
    dropOrphanValues,
    mergeMetaSets,
    metaSidecarKey,
    normalizeMetaSet,
    readMetaLocal,
    writeMetaLocal,
} from './metaPropertyStore'
import type { MetaProperty, MetaPropertySet, MetaValue } from '../types/metaProperty'

const prop = (
    id: string,
    name: string,
    type: MetaProperty['type'],
    position = 0
): MetaProperty => ({ id, baseId: 'old', name, type, position, createdBy: null })

const val = (
    id: string,
    propertyId: string,
    objectId: string,
    value: unknown
): MetaValue => ({
    id,
    baseId: 'old',
    propertyId,
    objectId,
    objectType: 'point',
    value,
    createdBy: null,
})

const IMG = {
    assetId: 'hash',
    url: null,
    mimeType: 'image/png',
    naturalWidth: 1,
    naturalHeight: 1,
}

const set: MetaPropertySet = {
    properties: [prop('p-hours', 'Hours', 'text', 0), prop('p-photo', 'Photo', 'image', 1)],
    values: [
        val('v1', 'p-hours', 'obj-a', '9–5'),
        val('v2', 'p-photo', 'obj-a', IMG),
        val('v3', 'p-hours', 'obj-b', '10–6'),
    ],
}

beforeEach(() => localStorage.clear())

describe('normalizeMetaSet', () => {
    it('drops rows it could never render', () => {
        const out = normalizeMetaSet({
            properties: [
                prop('p1', 'Rating', 'integer'),
                { id: 'p2', name: 'Bad', type: 'boolean' }, // type not in the enum
            ],
            values: [
                val('ok', 'p1', 'o', 4),
                val('wrong-shape', 'p1', 'o2', 'four'), // not an integer
                val('no-prop', 'p2', 'o', 1), // its property was dropped
                { ...val('bad-obj', 'p1', 'o3', 1), objectType: 'pencil' },
            ],
        })
        expect(out.properties.map((p) => p.id)).toEqual(['p1'])
        expect(out.values.map((v) => v.id)).toEqual(['ok'])
    })

    it('treats junk as an empty set', () => {
        expect(normalizeMetaSet(null)).toEqual({ properties: [], values: [] })
        expect(normalizeMetaSet('x')).toEqual({ properties: [], values: [] })
    })
})

describe('local sidecar', () => {
    it('round-trips, and an empty set removes the key', () => {
        writeMetaLocal('b1', set)
        expect(readMetaLocal('b1')).toEqual(set)
        writeMetaLocal('b1', { properties: [], values: [] })
        expect(localStorage.getItem(metaSidecarKey('b1'))).toBeNull()
    })

    it('reads unreadable storage as empty', () => {
        localStorage.setItem(metaSidecarKey('b1'), '{broken')
        expect(readMetaLocal('b1')).toEqual({ properties: [], values: [] })
    })
})

describe('dropOrphanValues', () => {
    it('keeps values whose object still exists, and every definition', () => {
        const out = dropOrphanValues(set, new Set(['obj-b']))
        expect(out.values.map((v) => v.id)).toEqual(['v3'])
        expect(out.properties).toBe(set.properties)
    })

    it('returns the same set when nothing is orphaned', () => {
        expect(dropOrphanValues(set, new Set(['obj-a', 'obj-b']))).toBe(set)
    })
})

describe('mergeMetaSets', () => {
    const objectIdMap = new Map([
        ['obj-a', 'new-a'],
        ['obj-b', 'new-b'],
    ])

    it('share: re-keys everything onto the new base and objects', () => {
        const out = mergeMetaSets([], set, { baseId: 'server', objectIdMap })
        expect(out.addedProperties.map((p) => p.name)).toEqual(['Hours', 'Photo'])
        out.addedProperties.forEach((p) => {
            expect(p.baseId).toBe('server')
            expect(['p-hours', 'p-photo']).not.toContain(p.id)
        })
        const hours = out.addedProperties[0]!
        const carried = out.values.find((v) => v.value === '10–6')!
        expect(carried.objectId).toBe('new-b')
        expect(carried.propertyId).toBe(hours.id)
        expect(carried.baseId).toBe('server')
        expect(['v1', 'v2', 'v3']).not.toContain(carried.id)
    })

    it('share: skipping image properties also drops their values', () => {
        const out = mergeMetaSets([], set, {
            baseId: 'server',
            objectIdMap,
            skipProperty: (p) => p.type === 'image',
        })
        expect(out.addedProperties.map((p) => p.name)).toEqual(['Hours'])
        expect(out.values.every((v) => typeof v.value === 'string')).toBe(true)
        expect(out.values).toHaveLength(2)
    })

    it('merge: reuses a same-name same-type property (any case)', () => {
        const target = [prop('t-hours', 'hours', 'text', 0)]
        const out = mergeMetaSets(target, set, { baseId: 'b', objectIdMap })
        expect(out.addedProperties.map((p) => p.name)).toEqual(['Photo'])
        const hoursValues = out.values.filter((v) => typeof v.value === 'string')
        expect(hoursValues.every((v) => v.propertyId === 't-hours')).toBe(true)
        expect(out.addedProperties[0]!.position).toBe(1)
    })

    it('merge: renames a same-name property of another type', () => {
        const target = [prop('t-photo', 'Photo', 'text', 0)]
        const out = mergeMetaSets(target, set, { baseId: 'b', objectIdMap })
        expect(out.addedProperties.map((p) => p.name)).toEqual([
            'Hours',
            'Photo (2)',
        ])
    })

    it('drops values of objects that did not come across', () => {
        const out = mergeMetaSets([], set, {
            baseId: 'b',
            objectIdMap: new Map([['obj-b', 'new-b']]),
        })
        expect(out.values.map((v) => v.objectId)).toEqual(['new-b'])
    })
})

describe('copyValuesToObjects', () => {
    it('copies onto the new objects with fresh ids, sharing definitions', () => {
        const copies = copyValuesToObjects(
            set.values,
            new Map([['obj-a', 'copy-a']]),
            'b'
        )
        expect(copies).toHaveLength(2)
        copies.forEach((c) => {
            expect(c.objectId).toBe('copy-a')
            expect(['v1', 'v2']).not.toContain(c.id)
        })
        expect(copies.map((c) => c.propertyId).sort()).toEqual([
            'p-hours',
            'p-photo',
        ])
        // The pasted photo points at the same stored bytes.
        expect(copies.find((c) => c.propertyId === 'p-photo')?.value).toEqual(IMG)
    })
})
