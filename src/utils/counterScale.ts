// Counter-scale (zoom-resistance) for canvas elements that should stay legible
// as the world zooms out — most notably geo "point" pins.
//
// pinScale = 1 / (zuiScale ^ resist)
//
// The counter-scaled group is a child of the ZUI-scaled scene, so the two
// multiply and what you actually see on screen is:
//
//   apparentSize ∝ zuiScale * pinScale = zuiScale ^ (1 - resist)
//
//   resist = 0   → apparent ∝ scale^1   — scales exactly with the world
//   resist = 0.5 → apparent ∝ scale^0.5 — shrinks much slower than the world
//   resist = 1   → apparent ∝ scale^0   — fully fixed on screen (ignores zoom)
//
// Measured at the ZUI's 0.06 zoom floor: a resist=0 pin renders at 6% of
// nominal, a resist=1 pin at 100%, and the default resist=0.9 at
// scale^0.1 ≈ 75%.
//
// Reference: the standalone prototype in point_two.js.

import { DEFAULT_RESIST, TEXT_RESIST } from '../constants/misc'
import { CIRCLE_LABEL_FLAG } from '../factory/circleLabel'
import { readProperties } from './geometry'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export function computeCounterScale(
    zuiScale: number,
    resist: number = DEFAULT_RESIST
): number {
    if (!Number.isFinite(zuiScale) || zuiScale <= 0) return 1
    return 1 / Math.pow(zuiScale, resist)
}

/**
 * The two ways an element resists zoom. A point counter-scales its whole group
 * (circle and label together); an area/route counter-scales only its stroke
 * width, because scaling their geometry would peel the outline off the map.
 * Don't unify them.
 *
 * text counter-scales its whole group too: it is a caption, and at resist 0
 * it rendered at 0.3px over a county (see TEXT_RESIST). It keeps its own
 * resist constant because the two are tuned for different jobs — a pin is
 * chrome, a caption is content.
 */
const GROUP_SCALED_TYPES: ReadonlySet<string> = new Set(['point', 'text'])
const STROKE_SCALED_TYPES: ReadonlySet<string> = new Set(['area', 'route'])

/** The default resist for a type, when the record carries no `metadata.resist`. */
function defaultResistFor(type: string): number {
    return type === 'text' ? TEXT_RESIST : DEFAULT_RESIST
}

/**
 * The resist exponent for an element's own body — a point's pin, a text's
 * group, an area/route/pencil's STROKE.
 *
 * `properties.resist` is the numeric strength knob and the sole mechanism for
 * point / area / route / pencil. It is reachable on ALL of them now — under the
 * old polymorphic metadata a route's was a bare vertex array, so `.resist` was
 * always `undefined` there and area/route/pencil silently ran on the default no
 * matter what was stored. The `zoomResistant` column is read here for **text
 * only**, because for text the body and the label are the same thing. A circle
 * has no body to resist with — it is borderless and its geometry is the data,
 * so only its label counter-scales; that is `resolveLabelResist` below.
 */
export function resolveResist(item: ShapeLike): number {
    const type = item?.componentType
    if (type === 'text' && item?.zoomResistant === false) return 0
    const resist = readProperties(item).resist
    return typeof resist === 'number' ? resist : defaultResistFor(type)
}

/**
 * The resist exponent for a LABEL — the user-facing "Zoom resistant" switch.
 *
 * The single place the `zoomResistant` column is read for a circle, so a live
 * element and the detached copy in a group overlay can never disagree. `false`
 * means "scale with the map" (resist 0); absent/null/true means zoom-resistant
 * at TEXT_RESIST, which is the right constant here because a circle's label is
 * a caption over geography, exactly the job TEXT_RESIST was tuned for.
 */
export function resolveLabelResist(item: ShapeLike): number {
    return item?.zoomResistant === false ? 0 : TEXT_RESIST
}

/**
 * Which types counter-scale their STROKE only, keeping their geometry
 * world-scaled: area, route and pencil.
 *
 * Each of those marks real ground with its path, so the geometry has to stay
 * world-scaled; only the outline is held near-constant, or it becomes a thick
 * band at z18 and disappears at z4.
 *
 * A circle is NOT in this set: it is borderless (see CIRCLE_DEFAULTS), so there
 * is no stroke to hold steady — its disc is the data and its label resists on
 * its own, via resolveLabelResist.
 *
 * This used to be split — pencil was offered on the whiteboard too, so
 * `objectClass` decided per record whether a given one was drawn on a map. With
 * the map the only substrate, every pencil is a map mark.
 */
export function isStrokeScaled(item: ShapeLike): boolean {
    const type = item?.componentType
    if (STROKE_SCALED_TYPES.has(type)) return true
    return type === 'pencil'
}

/**
 * Apply zoom-resistance to a *detached copy* of an element — the member copies
 * a group overlay builds straight from the factories (groupobject.tsx).
 *
 * Those copies have no element component behind them, so nothing else
 * counter-scales them: without this a grouped pin renders at world size for as
 * long as the selection lasts (a speck when zoomed out), then jumps back to
 * full size the moment the group dissolves.
 *
 * Mirrors exactly what the live components do on mount and on every
 * `zoomChanged` — see point.tsx (whole group) and area.tsx / route.tsx (stroke
 * width only). Resist comes from resolveResist, so a text copy honours the
 * `zoomResistant` column too. `metadata` is a vertex array for area/route, so
 * `.resist` is undefined there and falls through to the default, same as in
 * those components.
 */
export function applyCounterScaleToCopy(
    copy: ShapeLike,
    item: ShapeLike,
    zuiScale: number | undefined
): void {
    if (!copy || !zuiScale) return
    const type = item?.componentType
    // A circle comes through here with nothing to stroke-scale: it is
    // borderless, but its LABEL still rides its own resist, and a grouped copy
    // has no element component to do that for it.
    const isCircle = type === 'circle'
    if (!GROUP_SCALED_TYPES.has(type) && !isStrokeScaled(item) && !isCircle) {
        return
    }

    const factor = computeCounterScale(zuiScale, resolveResist(item))

    if (GROUP_SCALED_TYPES.has(type)) {
        copy.scale = factor
        return
    }

    const base = item?.linewidth ?? 2
    const labelFactor = computeCounterScale(zuiScale, resolveLabelResist(item))
    copy.children?.forEach((child: ShapeLike) => {
        // A circle's label is a sub-group, not a stroke — it scales as a whole
        // and at its OWN resist. Without this branch it would fall into the
        // stroke arm below (a Two.Text has a numeric `linewidth`), so a grouped
        // circle's name would be mis-styled and would stay world-sized for as
        // long as the selection lasted.
        if (child?.[CIRCLE_LABEL_FLAG]) {
            child.scale = labelFactor
            return
        }
        // The circle's own ellipse: nothing to do, and writing a width onto it
        // would hand a borderless mark a ring for the length of a selection.
        if (isCircle) return
        if (typeof child?.linewidth === 'number') {
            child.linewidth = base * factor
        }
    })
}

/**
 * Re-apply zoom-resistance to every member copy inside a group overlay. Cheap
 * enough to run on every camera change: it only touches the geo types and skips
 * the overlay's own selector rectangle (no `elementData`).
 */
export function applyCounterScaleToCopies(
    group: ShapeLike,
    zuiScale: number | undefined
): void {
    group?.children?.forEach((child: ShapeLike) => {
        if (child?.elementData) {
            applyCounterScaleToCopy(child, child.elementData, zuiScale)
        }
    })
}
