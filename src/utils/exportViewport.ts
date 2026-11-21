import {
    SVG_NS,
    embedFonts,
    prepareImagesForExport,
    stripSelectionChrome,
} from './svgExportShared'
import { DEFAULT_TEXT_FONT_FAMILY } from '../constants/misc'

const CANVAS_BG_FALLBACK = '#fafafc'
const WATERMARK_TEXT = 'Made with mapcursor.com'
const MAX_DPR = 2

export type BackdropCapture = (
    width: number,
    height: number
) => Promise<string | null>

export async function downloadViewportAsImage(
    captureBackdrop?: BackdropCapture
): Promise<void> {
    const svg = document.querySelector<SVGSVGElement>('#main-two-root svg')
    if (!svg) throw new Error('Canvas SVG element not found')

    const rect = svg.getBoundingClientRect()
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)
    if (width === 0 || height === 0) {
        throw new Error('Canvas has zero size; nothing to export')
    }

    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', SVG_NS)
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`)

    stripSelectionChrome(clone)
    await prepareImagesForExport(clone)

    let backdrop: string | null = null
    if (captureBackdrop) {
        try {
            backdrop = await captureBackdrop(width, height)
        } catch (err) {
            console.error('Backdrop capture failed; exporting without it', err)
        }
    }

    injectBackground(clone, svg, width, height, backdrop)
    await embedFonts(clone)
    appendWatermark(clone, width, height)

    const svgString = new XMLSerializer().serializeToString(clone)
    await rasterizeAndDownload(svgString, width, height)
}

function injectBackground(
    cloneSvg: SVGSVGElement,
    liveSvg: SVGSVGElement,
    width: number,
    height: number,
    backdrop: string | null
): void {
    if (backdrop) {
        const image = document.createElementNS(SVG_NS, 'image')
        image.setAttribute('x', '0')
        image.setAttribute('y', '0')
        image.setAttribute('width', String(width))
        image.setAttribute('height', String(height))
        image.setAttribute('preserveAspectRatio', 'none')
        image.setAttribute('href', backdrop)
        cloneSvg.insertBefore(image, cloneSvg.firstChild)
        return
    }

    const cs = getComputedStyle(liveSvg)
    const solid = document.createElementNS(SVG_NS, 'rect')
    solid.setAttribute('x', '0')
    solid.setAttribute('y', '0')
    solid.setAttribute('width', String(width))
    solid.setAttribute('height', String(height))
    solid.setAttribute('fill', cs.backgroundColor || CANVAS_BG_FALLBACK)
    cloneSvg.insertBefore(solid, cloneSvg.firstChild)
}

function appendWatermark(
    svg: SVGSVGElement,
    width: number,
    height: number
): void {
    const text = document.createElementNS(SVG_NS, 'text')
    text.setAttribute('x', String(width - 16))
    text.setAttribute('y', String(height - 14))
    text.setAttribute('text-anchor', 'end')
    text.setAttribute('font-family', DEFAULT_TEXT_FONT_FAMILY)
    text.setAttribute('font-size', '20')
    text.setAttribute('fill', '#6B7180')
    text.setAttribute('fill-opacity', '0.8')
    text.textContent = WATERMARK_TEXT
    svg.appendChild(text)
}

function rasterizeAndDownload(
    svgString: string,
    width: number,
    height: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        const svgBlob = new Blob([svgString], {
            type: 'image/svg+xml;charset=utf-8',
        })
        const svgUrl = URL.createObjectURL(svgBlob)
        const img = new Image()

        img.onload = (): void => {
            try {
                const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(width * dpr)
                canvas.height = Math.round(height * dpr)
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    URL.revokeObjectURL(svgUrl)
                    reject(new Error('Could not get 2D canvas context'))
                    return
                }
                ctx.scale(dpr, dpr)
                ctx.drawImage(img, 0, 0, width, height)
                URL.revokeObjectURL(svgUrl)

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas export produced no data'))
                        return
                    }
                    const pngUrl = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = pngUrl
                    a.download = `mapcursor-${Date.now()}.png`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(pngUrl)
                    resolve()
                }, 'image/png')
            } catch (err) {
                URL.revokeObjectURL(svgUrl)
                reject(err instanceof Error ? err : new Error(String(err)))
            }
        }

        img.onerror = (): void => {
            URL.revokeObjectURL(svgUrl)
            reject(new Error('Failed to rasterize SVG'))
        }

        img.src = svgUrl
    })
}
