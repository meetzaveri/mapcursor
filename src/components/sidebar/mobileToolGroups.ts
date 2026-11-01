import type { PrimaryElement } from '../../utils/constants'

// Mobile-only grouping of primary tools. The bottom toolbar has a fixed width,
// so tools that belong together share one button there and switch through a
// secondary toolbar (see mobileDrawToolbar). Desktop keeps them as flat buttons.

export const DRAW_GROUP = {
    elementName: 'draw',
    elementDisplayName: 'Draw',
    /** Pencil first: it is what a bare tap on the group picks the first time. */
    children: ['pencil', 'rubber'] as const,
}

export type DrawTool = (typeof DRAW_GROUP.children)[number]

export const isDrawTool = (name: string | null | undefined): name is DrawTool =>
    (DRAW_GROUP.children as readonly string[]).includes(name ?? '')

/**
 * Replace the draw tools with one group button, placed where the first of them
 * sat. The button wears the icon of `shownTool`, the child that is active or
 * was used last, so the toolbar shows what a tap will bring back.
 */
export function groupToolsForMobile(
    elements: readonly PrimaryElement[],
    shownTool: DrawTool
): PrimaryElement[] {
    const shown = elements.find((el) => el.elementName === shownTool)
    if (!shown) return [...elements]

    const out: PrimaryElement[] = []
    let placed = false
    for (const el of elements) {
        if (!isDrawTool(el.elementName)) {
            out.push(el)
            continue
        }
        if (placed) continue
        placed = true
        out.push({
            elementName: DRAW_GROUP.elementName,
            elementDisplayName: DRAW_GROUP.elementDisplayName,
            elementIcon: shown.elementIcon,
            hasDrawer: false,
            noAction: true,
            drawerData: [],
        })
    }
    return out
}
