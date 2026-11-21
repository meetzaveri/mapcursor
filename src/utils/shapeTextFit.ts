import {
    lineHeightFor,
    wrapText,
    widestCharWidth,
    type FontSpec,
} from './textLayout'

const RECT_PAD_X = 24
const RECT_PAD_Y = 12
const DIAMOND_PAD_X = 12
const DIAMOND_PAD_Y = 6
const CIRCLE_PAD_X = 14
const CIRCLE_PAD_Y = 10

const DIAMOND_WIDTH_FACTOR = 0.6
const CIRCLE_WIDTH_FACTOR = 1 / Math.SQRT2

type ShapeKind = string

function pads(kind: ShapeKind): { px: number; py: number } {
    if (kind === 'diamond')
        return { px: DIAMOND_PAD_X, py: DIAMOND_PAD_Y }
    if (kind === 'circle')
        return { px: CIRCLE_PAD_X, py: CIRCLE_PAD_Y }
    return { px: RECT_PAD_X, py: RECT_PAD_Y }
}

export function usableTextWidth(kind: ShapeKind, width: number): number {
    const { px } = pads(kind)
    let inner = width
    if (kind === 'diamond') inner = width * DIAMOND_WIDTH_FACTOR
    else if (kind === 'circle')
        inner = width * CIRCLE_WIDTH_FACTOR
    return Math.max(inner - px * 2, 1)
}

export function requiredShapeHeight(
    kind: ShapeKind,
    lineCount: number,
    fontSize: number
): number {
    const { py } = pads(kind)
    const blockH = Math.max(lineCount, 1) * lineHeightFor(fontSize) + py * 2
    if (kind === 'diamond')
        return Math.ceil(blockH / DIAMOND_WIDTH_FACTOR)
    if (kind === 'circle')
        return Math.ceil(blockH / CIRCLE_WIDTH_FACTOR)
    return Math.ceil(blockH)
}

export function minShapeWidthForText(
    kind: ShapeKind,
    rawText: string,
    font: FontSpec
): number {
    const { px } = pads(kind)
    const glyph = widestCharWidth(rawText, font)
    let inner = glyph + px * 2
    if (kind === 'diamond') inner = inner / DIAMOND_WIDTH_FACTOR
    else if (kind === 'circle')
        inner = inner / CIRCLE_WIDTH_FACTOR
    return Math.ceil(inner)
}

export interface ReflowResult {
    lines: string[]
    requiredHeight: number
    usableWidth: number
}

export function reflowTextForShape(
    kind: ShapeKind,
    width: number,
    rawText: string,
    font: FontSpec
): ReflowResult {
    const usableWidth = usableTextWidth(kind, width)
    const lines = wrapText(rawText, usableWidth, font)
    const requiredHeight = requiredShapeHeight(kind, lines.length, font.size)
    return { lines, requiredHeight, usableWidth }
}

const AUTO_HEIGHT_SLACK_RATIO = 0.5

export function resolveHeightForTextStyleChange(args: {
    kind: ShapeKind
    width: number
    rawText: string
    prevFont: FontSpec
    nextFont: FontSpec
    currentHeight: number
}): number {
    const { kind, width, rawText, prevFont, nextFont, currentHeight } = args
    if (!rawText) return currentHeight

    const { requiredHeight: nextRequired } = reflowTextForShape(
        kind,
        width,
        rawText,
        nextFont
    )
    const { requiredHeight: prevRequired } = reflowTextForShape(
        kind,
        width,
        rawText,
        prevFont
    )
    const slack = lineHeightFor(prevFont.size) * AUTO_HEIGHT_SLACK_RATIO
    const wasAutoFitted = currentHeight <= prevRequired + slack

    return wasAutoFitted ? nextRequired : Math.max(currentHeight, nextRequired)
}

export function growShapeToFitText(
    kind: ShapeKind,
    currentW: number,
    currentH: number,
    textW: number,
    textH: number
): { w: number; h: number } {
    const { px, py } = pads(kind)
    const TW = textW + px * 2
    const TH = textH + py * 2
    if (kind === 'diamond') {
        return {
            w: Math.max(currentW, Math.ceil(TW / DIAMOND_WIDTH_FACTOR)),
            h: Math.max(currentH, Math.ceil(TH / DIAMOND_WIDTH_FACTOR)),
        }
    }
    if (kind === 'circle') {
        return {
            w: Math.max(currentW, Math.ceil(TW / CIRCLE_WIDTH_FACTOR)),
            h: Math.max(currentH, Math.ceil(TH / CIRCLE_WIDTH_FACTOR)),
        }
    }
    return {
        w: Math.max(currentW, Math.ceil(TW)),
        h: Math.max(currentH, Math.ceil(TH)),
    }
}
