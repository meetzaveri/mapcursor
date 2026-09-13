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

// Dot radius in screen px. Touch needs a bigger target than a mouse: the
// ObjectSelector and the vertex handles hit-test the SVG dot itself, so the dot
// IS the target. At the mouse value these measured ~5px across on a zoomed-out
// map base, which is unhittable with a finger.
const SELECTION_HANDLE_RADIUS_PX_MOUSE = 5
const SELECTION_HANDLE_RADIUS_PX_TOUCH = 11

/** Grab-dot radius in screen px for the pointer currently in use. */
export function selectionHandleRadiusPx(): number {
    const coarse =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(pointer: coarse)')?.matches
    return coarse
        ? SELECTION_HANDLE_RADIUS_PX_TOUCH
        : SELECTION_HANDLE_RADIUS_PX_MOUSE
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
