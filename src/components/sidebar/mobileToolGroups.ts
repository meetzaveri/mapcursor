import type { PrimaryElement } from '../../utils/constants'

export const DRAW_GROUP = {
    elementName: 'draw',
    elementDisplayName: 'Draw',
    children: ['pencil', 'rubber'] as const,
}

export type DrawTool = (typeof DRAW_GROUP.children)[number]

export const isDrawTool = (name: string | null | undefined): name is DrawTool =>
    (DRAW_GROUP.children as readonly string[]).includes(name ?? '')

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
