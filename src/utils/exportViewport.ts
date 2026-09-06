// Export the current canvas viewport as a PNG.
//
// Two.js runs the SVG renderer in fullscreen mode (see src/newCanvas.tsx), so
// the live <svg> element IS the viewport: any scene content panned/zoomed
// outside the window sits outside the SVG's 0..W / 0..H box and is clipped for
// free when we rasterize at viewport size. We therefore never touch the live
// scene — we clone the SVG, re-create its background (the map raster, or the
// canvas's own fill when that is unavailable
// all carry over), embed the web font(s) used on canvas (the rasterizer has no
// access to document fonts), stamp a screen-space watermark, then draw the SVG
// onto a <canvas> and download it as PNG.

import { SVG_NS, embedFonts, stripSelectionChrome } from './svgExportShared'
import { DEFAULT_TEXT_FONT_FAMILY } from '../constants/misc'

// Light-theme fallbacks, used only if the live computed style can't be read.
const CANVAS_BG_FALLBACK = '#f5f0e8' // --color-canvas (App.css)
const WATERMARK_TEXT = 'Made with mapcursor.com'
const MAX_DPR = 2 // cap device-pixel scaling to bound output file size

/**
 * Rasterizes the active base's backdrop to a data URL sized to the viewport.
 * Supplied by the base provider (see src/bases); `null` means "nothing to
 * draw", which sends the export down its solid-fill path.
 */
export type BackdropCapture = (
    width: number,
    height: number
) => Promise<string | null>

/**
 * Download the currently-visible viewport as a PNG. Resolves once the download
 * has been triggered; rejects if the SVG can't be found or rasterization fails.
 * Font embedding failures are non-fatal (image still produced, text may fall
 * back to a system font).
 */
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

    // Don't bake the on-screen selection box/handles into the exported image.
    stripSelectionChrome(clone)

    // A base that paints its own backdrop (the map) hands back a raster of the
    // live view; anything else returns null and we fall through to painting the
    // the solid fill. Capture failures are non-fatal — a missing
    // backdrop is better than a failed export.
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

/**
 * Re-create the canvas background as SVG content.
 *
 * The map backdrop is a raster captured from MapLibre; when it is missing
 * (capture failed, or the map hasn't mounted) we fall back to the canvas's own
 * resolved background colour so the export is never transparent.
 */
function injectBackground(
    cloneSvg: SVGSVGElement,
    liveSvg: SVGSVGElement,
    width: number,
    height: number,
    backdrop: string | null
): void {
    // The backdrop raster already *is* the background — painting a fill under
    // it would only show through wherever the raster has alpha.
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

/** Bottom-right, screen-space watermark (fixed regardless of zoom/pan). */
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
    text.setAttribute('fill', '#8C7E6A')
    text.setAttribute('fill-opacity', '0.8')
    text.textContent = WATERMARK_TEXT
    // Last child → drawn on top of everything.
    svg.appendChild(text)
}

/** Draw the serialized SVG onto a HiDPI canvas and trigger a PNG download. */
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
