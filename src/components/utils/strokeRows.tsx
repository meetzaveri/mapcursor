import type { ReactElement, ReactNode } from 'react'

// The stroke-width and stroke-type pickers, and the section heading they sit
// under.
//
// Lifted out of `sidebar/elementProperties.tsx` when the legend-preset wizard
// needed the same two controls: a preset's stroke has to be picked with the
// identical swatches the properties panel uses, or the same value would be
// chosen through two different-looking widgets in one product.

export const STROKE_TYPES = [
    { label: '—', value: 'solid' },
    { label: '- -', value: 'dashed' },
    { label: '...', value: 'dotted' },
]

// `inner` is the diameter (px) of the inner circle that visually nudges
// the actual stroke width inside a constant outer ring. `0` renders the
// "no stroke" state (a diagonal slash) instead of an inner circle.
export const STROKE_WIDTHS = [
    { label: '0', value: 0, inner: 0 },
    { label: '1', value: 1, inner: 4 },
    { label: '2', value: 2, inner: 6 },
    { label: '4', value: 4, inner: 9 },
    { label: '6', value: 6, inner: 12 },
    { label: '8', value: 8, inner: 15 },
]

export const SectionLabel = ({
    children,
}: {
    children: ReactNode
}): ReactElement => (
    <div className="w-full text-ink-muted font-normal text-xs pl-0 mb-2">
        {children}
    </div>
)

export const StrokeWidthRow = ({
    value,
    onChange,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
    onChange: (v: number) => void
}): ReactElement => (
    <div id="stroke-width-section" className="pt-2 px-2">
        <SectionLabel>Stroke Width</SectionLabel>
        <div className="flex justify-between">
            {STROKE_WIDTHS.map(({ value: w, inner }) => {
                const isSelected = value === w
                const accent = isSelected
                    ? 'rgb(var(--color-accent-dark))'
                    : 'rgb(var(--color-ink-muted))'
                return (
                    <button
                        key={w}
                        onClick={() => onChange(w)}
                        title={`${w}px`}
                        className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full cursor-pointer border-2 transition-all ease-in-out duration-200 ${
                            isSelected
                                ? 'border-accent-dark'
                                : 'border-transparent hover:border-accent-dark/40'
                        }`}
                    >
                        {/* outer ring (constant) */}
                        <div
                            className="relative flex items-center justify-center rounded-full"
                            style={{
                                width: '20px',
                                height: '20px',
                                border: `1.5px solid ${accent}`,
                            }}
                        >
                            {w === 0 ? (
                                /* "no stroke" — diagonal slash across the ring */
                                <div
                                    className="absolute rotate-45 rounded-full"
                                    style={{
                                        width: '18px',
                                        height: '1.5px',
                                        background: accent,
                                    }}
                                />
                            ) : (
                                /* inner circle nudges the actual stroke width */
                                <div
                                    className="rounded-full"
                                    style={{
                                        width: `${inner}px`,
                                        height: `${inner}px`,
                                        backgroundColor: accent,
                                    }}
                                />
                            )}
                        </div>
                    </button>
                )
            })}
        </div>
    </div>
)

export const StrokeTypeRow = ({
    value,
    onChange,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
    onChange: (v: string) => void
}): ReactElement => (
    <div id="stroke-type-section" className="pt-3 px-2">
        <SectionLabel>Stroke Type</SectionLabel>
        <div className="flex gap-2">
            {STROKE_TYPES.map(({ label, value: v }) => {
                const isSelected = (value ?? 'solid') === v
                return (
                    <button
                        key={v}
                        onClick={() => onChange(v)}
                        className={`flex-1 w-4 h-6 flex items-center justify-center rounded cursor-pointer transition-all ease-in-out duration-200 ${
                            isSelected ? 'bg-accent/10' : 'hover:bg-sidebar'
                        }`}
                        style={{
                            border: isSelected
                                ? '2px solid rgb(var(--color-accent-dark))'
                                : '1px solid rgb(var(--color-border-card))',
                        }}
                    >
                        <span
                            className="text-base font-bold tracking-widest"
                            style={{
                                color: isSelected
                                    ? 'rgb(var(--color-accent-dark))'
                                    : 'rgb(var(--color-ink-muted))',
                                paddingBottom:
                                    v === 'dotted' ? '0.4rem' : '0px',
                            }}
                        >
                            {label}
                        </span>
                    </button>
                )
            })}
        </div>
    </div>
)
