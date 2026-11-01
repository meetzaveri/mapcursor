import type { ReactElement, ReactNode } from 'react'

// Floating "data" chrome laid over each tool screenshot, styled like the app's
// own panels (Legend, Properties, Styling) so the page reads as the product.

export const OverlayCard = ({
    title,
    meta,
    children,
    className = '',
}: {
    title: string
    meta?: string
    children: ReactNode
    className?: string
}): ReactElement => (
    <div
        className={`bg-card-bg border border-border-panel rounded-card shadow-panel text-left ${className}`}
    >
        <div className="flex items-center justify-between gap-4 px-3 py-2 border-b border-border-panel">
            <span className="text-xs font-semibold text-ink">{title}</span>
            {meta && (
                <span className="text-[11px] text-ink-muted font-mono">
                    {meta}
                </span>
            )}
        </div>
        <div className="px-3 py-2">{children}</div>
    </div>
)

export const OverlayChip = ({
    children,
    className = '',
}: {
    children: ReactNode
    className?: string
}): ReactElement => (
    <div
        className={`inline-flex items-center gap-2 bg-card-bg border border-border-panel rounded-pill
            shadow-panel px-3 py-1.5 text-xs font-medium text-ink whitespace-nowrap ${className}`}
    >
        {children}
    </div>
)

export const Swatch = ({ className }: { className: string }): ReactElement => (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${className}`} />
)

export const KeyValue = ({
    label,
    children,
}: {
    label: string
    children: ReactNode
}): ReactElement => (
    <div className="grid grid-cols-[96px_1fr] gap-2 py-1 text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="text-ink">{children}</span>
    </div>
)

/** Monospace status tag, like the app's preset badges. */
export const Tag = ({ children }: { children: ReactNode }): ReactElement => (
    <span className="font-mono text-[11px] uppercase tracking-wide text-accent-dark bg-accent/10 rounded px-1.5 py-0.5">
        {children}
    </span>
)

export const BarRow = ({
    label,
    value,
    max,
}: {
    label: string
    value: number
    max: number
}): ReactElement => (
    <div className="py-1">
        <div className="flex items-center justify-between text-xs">
            <span className="text-ink-mid">{label}</span>
            <span className="font-mono text-ink">{value}</span>
        </div>
        <div className="mt-1 h-1.5 rounded-pill bg-sidebar overflow-hidden">
            <div
                className="h-full rounded-pill bg-ink-muted"
                style={{ width: `${(value / max) * 100}%` }}
            />
        </div>
    </div>
)
