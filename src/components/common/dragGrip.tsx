import type { HTMLAttributes, ReactElement } from 'react'

// A six-dot drag handle (two columns of three). Purely the affordance: the
// caller supplies the pointer handlers through `...rest`.

const DOTS: readonly [number, number][] = [
    [3, 2],
    [7, 2],
    [3, 6],
    [7, 6],
    [3, 10],
    [7, 10],
]

interface DragGripProps extends HTMLAttributes<HTMLDivElement> {
    isDragging?: boolean
    label: string
}

export default function DragGrip({
    isDragging = false,
    label,
    className = '',
    style,
    ...rest
}: DragGripProps): ReactElement {
    return (
        <div
            role="button"
            aria-label={label}
            title={label}
            tabIndex={-1}
            className={`flex items-center justify-center shrink-0 w-5 h-6 rounded
                text-ink-muted hover:bg-sidebar transition-colors duration-150 ${className}`}
            style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                // Otherwise a touchpad or pen pans the page instead of
                // delivering the pointer moves.
                touchAction: 'none',
                ...style,
            }}
            {...rest}
        >
            <svg
                width="10"
                height="12"
                viewBox="0 0 10 12"
                fill="currentColor"
                aria-hidden="true"
            >
                {DOTS.map(([cx, cy]) => (
                    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.2} />
                ))}
            </svg>
        </div>
    )
}
