import { describe, it, expect } from 'vitest'
import {
    convertMetaValue,
    validateMetaPropertyName,
    validateMetaValue,
} from './metaValue'
import type { MetaProperty } from '../types/metaProperty'

const ok = (value: unknown): { ok: true; value: unknown } => ({ ok: true, value })

describe('validateMetaValue', () => {
    it('integer: accepts whole numbers, typed or as form text', () => {
        expect(validateMetaValue('integer', 42)).toEqual(ok(42))
        expect(validateMetaValue('integer', ' -7 ')).toEqual(ok(-7))
        expect(validateMetaValue('integer', '0')).toEqual(ok(0))
    })

    it('integer: rejects fractions, text, blanks and unsafe sizes', () => {
        for (const bad of [1.5, '1.5', 'abc', '', '   ', null, Number.NaN, 2 ** 60]) {
            expect(validateMetaValue('integer', bad).ok).toBe(false)
        }
    })

    it('text: keeps the text as typed, rejects blank and over-long', () => {
        expect(validateMetaValue('text', ' Open 9–5 ')).toEqual(ok(' Open 9–5 '))
        expect(validateMetaValue('text', '   ').ok).toBe(false)
        expect(validateMetaValue('text', 7).ok).toBe(false)
        expect(validateMetaValue('text', 'x'.repeat(2001)).ok).toBe(false)
    })

    it('email: trims, and catches the obvious typos only', () => {
        expect(validateMetaValue('email', ' a.b+c@site.co.in ')).toEqual(
            ok('a.b+c@site.co.in')
        )
        for (const bad of ['a@b', 'no-at.com', 'a @b.com', '', 5]) {
            expect(validateMetaValue('email', bad).ok).toBe(false)
        }
    })

    it('date: real calendar days in YYYY-MM-DD only', () => {
        expect(validateMetaValue('date', '2026-11-01')).toEqual(ok('2026-11-01'))
        expect(validateMetaValue('date', '2024-02-29')).toEqual(ok('2024-02-29'))
        for (const bad of ['2026-02-30', '2025-02-29', '01/11/2026', '2026-1-1', '']) {
            expect(validateMetaValue('date', bad).ok).toBe(false)
        }
    })

    it('image: an ImageAssetRef, nothing else', () => {
        const ref = {
            assetId: 'h',
            url: null,
            mimeType: 'image/png',
            naturalWidth: 1,
            naturalHeight: 1,
        }
        expect(validateMetaValue('image', ref)).toEqual(ok(ref))
        expect(validateMetaValue('image', 'h').ok).toBe(false)
        expect(validateMetaValue('image', { assetId: 'h' }).ok).toBe(false)
    })
})

describe('validateMetaPropertyName', () => {
    const existing: MetaProperty[] = [
        { id: 'p1', baseId: 'b', name: 'Photo', type: 'image', position: 0, createdBy: null },
    ]

    it('trims and collapses spaces', () => {
        expect(validateMetaPropertyName('  Opening   hours ', existing)).toEqual({
            ok: true,
            name: 'Opening hours',
        })
    })

    it('rejects a blank, an over-long, or a taken name (any case)', () => {
        expect(validateMetaPropertyName('  ', existing).ok).toBe(false)
        expect(validateMetaPropertyName('x'.repeat(61), existing).ok).toBe(false)
        expect(validateMetaPropertyName('photo', existing).ok).toBe(false)
    })

    it('lets a rename keep its own name', () => {
        expect(validateMetaPropertyName('PHOTO', existing, 'p1')).toEqual({
            ok: true,
            name: 'PHOTO',
        })
    })
})

describe('convertMetaValue (type change)', () => {
    const IMG = {
        assetId: 'h',
        url: null,
        mimeType: 'image/png',
        naturalWidth: 1,
        naturalHeight: 1,
    }

    it('to Text: numbers, dates and emails convert; images clear', () => {
        expect(convertMetaValue('integer', 'text', 42)).toEqual({ value: '42' })
        expect(convertMetaValue('date', 'text', '2026-11-01')).toEqual({
            value: '2026-11-01',
        })
        expect(convertMetaValue('email', 'text', 'a@b.co')).toEqual({ value: 'a@b.co' })
        expect(convertMetaValue('image', 'text', IMG)).toBeNull()
    })

    it('to Number / Email / Date: only text that already fits', () => {
        expect(convertMetaValue('text', 'integer', ' 7 ')).toEqual({ value: 7 })
        expect(convertMetaValue('text', 'integer', '9–5')).toBeNull()
        expect(convertMetaValue('date', 'integer', '2026-11-01')).toBeNull()
        expect(convertMetaValue('text', 'email', 'x@y.org')).toEqual({ value: 'x@y.org' })
        expect(convertMetaValue('text', 'email', 'hello')).toBeNull()
        expect(convertMetaValue('text', 'date', '2026-02-28')).toEqual({
            value: '2026-02-28',
        })
        expect(convertMetaValue('text', 'date', 'tomorrow')).toBeNull()
    })

    it('to Image: nothing converts', () => {
        expect(convertMetaValue('text', 'image', 'photo.png')).toBeNull()
    })

    it('same type keeps the value untouched', () => {
        expect(convertMetaValue('image', 'image', IMG)).toEqual({ value: IMG })
    })
})
