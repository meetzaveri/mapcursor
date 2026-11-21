import { describe, it, expect, beforeEach } from 'vitest'
import {
    isAnchorKeyExpired,
    readAnchorConfig,
    writeAnchorConfig,
} from './anchorStorage'
import { MAP_ANCHOR_KEY_PREFIX, VIEWPORT_TTL_MS } from '../constants/misc'
import { parseImportedBase } from '../utils/importBase'

const AHMEDABAD = { lngLat: [72.5714, 23.0225] as [number, number], zoom: 15 }
const DAY = 24 * 60 * 60 * 1000

beforeEach(() => {
    localStorage.clear()
})

const seedAnchor = (baseId: string, ageMs: number): void => {
    localStorage.setItem(
        `${MAP_ANCHOR_KEY_PREFIX}${baseId}`,
        JSON.stringify({ mapAnchor: AHMEDABAD, savedAt: Date.now() - ageMs })
    )
}

describe('readAnchorConfig', () => {
    it('keeps an anchor however long ago it was placed', () => {
        seedAnchor('base-1', VIEWPORT_TTL_MS + 5 * DAY)
        expect(readAnchorConfig('base-1').mapAnchor).toEqual(AHMEDABAD)
        expect(
            localStorage.getItem(`${MAP_ANCHOR_KEY_PREFIX}base-1`)
        ).not.toBeNull()
    })

    it('still reads a malformed entry as no anchor, without throwing', () => {
        localStorage.setItem(`${MAP_ANCHOR_KEY_PREFIX}base-1`, '{not json')
        expect(readAnchorConfig('base-1').mapAnchor).toBeNull()
    })

    it('round-trips what writeAnchorConfig stored', () => {
        writeAnchorConfig('base-1', { mapAnchor: AHMEDABAD })
        expect(readAnchorConfig('base-1').mapAnchor).toEqual(AHMEDABAD)
    })
})

describe('isAnchorKeyExpired', () => {
    const now = Date.now()
    const old = now - VIEWPORT_TTL_MS - DAY
    const fresh = now - DAY
    const key = (id: string): string => `${MAP_ANCHOR_KEY_PREFIX}${id}`

    it('never expires the current local base’s anchor', () => {
        expect(
            isAnchorKeyExpired(key('current'), old, now, new Set(['current']))
        ).toBe(false)
    })

    it('expires an old anchor of any other base', () => {
        expect(
            isAnchorKeyExpired(key('rotated-away'), old, now, new Set(['current']))
        ).toBe(true)
    })

    it('keeps a fresh anchor of another base', () => {
        expect(
            isAnchorKeyExpired(key('other'), fresh, now, new Set(['current']))
        ).toBe(false)
    })

    it('treats a missing savedAt as old, unless protected', () => {
        expect(isAnchorKeyExpired(key('other'), undefined, now, new Set())).toBe(
            true
        )
        expect(
            isAnchorKeyExpired(key('current'), undefined, now, new Set(['current']))
        ).toBe(false)
    })

    it('ignores keys that are not anchors', () => {
        expect(
            isAnchorKeyExpired('mapcursor_viewport_x', old, now, new Set())
        ).toBe(false)
    })
})

describe('parseImportedBase: mapAnchor', () => {
    const file = (extra: Record<string, unknown>): string =>
        JSON.stringify({ components: {}, ...extra })

    it('reads the anchor the export wrote', () => {
        expect(parseImportedBase(file({ mapAnchor: AHMEDABAD })).mapAnchor).toEqual(
            AHMEDABAD
        )
    })

    it('is null when the file has none or it is malformed', () => {
        expect(parseImportedBase(file({})).mapAnchor).toBeNull()
        expect(parseImportedBase(file({ mapAnchor: null })).mapAnchor).toBeNull()
        expect(
            parseImportedBase(file({ mapAnchor: { lngLat: ['x', 1], zoom: 15 } }))
                .mapAnchor
        ).toBeNull()
    })
})
