import type { ReactElement } from 'react'
import { useId } from 'react'

import { SectionLabel } from './strokeRows'
import { normalizeAreaFillType } from '../../utils/areaFill'
import type { AreaFillType } from '../../utils/areaFill'
import AreaFillSwatch, { svgSafeId } from './areaFillSwatch'

// The fill-type picker for an area: solid, hachure, cross-hatch.
//
// Shared by the properties toolbar and the legend-preset wizard, for the same
// reason the stroke rows are (see strokeRows.tsx): one value, one widget.

const FILL_TYPES: { value: AreaFillType; label: string }[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'hachure', label: 'Hachure' },
    { value: 'cross-hatch', label: 'Cross-hatch' },
]

export const FillTypeRow = ({
    value,
    onChange,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
    onChange: (v: AreaFillType) => void
}): ReactElement => {
    const current = normalizeAreaFillType(value)
    // Each swatch defines its own <pattern>, so ids must be unique per row.
    const idPrefix = `fill-type-${svgSafeId(useId())}`
    return (
        <div id="fill-type-section" className="pt-3 px-2">
            <SectionLabel>Fill</SectionLabel>
            <div className="flex gap-2">
                {FILL_TYPES.map(({ value: v, label }) => {
                    const isSelected = current === v
                    const ink = isSelected
                        ? 'rgb(var(--color-accent-dark))'
                        : 'rgb(var(--color-ink-muted))'
                    return (
                        <button
                            key={v}
                            type="button"
                            title={label}
                            aria-label={label}
                            aria-pressed={isSelected}
                            onClick={() => onChange(v)}
                            className={`flex-1 h-7 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                                isSelected ? 'bg-accent/10' : 'hover:bg-sidebar'
                            }`}
                            style={{
                                border: isSelected
                                    ? '2px solid rgb(var(--color-accent-dark))'
                                    : '1px solid rgb(var(--color-border-card))',
                            }}
                        >
                            <AreaFillSwatch
                                fillType={v}
                                color={ink}
                                patternId={`${idPrefix}-${v}`}
                            />
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
