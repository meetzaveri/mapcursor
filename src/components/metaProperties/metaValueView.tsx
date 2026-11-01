import type { ReactElement } from 'react'
import { useImageSrc } from './useImageSrc'
import type { MetaPropertyType } from '../../types/metaProperty'

// `YYYY-MM-DD` is a calendar date, not an instant: format it in UTC so a
// user west of Greenwich doesn't see the day before.
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
})

export function formatMetaDate(value: string): string {
    const [y, m, d] = value.split('-').map(Number)
    if (!y || !m || !d) return value
    return DATE_FORMAT.format(new Date(Date.UTC(y, m - 1, d)))
}

interface MetaValueViewProps {
    type: MetaPropertyType
    value: unknown
    /** Image only: open the full-size view. */
    onOpenImage?: (src: string) => void
}

function ImageThumb({
    value,
    onOpenImage,
}: Pick<MetaValueViewProps, 'value' | 'onOpenImage'>): ReactElement {
    const { src, missing } = useImageSrc(value)
    if (missing) {
        return (
            <div className="text-xs text-ink-muted italic">
                Image isn’t on this device
            </div>
        )
    }
    if (!src) return <div className="h-24 rounded-md bg-sidebar animate-pulse" />
    return (
        <button
            type="button"
            onClick={(): void => onOpenImage?.(src)}
            aria-label="View image"
            className="block w-full rounded-md overflow-hidden border border-border-card
                focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
            <img
                src={src}
                alt=""
                className="block w-full max-h-32 object-cover"
                draggable={false}
            />
        </button>
    )
}

/** A stored value, read-only, formatted for its type. */
export default function MetaValueView({
    type,
    value,
    onOpenImage,
}: MetaValueViewProps): ReactElement {
    switch (type) {
        case 'image':
            return <ImageThumb value={value} onOpenImage={onOpenImage} />
        case 'integer':
            return (
                <span className="font-mono text-xs text-ink">
                    {typeof value === 'number' ? value.toLocaleString() : ''}
                </span>
            )
        case 'date':
            return (
                <span className="text-xs text-ink">
                    {typeof value === 'string' ? formatMetaDate(value) : ''}
                </span>
            )
        case 'email':
            return (
                <a
                    href={`mailto:${String(value)}`}
                    className="text-xs text-accent-dark underline break-all"
                    onClick={(e): void => e.stopPropagation()}
                >
                    {String(value)}
                </a>
            )
        case 'text':
        default:
            return (
                <span className="text-xs text-ink whitespace-pre-wrap break-words">
                    {String(value ?? '')}
                </span>
            )
    }
}
