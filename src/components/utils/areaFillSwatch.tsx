import type { ReactElement } from 'react'

import {
    HATCH_GAP_PX,
    HATCH_LINE_PX,
    areaFillTilePath,
} from '../../utils/areaFill'
import type { AreaFillType } from '../../utils/areaFill'

interface AreaFillPatternProps {
    id: string
    fillType: Exclude<AreaFillType, 'solid'>
    color: string
    scale?: number
}

export function AreaFillPattern({
    id,
    fillType,
    color,
    scale = 1,
}: AreaFillPatternProps): ReactElement {
    return (
        <pattern
            id={id}
            patternUnits="userSpaceOnUse"
            width={HATCH_GAP_PX}
            height={HATCH_GAP_PX}
            patternTransform={`scale(${scale}) rotate(45)`}
        >
            <path
                d={areaFillTilePath(fillType)}
                fill="none"
                stroke={color}
                strokeWidth={HATCH_LINE_PX}
                strokeLinecap="square"
            />
        </pattern>
    )
}

interface AreaFillSwatchProps {
    fillType: AreaFillType
    color: string
    patternId: string
}

export function svgSafeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '')
}

export default function AreaFillSwatch({
    fillType,
    color,
    patternId,
}: AreaFillSwatchProps): ReactElement {
    const fill = fillType === 'solid' ? 'currentColor' : `url(#${patternId})`
    return (
        <svg
            width={22}
            height={14}
            viewBox="0 0 22 14"
            aria-hidden="true"
            style={{ color }}
        >
            {fillType !== 'solid' && (
                <defs>
                    <AreaFillPattern
                        id={patternId}
                        fillType={fillType}
                        color="currentColor"
                        scale={0.5}
                    />
                </defs>
            )}
            <rect
                x={1}
                y={1}
                width={20}
                height={12}
                rx={1.5}
                fill={fill}
                fillOpacity={fillType === 'solid' ? 0.35 : 1}
                stroke="currentColor"
                strokeWidth={1.5}
            />
        </svg>
    )
}
