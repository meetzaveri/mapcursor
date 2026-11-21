import { DEFAULT_TEXT_FONT_FAMILY } from '../constants/misc'
import { blobToDataUrl } from './assetStore'
import avenirUrl from '../assets/fonts/AvenirLTProBook.otf'
import frutigerUrl from '../assets/fonts/Frutiger.woff'

const SELF_HOSTED_FONT_FILES: Record<string, string> = {
    Avenir: avenirUrl,
    Frutiger: frutigerUrl,
}

function fontFormatFor(url: string): string {
    if (url.endsWith('.woff2')) return 'woff2'
    if (url.endsWith('.woff')) return 'woff'
    if (url.endsWith('.ttf')) return 'truetype'
    return 'opentype'
}

async function selfHostedFontCss(family: string): Promise<string | null> {
    const url = SELF_HOSTED_FONT_FILES[family]
    if (!url) return null
    const dataUri = await fetchAsDataUri(url)
    if (!dataUri) return null
    return (
        `@font-face{font-family:'${family}';` +
        `src:url(${dataUri}) format('${fontFormatFor(url)}');` +
        `font-weight:400;font-style:normal;}`
    )
}

export const SVG_NS = 'http://www.w3.org/2000/svg'

export const SELECTION_CHROME_ATTR = 'data-mc-selection-chrome'

export const IMAGE_PENDING_ATTR = 'data-mc-image-pending'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function markSelectionChrome(twoObject: any): void {
    const el: Element | undefined = twoObject?._renderer?.elem
    if (el) el.setAttribute(SELECTION_CHROME_ATTR, '1')
}

export function stripSelectionChrome(root: Element): void {
    root.querySelectorAll(`[${SELECTION_CHROME_ATTR}]`).forEach((n) =>
        n.remove()
    )
}

export async function prepareImagesForExport(root: Element): Promise<void> {
    root.querySelectorAll(`[${IMAGE_PENDING_ATTR}]`).forEach((n) => n.remove())
    const nodes = Array.from(root.querySelectorAll('image'))
    await Promise.all(
        nodes.map(async (node) => {
            const href = node.getAttribute('href')
            if (!href?.startsWith('blob:')) return
            try {
                const blob = await (await fetch(href)).blob()
                node.setAttribute('href', await blobToDataUrl(blob))
            } catch {}
        })
    )
}

function collectUsedFamilies(svg: SVGSVGElement): string[] {
    const families = new Set<string>([DEFAULT_TEXT_FONT_FAMILY])
    svg.querySelectorAll('text').forEach((text) => {
        const raw =
            text.getAttribute('font-family') || text.style.fontFamily || ''
        const primary = raw
            .split(',')[0]
            ?.trim()
            .replace(/^["']|["']$/g, '')
        if (primary) families.add(primary)
    })
    return [...families]
}

async function fetchInlinedFontCss(family: string): Promise<string | null> {
    try {
        const selfHosted = await selfHostedFontCss(family)
        if (selfHosted) return selfHosted

        const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
            family
        )}:wght@400&display=swap`
        const cssResp = await fetch(cssUrl)
        if (!cssResp.ok) return null
        let css = await cssResp.text()

        const urls = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(
            (m) => m[1] as string
        )
        const uniqueUrls = [...new Set(urls)]
        await Promise.all(
            uniqueUrls.map(async (url) => {
                const dataUri = await fetchAsDataUri(url)
                if (dataUri) css = css.split(url).join(dataUri)
            })
        )
        return css
    } catch {
        return null
    }
}

export async function embedFonts(svg: SVGSVGElement): Promise<void> {
    try {
        const families = collectUsedFamilies(svg)
        const cssChunks = await Promise.all(families.map(fetchInlinedFontCss))
        const css = cssChunks.filter((c): c is string => c !== null).join('\n')
        if (!css) return

        const style = document.createElementNS(SVG_NS, 'style')
        style.textContent = css
        svg.insertBefore(style, svg.firstChild)
    } catch (err) {
        console.warn('Font embedding failed; exporting with fallback font', err)
    }
}

export async function fetchAsDataUri(url: string): Promise<string | null> {
    try {
        const resp = await fetch(url)
        if (!resp.ok) return null
        const buf = await resp.arrayBuffer()
        const mime = resp.headers.get('content-type') || 'font/woff2'
        let binary = ''
        const bytes = new Uint8Array(buf)
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i] as number)
        }
        return `data:${mime};base64,${btoa(binary)}`
    } catch {
        return null
    }
}
