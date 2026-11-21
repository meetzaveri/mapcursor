import { circleLabelOf } from '../../factory/circleLabel'

const CIRCLE_LABEL_SECTIONS = new Set(['textColor', 'textSize', 'textFont'])

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
