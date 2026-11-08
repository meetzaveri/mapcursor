import { circleLabelOf } from '../../factory/circleLabel'

/** The sections that style a radius map's label. */
const CIRCLE_LABEL_SECTIONS = new Set(['textColor', 'textSize', 'textFont'])

/**
 * The sections the properties panel shows for the current selection.
 *
 * A radius map's text controls style its label, so a circle with no label
 * (never named, or the name was cleared) leaves them out. `record` should be
 * the component-store row, not the Two.js `elementData`: the store is React
 * state, so naming the circle, clearing its name or undoing either one
 * re-renders the panel. A mutation to `elementData` would not.
 */
export function visibleSections(
    setKey: string,
    sections: readonly string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any
): string[] {
    if (setKey !== 'CIRCLE' || !record) return [...sections]
    if (circleLabelOf(record).trim() !== '') return [...sections]
    return sections.filter((s) => !CIRCLE_LABEL_SECTIONS.has(s))
}
