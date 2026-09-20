// The one place the selection chrome is described.
//
// Four different code paths draw "this element is selected": the
// SelectionController (rectangle / circle / diamond / text box + 4 corner
// dots), the legacy ObjectSelector (text, point, pencil, group), the per-vertex
// handles (route / area / curved line) and the group object's own resize dots.
// They had each picked their own colours and widths, so a point read amber, a
// route read indigo and a map circle's ring thickened as you zoomed in. These
// tokens are what they now all read from.
//
// Two rules the numbers encode:
//  - Everything here is in SCREEN px. Every consumer divides by the camera
//    scale (or counter-scales its shape) so the chrome is the same size at 5%
//    and at 500% zoom — the chrome describes the selection, not the world.
//  - The BOX follows the theme's ink so it stays readable on the dark canvas
//    and over a basemap; the grab DOTS are fixed indigo in both themes, because
//    "you can pull this" should not be a colour that also means "text".

import { HANDLE_STROKE } from '../constants/misc'

/** Ring colour of every grab dot. Re-exported so consumers need one import. */
export { HANDLE_STROKE }

/** Body colour of every grab dot — off-white, so it reads as a dot on ink. */
export const SELECTION_HANDLE_FILL = '#FFFFFF'

/** Outline width of the selection box, in screen px. */
export const SELECTION_BOX_LINEWIDTH_PX = 1.5

/** Ring width of a grab dot, in screen px. Matches the box by design. */
export const SELECTION_HANDLE_LINEWIDTH_PX = 1.5

// Grab dots come in two sizes, and they are NOT the same number.
//
// Touch needs a bigger target than a mouse, and the ObjectSelector, the vertex
// handles and the group's resize dots all hit-test the SVG dot itself — so for
// them the dot IS the target. That is why the touch dot was 11px: at the mouse
// value it measured ~5px across on a zoomed-out map base, which is unhittable
// with a finger.
//
// The cost was that an 11px radius draws a 22px dot, which on a phone crowds
// the very shape it is describing — four of them around a small area read as
// the selection rather than as its corners. So the two concerns are now
// separate numbers: a dot is DRAWN at the visual radius and GRABBED at the hit
// radius, with an invisible companion circle carrying the listener (see
// objectSelector / vertexHandles).
//
// The touch hit radius is deliberately still 11 — the old visual value — so
// the change is visual only and nothing became harder to grab. Mouse keeps one
// number for both, leaving desktop behaviour untouched.
const SELECTION_HANDLE_RADIUS_PX_MOUSE = 5
const SELECTION_HANDLE_RADIUS_PX_TOUCH = 7
const SELECTION_HANDLE_HIT_RADIUS_PX_MOUSE = 5
const SELECTION_HANDLE_HIT_RADIUS_PX_TOUCH = 11

/**
 * Touch and pen report a coarse pointer; a mouse or trackpad reports fine.
 * Deliberately a pointer query rather than a viewport width — a small window
 * on a laptop is still a mouse, and a large tablet is still a finger.
 */
function isCoarsePointer(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(pointer: coarse)')?.matches === true
    )
}

/** Radius a grab dot is DRAWN at, in screen px. */
export function selectionHandleRadiusPx(): number {
    return isCoarsePointer()
        ? SELECTION_HANDLE_RADIUS_PX_TOUCH
        : SELECTION_HANDLE_RADIUS_PX_MOUSE
}

/**
 * Radius a grab dot is GRABBED at, in screen px — always >= the visual radius.
 * Consumers that hit-test a real SVG node give it a transparent circle this
 * big; `selectionController`, which hit-tests by distance, measures against it.
 */
export function selectionHandleHitRadiusPx(): number {
    return isCoarsePointer()
        ? SELECTION_HANDLE_HIT_RADIUS_PX_TOUCH
        : SELECTION_HANDLE_HIT_RADIUS_PX_MOUSE
}

/**
 * Selection box + chrome stroke. Follows the active theme's `ink` so it stays
 * high-contrast against the canvas in BOTH themes: near-black on the light
 * parchment, light-warm on the dark canvas. Read live from the `--color-ink`
 * CSS variable (RGB channels, set in App.css + flipped by `.dark`) because this
 * is a Two.js scene color, not a CSS class — it can't inherit the token
 * otherwise. The muted `accent.dark` gold used previously blended into the bg.
 */
export function getSelectionStroke(): string {
    if (typeof document === 'undefined') return '#14161C'
    const channels = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-ink')
        .trim()
    return channels ? `rgb(${channels})` : '#14161C'
}
