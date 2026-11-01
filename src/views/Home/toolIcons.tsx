import type { ReactElement, ReactNode } from 'react'

// Radar-style section marks: a tool glyph drawn over a dot grid. Dots use the
// border-card token (grid dots), strokes use ink, vertices use the accent.

const SIZE = 96
const STEP = 12

const DotGrid = (): ReactElement => {
    const dots: ReactElement[] = []
    for (let x = STEP / 2; x < SIZE; x += STEP) {
        for (let y = STEP / 2; y < SIZE; y += STEP) {
            dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} />)
        }
    }
    return (
        <g className="text-border-card" fill="currentColor">
            {dots}
        </g>
    )
}

const Vertex = ({ x, y }: { x: number; y: number }): ReactElement => (
    <circle
        cx={x}
        cy={y}
        r={3.5}
        className="text-accent"
        fill="currentColor"
        stroke="white"
        strokeWidth={1.5}
    />
)

const Mark = ({ children }: { children: ReactNode }): ReactElement => (
    <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <DotGrid />
        {children}
    </svg>
)

const ROUTE_POINTS: readonly [number, number][] = [
    [18, 78],
    [30, 42],
    [54, 54],
    [78, 18],
]

export const RouteMark = (): ReactElement => (
    <Mark>
        <polyline
            points={ROUTE_POINTS.map((p) => p.join(',')).join(' ')}
            className="text-ink"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
        />
        {ROUTE_POINTS.map(([x, y]) => (
            <Vertex key={`${x}-${y}`} x={x} y={y} />
        ))}
    </Mark>
)

const AREA_POINTS: readonly [number, number][] = [
    [24, 22],
    [66, 18],
    [80, 54],
    [48, 80],
    [16, 60],
]

export const AreaMark = (): ReactElement => (
    <Mark>
        <polygon
            points={AREA_POINTS.map((p) => p.join(',')).join(' ')}
            className="text-accent"
            fill="currentColor"
            fillOpacity={0.12}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
        />
        {AREA_POINTS.map(([x, y]) => (
            <Vertex key={`${x}-${y}`} x={x} y={y} />
        ))}
    </Mark>
)

export const RadiusMark = (): ReactElement => (
    <Mark>
        <circle
            cx={48}
            cy={48}
            r={30}
            className="text-ink-muted"
            fill="currentColor"
            fillOpacity={0.25}
        />
        <circle
            cx={48}
            cy={48}
            r={30}
            className="text-ink"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="3 3"
        />
        <line
            x1={48}
            y1={48}
            x2={78}
            y2={48}
            className="text-ink"
            stroke="currentColor"
            strokeWidth={1.5}
        />
        <Vertex x={48} y={48} />
        <Vertex x={78} y={48} />
    </Mark>
)

export const TextMark = (): ReactElement => (
    <Mark>
        <rect
            x={18}
            y={30}
            width={60}
            height={36}
            className="text-ink"
            stroke="currentColor"
            strokeWidth={1}
        />
        <path
            d="M34 40h28M48 40v18"
            className="text-ink"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
        />
        <Vertex x={18} y={30} />
        <Vertex x={78} y={30} />
        <Vertex x={18} y={66} />
        <Vertex x={78} y={66} />
    </Mark>
)
