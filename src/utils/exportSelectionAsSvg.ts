import {
    SVG_NS,
    embedFonts,
    prepareImagesForExport,
    stripSelectionChrome,
} from './svgExportShared'
import { copyAreaFillPatterns } from './areaFill'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GroupLike = any

export async function exportSelectionAsSvg(group: GroupLike): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gEl: SVGGElement | undefined = (group as any)?._renderer?.elem
    if (!gEl) throw new Error('No rendered SVG node found for the selection')

    const clone = gEl.cloneNode(true) as SVGGElement

    stripSelectionChrome(clone)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((group as any)?.elementData?.isGroupSelector) {
        const keepIds = new Set<string>(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((group as any).children || [])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((c: any) => c?.elementData?.id)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((c: any) => c?._renderer?.elem?.id)
                .filter((id: unknown): id is string => typeof id === 'string')
        )
        Array.from(clone.children).forEach((node) => {
            if (!keepIds.has(node.id)) node.remove()
        })
    }

    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('xmlns', SVG_NS)
    const wrapper = document.createElementNS(SVG_NS, 'g')
    wrapper.appendChild(clone)
    svg.appendChild(wrapper)
    copyAreaFillPatterns(clone, svg)

    svg.setAttribute(
        'style',
        'position:fixed;left:-99999px;top:-99999px;opacity:0;pointer-events:none'
    )
    document.body.appendChild(svg)

    try {
        const bb = wrapper.getBBox()
        if (bb.width === 0 || bb.height === 0) {
            throw new Error('Selection has zero size; nothing to export')
        }

        svg.setAttribute('width', String(bb.width))
        svg.setAttribute('height', String(bb.height))
        svg.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${bb.height}`)

        await prepareImagesForExport(svg)
        await embedFonts(svg)

        svg.removeAttribute('style')
        const svgString = new XMLSerializer().serializeToString(svg)
        downloadSvg(svgString)
    } finally {
        if (svg.parentNode) svg.parentNode.removeChild(svg)
    }
}

function downloadSvg(svgString: string): void {
    const blob = new Blob([svgString], {
        type: 'image/svg+xml;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mapcursor-selection-${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
