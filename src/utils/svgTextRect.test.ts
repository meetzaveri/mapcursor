import { describe, it, expect } from 'vitest'
import { svgTextScreenRect } from './svgTextRect'

const makeEl = (
    rect: { left: number; top: number; width: number; height: number },
    ctm: { e: number; f: number; a?: number } | null,
    attrs: Record<string, string> = {}
): SVGGraphicsElement =>
    ({
        getBoundingClientRect: () => rect,
        getScreenCTM: ctm
            ? () => ({ a: ctm.a ?? 1, b: 0, c: 0, d: ctm.a ?? 1, e: ctm.e, f: ctm.f })
            : () => null,
        getAttribute: (name: string) => attrs[name] ?? null,
    }) as unknown as SVGGraphicsElement

describe('svgTextScreenRect', () => {
    it('passes a real rect straight through', () => {
        const el = makeEl(
            { left: 300, top: 267, width: 82, height: 41 },
            { e: 300, f: 300 }
        )

        expect(svgTextScreenRect(el, 36)).toEqual({
            left: 300,
            top: 267,
            width: 82,
            height: 41,
        })
    })

    it('recovers the position firefox drops for empty text', () => {
        const el = makeEl({ left: 0, top: 0, width: 0, height: 0 }, { e: 300, f: 300 })

        const r = svgTextScreenRect(el, 36)

        expect(r.left).toBe(300)
        expect(r.top).toBeCloseTo(266.9, 0)
        expect(r.height).toBeCloseTo(41, 0)
        expect(r.top + r.height / 2).toBeCloseTo(287.5, 0)
    })

    it('scales the synthesised box with the rendered font size', () => {
        const el = makeEl({ left: 0, top: 0, width: 0, height: 0 }, { e: 300, f: 200 })

        const small = svgTextScreenRect(el, 12)
        const large = svgTextScreenRect(el, 48)

        expect(large.height / small.height).toBeCloseTo(4, 5)
        expect(small.top + small.height / 2).toBeLessThan(200)
        expect(large.top + large.height / 2).toBeLessThan(small.top + small.height / 2)
    })

    it('honours the text node own x/y through the CTM', () => {
        const el = makeEl(
            { left: 0, top: 0, width: 0, height: 0 },
            { e: 300, f: 300, a: 2 },
            { x: '10', y: '5' }
        )

        expect(svgTextScreenRect(el, 36).left).toBe(320)
    })

    it('falls back to the raw rect when there is no CTM', () => {
        const el = makeEl({ left: 42, top: 7, width: 0, height: 0 }, null)

        expect(svgTextScreenRect(el, 36)).toEqual({
            left: 42,
            top: 7,
            width: 0,
            height: 0,
        })
    })
})
