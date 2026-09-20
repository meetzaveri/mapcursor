import { describe, it, expect } from 'vitest'
import { svgTextScreenRect } from './svgTextRect'

// jsdom implements neither SVG layout nor getScreenCTM, so the element is a
// stub. The numbers in it are not invented: they are what chromium and firefox
// actually reported for a 36px <text> at translate(300,200) / (300,300),
// captured by driving both engines with Playwright.
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
    // Text with glyphs measures correctly everywhere; don't second-guess it.
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

    // The bug: firefox loses the position of an empty <text> entirely, which
    // put the editing textarea in the corner of the viewport.
    it('recovers the position firefox drops for empty text', () => {
        const el = makeEl({ left: 0, top: 0, width: 0, height: 0 }, { e: 300, f: 300 })

        const r = svgTextScreenRect(el, 36)

        expect(r.left).toBe(300)
        // Reconstructs the box chromium reports for the same node: top 267,
        // height 41, so a centre of 287.5 against a baseline of 300.
        expect(r.top).toBeCloseTo(266.9, 0)
        expect(r.height).toBeCloseTo(41, 0)
        expect(r.top + r.height / 2).toBeCloseTo(287.5, 0)
    })

    it('scales the synthesised box with the rendered font size', () => {
        const el = makeEl({ left: 0, top: 0, width: 0, height: 0 }, { e: 300, f: 200 })

        const small = svgTextScreenRect(el, 12)
        const large = svgTextScreenRect(el, 48)

        expect(large.height / small.height).toBeCloseTo(4, 5)
        // The anchor is the baseline in both cases, so both boxes sit above it.
        expect(small.top + small.height / 2).toBeLessThan(200)
        expect(large.top + large.height / 2).toBeLessThan(small.top + small.height / 2)
    })

    // Two.js positions via the group transform, but a non-zero x/y must not be
    // silently dropped: the CTM maps the element's own coordinate system.
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
