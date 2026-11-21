import {
    LINE_HEIGHT_MULTIPLIER,
    DEFAULT_TEXT_FONT_FAMILY,
} from '../constants/misc'

export interface FontSpec {
    family: string
    size: number
    weight?: string | number
}

export function buildCssFont({ family, size, weight }: FontSpec): string {
    return `${weight ?? 'normal'} ${size}px ${family || DEFAULT_TEXT_FONT_FAMILY}`
}

export function lineHeightFor(fontSize: number): number {
    return Math.ceil(fontSize * LINE_HEIGHT_MULTIPLIER)
}

let measureCtx: CanvasRenderingContext2D | null = null

function getMeasureCtx(): CanvasRenderingContext2D | null {
    if (measureCtx) return measureCtx
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    measureCtx = canvas.getContext('2d')
    return measureCtx
}

export function measureTextWidth(str: string, font: FontSpec): number {
    const ctx = getMeasureCtx()
    if (!ctx) return str.length * font.size * 0.6
    ctx.font = buildCssFont(font)
    return ctx.measureText(str).width
}

function charWrap(
    word: string,
    maxWidth: number,
    font: FontSpec
): string[] {
    const chunks: string[] = []
    let cur = ''
    for (const ch of word) {
        const cand = cur + ch
        if (cur === '' || measureTextWidth(cand, font) <= maxWidth) {
            cur = cand
        } else {
            chunks.push(cur)
            cur = ch
        }
    }
    if (cur !== '') chunks.push(cur)
    return chunks
}

export function wrapText(
    raw: string,
    maxWidthPx: number | null,
    font: FontSpec
): string[] {
    const paragraphs = (raw ?? '').split('\n')

    if (maxWidthPx == null || maxWidthPx <= 0) {
        return paragraphs.length > 0 ? paragraphs : ['']
    }

    const lines: string[] = []
    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ')
        let current = ''
        for (const word of words) {
            const candidate = current === '' ? word : `${current} ${word}`
            if (current === '') {
                if (measureTextWidth(word, font) > maxWidthPx) {
                    const chunks = charWrap(word, maxWidthPx, font)
                    for (let i = 0; i < chunks.length - 1; i++) {
                        lines.push(chunks[i] as string)
                    }
                    current = chunks[chunks.length - 1] ?? ''
                } else {
                    current = candidate
                }
            } else if (measureTextWidth(candidate, font) <= maxWidthPx) {
                current = candidate
            } else {
                lines.push(current)
                if (measureTextWidth(word, font) > maxWidthPx) {
                    const chunks = charWrap(word, maxWidthPx, font)
                    for (let i = 0; i < chunks.length - 1; i++) {
                        lines.push(chunks[i] as string)
                    }
                    current = chunks[chunks.length - 1] ?? ''
                } else {
                    current = word
                }
            }
        }
        lines.push(current)
    }
    return lines.length > 0 ? lines : ['']
}

export function widestCharWidth(raw: string, font: FontSpec): number {
    let max = 0
    for (const ch of raw ?? '') {
        if (ch === '\n' || ch === ' ') continue
        const w = measureTextWidth(ch, font)
        if (w > max) max = w
    }
    return max > 0 ? max : font.size * 0.6
}
