import { strokeToAreaFill } from './misc'
import { geometryPositions, readGeometry } from './geometry'
import type { GeometrySource } from './geometry'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any

export const AREA_FILL_TYPES = ['solid', 'hachure', 'cross-hatch'] as const
export type AreaFillType = (typeof AREA_FILL_TYPES)[number]

export const HATCH_GAP_PX = 8
export const HATCH_LINE_PX = 1.5
const HATCH_LINES_ACROSS = 20
const FALLBACK_STEP = 3
export const AREA_DEFAULT_OPACITY = 0.5

const SVG_NS = 'http://www.w3.org/2000/svg'
const DEFS_ATTR = 'data-mc-area-fills'
const PATTERN_ATTR = 'data-mc-area-fill'

export function normalizeAreaFillType(value: unknown): AreaFillType {
    return value === 'hachure' || value === 'cross-hatch' ? value : 'solid'
}

export function areaFillTypeToDb(value: unknown): AreaFillType | null {
    const type = normalizeAreaFillType(value)
    return type === 'solid' ? null : type
}

export function areaHatchStep(
    source: GeometrySource | null | undefined
): number {
    const area = Math.abs(shoelaceArea(geometryPositions(readGeometry(source))))
    if (!(area > 0) || !Number.isFinite(area)) return FALLBACK_STEP
    return Math.round(Math.log2(Math.sqrt(area) / HATCH_LINES_ACROSS))
}

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

export function areaOpacityOf(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any
): number {
    if (typeof record?.opacity === 'number') return clampAlpha(record.opacity)
    const legacy = record?.metadata?.properties?.opacity
    if (typeof legacy === 'number') return clampAlpha(legacy)
    return AREA_DEFAULT_OPACITY
}

function clampAlpha(value: number): number {
    if (!Number.isFinite(value)) return AREA_DEFAULT_OPACITY
    return Math.round(Math.min(Math.max(value, 0), 1) * 100) / 100
}

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

export function areaFillPatternTransform(step: number): string {
    return `scale(${2 ** step / HATCH_GAP_PX}) rotate(45)`
}

export function areaHatchColor(
    stroke: string,
    alpha: number = AREA_DEFAULT_OPACITY
): string {
    return strokeToAreaFill(stroke, alpha)
}

export function areaFillTilePath(type: Exclude<AreaFillType, 'solid'>): string {
    const g = HATCH_GAP_PX
    const vertical = `M ${g / 2} 0 V ${g}`
    return type === 'cross-hatch' ? `${vertical} M 0 ${g / 2} H ${g}` : vertical
}

function ensureDefs(svg: SVGSVGElement): SVGDefsElement {
    const existing = svg.querySelector<SVGDefsElement>(
        `:scope > defs[${DEFS_ATTR}]`
    )
    if (existing) return existing
    const defs = document.createElementNS(SVG_NS, 'defs')
    defs.setAttribute(DEFS_ATTR, '')
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
    line.setAttribute('stroke-linecap', 'square')
    pattern.appendChild(line)

    ensureDefs(svg).appendChild(pattern)
    scheduleSweep(svg)
    return id
}

const SWEEP_DELAY_MS = 2000
let sweepTimer: ReturnType<typeof setTimeout> | null = null

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

export function areaFillFor(
    two: TwoLike,
    stroke: string | null | undefined,
    fillType: unknown,
    record: (GeometrySource & { opacity?: number | null }) | null | undefined
): string {
    const type = normalizeAreaFillType(fillType)
    const colour = stroke || '#A32D2D'
    const alpha = areaOpacityOf(record)
    if (type === 'solid') return strokeToAreaFill(colour, alpha)
    const id = ensurePattern(two, type, colour, areaHatchStep(record), alpha)
    return id ? `url(#${id})` : strokeToAreaFill(colour, alpha)
}

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
