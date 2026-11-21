export const FLOATING_TOOLBAR_ID = 'floating-toolbar'
export const META_PANEL_ID = 'mc-meta-panel'
export const META_PANEL_DIALOG_ATTR = 'data-meta-panel-dialog'

const SELECTION_CHROME_SELECTOR = [
    `#${FLOATING_TOOLBAR_ID}`,
    `#${META_PANEL_ID}`,
    `[${META_PANEL_DIALOG_ATTR}]`,
].join(', ')

export function isInSelectionChrome(
    node: EventTarget | null | undefined
): boolean {
    const el = node as Element | null | undefined
    return (
        typeof el?.closest === 'function' &&
        !!el.closest(SELECTION_CHROME_SELECTOR)
    )
}

export function pathHitsSelectionChrome(path: readonly EventTarget[]): boolean {
    return path.some((node) => {
        const el = node as HTMLElement | null
        return (
            el?.id === FLOATING_TOOLBAR_ID ||
            el?.id === META_PANEL_ID ||
            (typeof el?.hasAttribute === 'function' &&
                el.hasAttribute(META_PANEL_DIALOG_ATTR))
        )
    })
}
