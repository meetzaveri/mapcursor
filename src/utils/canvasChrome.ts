// UI chrome that edits the current selection, and so must not count as
// "clicking away" from it.
//
// Elements that draw their own selection (point, text) hide it on a mousedown
// outside themselves. The properties toolbar was always exempt; the meta
// properties panel (and the dialogs it opens) must be too, or clicking into it
// to edit a point's details would deselect the point being edited.

export const FLOATING_TOOLBAR_ID = 'floating-toolbar'
export const META_PANEL_ID = 'mc-meta-panel'
/** Set on dialogs the meta panel opens (they portal to <body>). */
export const META_PANEL_DIALOG_ATTR = 'data-meta-panel-dialog'

const SELECTION_CHROME_SELECTOR = [
    `#${FLOATING_TOOLBAR_ID}`,
    `#${META_PANEL_ID}`,
    `[${META_PANEL_DIALOG_ATTR}]`,
].join(', ')

/** Is this node inside chrome that edits the selection? */
export function isInSelectionChrome(
    node: EventTarget | null | undefined
): boolean {
    const el = node as Element | null | undefined
    return (
        typeof el?.closest === 'function' &&
        !!el.closest(SELECTION_CHROME_SELECTOR)
    )
}

/** Same, for an event's composed path (what the element handlers walk). */
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
