// How an area's interior is painted: a flat wash, one-way hatching, or a
// cross-hatch.
//
// Solid stays what it always was: a plain rgba fill derived from the stroke
// (`strokeToAreaFill`). The two hatched kinds are SVG `<pattern>` tiles that
// the path references by `fill="url(#…)"`. Two.js passes a string fill straight
// through to the attribute, so the path itself does not change.
//
// A hatch is PART OF THE DRAWING, like the polygon it fills: it is sized in
// surface units and scales with the map, so zooming in spreads the lines apart
// and zooming out packs them together, exactly as the area itself grows and
// shrinks. (It is deliberately NOT held constant on screen the way the outline
// and the dashes are: a hatch that kept its on-screen spacing while the area
// around it scaled read as the pattern sliding about under the shape.)
//
// That leaves the question of how far apart the lines are in surface units.
// One fixed size cannot serve a whole map: surface units span the map's zoom
// range, so a spacing that suits a city block is either sub-pixel on a district
// or one stripe across a building. So each area takes its spacing from its OWN
// size — roughly `HATCH_LINES_ACROSS` lines across the square root of its
// area — and every area reads as hatched, at the zoom you would look at it.
// The square root of the polygon's area, not its bounding box, so a long thin
// corridor is hatched across its width rather than its length.
//
// That spacing is rounded to a power of two. Reshaping an area slightly does
// not change it, and areas of similar size share one tile: patterns are keyed
// by (kind, colour, size step), not one per area.
//
// OPACITY is the fill's alone. An area's opacity control dims its interior —
// the wash, or the hatch lines — and never its border, which always paints at
// full strength so the shape stays legible however faint its fill. So the value
// is folded into the fill colour's alpha here rather than set on the path or
// its group (either of which would dim the outline with it). At 100% the fill
// is fully opaque and hides what is under it; an area with no opacity of its
// own reads as `AREA_DEFAULT_OPACITY`, the half-strength wash every area was
// drawn with before the control meant this. Hatch tiles therefore also differ
// by alpha, and a slider drag mints one per value: a debounced sweep removes
// the ones no area references any more.
//
// The patterns live in a `<defs>` of OUR OWN, not in `two.renderer.defs`.
// Two.js garbage-collects its defs: on a render it removes every child that no
// `fill`/`stroke`/`clip-path` attribute references yet. A pattern made just
// before the path that uses it is first rendered could be swept away.

import { strokeToAreaFill } from './misc'
import { geometryPositions, readGeometry } from './geometry'
import type { GeometrySource } from './geometry'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any

export const AREA_FILL_TYPES = ['solid', 'hachure', 'cross-hatch'] as const
export type AreaFillType = (typeof AREA_FILL_TYPES)[number]

/**
 * The tile's own size: the gap between lines, in tile units. A pattern scales
 * the whole tile to the area's spacing, so this only fixes the PROPORTIONS
 * (line width to gap); the swatches draw the same tile at a fixed scale.
 */
export const HATCH_GAP_PX = 8
/** Width of a hatch line, in tile units: 3/16 of the gap. */
export const HATCH_LINE_PX = 1.5
/** About how many lines run across an area, measured on √(its area). */
const HATCH_LINES_ACROSS = 20
/** The spacing step for an area with no usable size: a gap of 2^3 = 8. */
const FALLBACK_STEP = 3
/**
 * An area's fill opacity when it has none of its own: the half-strength wash
 * every area was drawn with before opacity applied to the fill alone, so
 * existing areas look exactly as they did.
 */
export const AREA_DEFAULT_OPACITY = 0.5

const SVG_NS = 'http://www.w3.org/2000/svg'
const DEFS_ATTR = 'data-mc-area-fills'
const PATTERN_ATTR = 'data-mc-area-fill'

/**
 * Read a stored `fillType` (the column, or a legend style). `null`, absent and
 * anything unrecognised all mean solid, so every area drawn before fill types
 * existed keeps rendering exactly as it did.
 */
export function normalizeAreaFillType(value: unknown): AreaFillType {
    return value === 'hachure' || value === 'cross-hatch' ? value : 'solid'
}

/**
 * The value to persist. Solid is stored as `null`, the way `strokeType` stores
 * solid, so the column only carries a value when it differs from the default.
 */
export function areaFillTypeToDb(value: unknown): AreaFillType | null {
    const type = normalizeAreaFillType(value)
    return type === 'solid' ? null : type
}

/**
 * The area's hatch spacing, as a power-of-two step: the gap between lines is
 * `2 ** step` surface units. Negative steps are real (a small area drawn
 * zoomed far out has sub-unit spacing).
 */
export function areaHatchStep(
    source: GeometrySource | null | undefined
): number {
    const area = Math.abs(shoelaceArea(geometryPositions(readGeometry(source))))
    if (!(area > 0) || !Number.isFinite(area)) return FALLBACK_STEP
    return Math.round(Math.log2(Math.sqrt(area) / HATCH_LINES_ACROSS))
}

/** Signed area of an open ring, in surface units squared. */
function shoelaceArea(ring: readonly (readonly number[])[]): number {
    let sum = 0
    for (let i = 0; i < ring.length; i++) {
        const a = ring[i]
        const b = ring[(i + 1) % ring.length]
        if (!a || !b) continue
        sum += (a[0] ?? 0) * (b[1] ?? 0) - (b[0] ?? 0) * (a[1] ?? 0)
    }
    return sum / 2
}

/**
 * An area's fill opacity, 0–1: its `opacity` column, else the legacy
 * `metadata.properties.opacity`, else `AREA_DEFAULT_OPACITY`. `readOpacity`
 * (canvasUtils) answers with this for an area, so the toolbar, undo and paste
 * all see the same value.
 */
export function areaOpacityOf(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any
): number {
    if (typeof record?.opacity === 'number') return clampAlpha(record.opacity)
    const legacy = record?.metadata?.properties?.opacity
    if (typeof legacy === 'number') return clampAlpha(legacy)
    return AREA_DEFAULT_OPACITY
}

/** In 0–1 and to the whole percent, so a drag can't mint endless tiles. */
function clampAlpha(value: number): number {
    if (!Number.isFinite(value)) return AREA_DEFAULT_OPACITY
    return Math.round(Math.min(Math.max(value, 0), 1) * 100) / 100
}

/**
 * A stable, id-safe pattern id for a kind, a colour, a spacing step and an
 * opacity.
 */
export function areaFillPatternId(
    type: Exclude<AreaFillType, 'solid'>,
    stroke: string,
    step: number,
    alpha: number
): string {
    const colour = stroke
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    const percent = Math.round(alpha * 100)
    return `mc-area-fill-${type}-${colour || 'default'}-s${step}-a${percent}`
}

/**
 * The tile's transform for a spacing step: scale the tile so its gap is
 * `2 ** step` surface units, then turn it so its vertical line runs
 * bottom-left to top-right ("/"). Fixed per pattern: nothing rewrites it on
 * zoom, which is what lets the hatch scale with the map.
 */
export function areaFillPatternTransform(step: number): string {
    return `scale(${2 ** step / HATCH_GAP_PX}) rotate(45)`
}

/** The colour a hatch line is drawn in, for a given stroke. */
export function areaHatchColor(
    stroke: string,
    alpha: number = AREA_DEFAULT_OPACITY
): string {
    return strokeToAreaFill(stroke, alpha)
}

/** The tile's line(s), in tile units. Also drawn by the toolbar swatches. */
export function areaFillTilePath(type: Exclude<AreaFillType, 'solid'>): string {
    const g = HATCH_GAP_PX
    const vertical = `M ${g / 2} 0 V ${g}`
    // Rotated with the tile, the horizontal line becomes the other diagonal.
    return type === 'cross-hatch' ? `${vertical} M 0 ${g / 2} H ${g}` : vertical
}

function ensureDefs(svg: SVGSVGElement): SVGDefsElement {
    const existing = svg.querySelector<SVGDefsElement>(
        `:scope > defs[${DEFS_ATTR}]`
    )
    if (existing) return existing
    const defs = document.createElementNS(SVG_NS, 'defs')
    defs.setAttribute(DEFS_ATTR, '')
    // First, so it sits behind everything; defs paint nothing anyway.
    svg.insertBefore(defs, svg.firstChild)
    return defs
}

function ensurePattern(
    two: TwoLike,
    type: Exclude<AreaFillType, 'solid'>,
    stroke: string,
    step: number,
    alpha: number
): string | null {
    const svg: SVGSVGElement | undefined = two?.renderer?.domElement
    if (!svg || typeof document === 'undefined') return null
    const id = areaFillPatternId(type, stroke, step, alpha)
    if (svg.querySelector(`#${CSS.escape(id)}`)) return id

    const pattern = document.createElementNS(SVG_NS, 'pattern')
    pattern.setAttribute('id', id)
    pattern.setAttribute(PATTERN_ATTR, type)
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    pattern.setAttribute('width', String(HATCH_GAP_PX))
    pattern.setAttribute('height', String(HATCH_GAP_PX))
    pattern.setAttribute('patternTransform', areaFillPatternTransform(step))

    const line = document.createElementNS(SVG_NS, 'path')
    line.setAttribute('d', areaFillTilePath(type))
    line.setAttribute('fill', 'none')
    line.setAttribute('stroke', areaHatchColor(stroke, alpha))
    line.setAttribute('stroke-width', String(HATCH_LINE_PX))
    // Square caps close the seam where a line meets its copy in the next tile.
    line.setAttribute('stroke-linecap', 'square')
    pattern.appendChild(line)

    ensureDefs(svg).appendChild(pattern)
    scheduleSweep(svg)
    return id
}

/** How long after the last new tile to look for unused ones. */
const SWEEP_DELAY_MS = 2000
let sweepTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Remove our tiles that no fill references any more: the per-value tiles an
 * opacity drag leaves behind, and tiles for a colour or size no area uses now.
 *
 * Debounced well past a render, so a tile made for a path that has not been
 * painted yet is referenced by the time this runs. A tile swept that is wanted
 * again later is simply made again by `ensurePattern`.
 */
function scheduleSweep(svg: SVGSVGElement): void {
    if (sweepTimer !== null) clearTimeout(sweepTimer)
    sweepTimer = setTimeout(() => {
        sweepTimer = null
        const defs = svg.querySelector(`:scope > defs[${DEFS_ATTR}]`)
        defs?.querySelectorAll('pattern').forEach((pattern) => {
            const used = svg.querySelector(`[fill="url(#${pattern.id})"]`)
            if (!used) pattern.remove()
        })
    }, SWEEP_DELAY_MS)
}

/**
 * The `fill` to put on an area's path. The one place an area's fill is
 * derived: every path that repaints an area (the factory, a stroke or fill-type
 * edit, undo, a legend preset) goes through here, or a colour change would
 * flatten a hatch back to solid.
 */
export function areaFillFor(
    two: TwoLike,
    stroke: string | null | undefined,
    fillType: unknown,
    /**
     * The area's record: its `metadata` sizes a hatch, its `opacity` is the
     * fill's alpha (see `areaOpacityOf`).
     */
    record: (GeometrySource & { opacity?: number | null }) | null | undefined
): string {
    const type = normalizeAreaFillType(fillType)
    const colour = stroke || '#A32D2D'
    const alpha = areaOpacityOf(record)
    if (type === 'solid') return strokeToAreaFill(colour, alpha)
    const id = ensurePattern(two, type, colour, areaHatchStep(record), alpha)
    // No renderer to hang a pattern on (tests, a detached build): degrade to
    // the wash rather than an invisible interior.
    return id ? `url(#${id})` : strokeToAreaFill(colour, alpha)
}

/**
 * Copy the area-fill patterns `root` references into `targetSvg`, for an export
 * that lifts nodes out of the live canvas and would otherwise lose them.
 */
export function copyAreaFillPatterns(
    root: Element,
    targetSvg: SVGSVGElement
): void {
    const ids = new Set<string>()
    root.querySelectorAll('[fill^="url(#mc-area-fill-"]').forEach((el) => {
        const match = /^url\(#([^)]+)\)$/.exec(el.getAttribute('fill') ?? '')
        if (match?.[1]) ids.add(match[1])
    })
    if (ids.size === 0) return
    const defs = document.createElementNS(SVG_NS, 'defs')
    ids.forEach((id) => {
        const source = document.getElementById(id)
        if (source) defs.appendChild(source.cloneNode(true))
    })
    targetSvg.insertBefore(defs, targetSvg.firstChild)
}
