import { useId } from 'react'
import type { ReactElement } from 'react'

import { strokeToAreaFill, strokeTypeToDashes } from '../../utils/misc'
import { presetStylePatch } from '../../types/legend'
import {
    areaHatchColor,
    areaOpacityOf,
    normalizeAreaFillType,
} from '../../utils/areaFill'
import { AreaFillPattern, svgSafeId } from '../utils/areaFillSwatch'
import {
    POINT_BORDER_COLOR,
    POINT_BORDER_WIDTH,
    POINT_RADIUS,
    POINT_SHADOW_LAYERS,
    POINT_SHADOW_OFFSET_Y,
} from '../../constants/misc'
import type { LegendPreset, LegendPresetType } from '../../types/legend'

interface PresetPreviewProps {
    elementType: LegendPresetType
    preset: LegendPreset
    size?: number
}

const VIEW = 40

function dashArray(strokeType: string | null | undefined): string | undefined {
    const dashes = strokeTypeToDashes(strokeType ?? null)
    if (!dashes || !Array.isArray(dashes) || dashes.length === 0) return
    return dashes.join(' ')
}

export default function PresetPreview({
    elementType,
    preset,
    size = 40,
}: PresetPreviewProps): ReactElement {
    const patch = presetStylePatch(preset) as {
        fill?: string
        stroke?: string
        linewidth?: number
        strokeType?: string | null
        fillType?: string | null
        opacity?: number | null
    }
    const patternId = `preset-fill-${svgSafeId(useId())}`
    const stroke = patch.stroke ?? 'rgb(var(--color-ink-muted))'
    const fill = patch.fill
    const width = Math.min(Math.max(patch.linewidth ?? 2, 0), 8)
    const dash = dashArray(patch.strokeType)

    const common = {
        stroke,
        strokeWidth: width,
        strokeDasharray: dash,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
    }

    let mark: ReactElement
    switch (elementType) {
        case 'point':
            mark = (
                <g>
                    {POINT_SHADOW_LAYERS.map(({ spread, alpha }) => (
                        <circle
                            key={spread}
                            cx={20}
                            cy={20 + POINT_SHADOW_OFFSET_Y}
                            r={POINT_RADIUS + POINT_BORDER_WIDTH / 2 + spread}
                            fill={`rgba(0,0,0,${alpha})`}
                        />
                    ))}
                    <circle
                        cx={20}
                        cy={20}
                        r={POINT_RADIUS}
                        fill={fill ?? stroke}
                        stroke={POINT_BORDER_COLOR}
                        strokeWidth={POINT_BORDER_WIDTH}
                    />
                </g>
            )
            break
        case 'area': {
            const fillType = normalizeAreaFillType(patch.fillType)
            const alpha = areaOpacityOf(patch)
            mark = (
                <g>
                    {fillType !== 'solid' && (
                        <defs>
                            <AreaFillPattern
                                id={patternId}
                                fillType={fillType}
                                color={areaHatchColor(stroke, alpha)}
                                scale={0.75}
                            />
                        </defs>
                    )}
                    <polygon
                        points="6,30 13,9 30,7 34,26 20,34"
                        fill={
                            fillType === 'solid'
                                ? strokeToAreaFill(stroke, alpha)
                                : `url(#${patternId})`
                        }
                        {...common}
                    />
                </g>
            )
            break
        }
        case 'route':
            mark = (
                <polyline points="5,29 15,14 25,24 35,9" fill="none" {...common} />
            )
            break
        case 'circle':
            mark = (
                <circle
                    cx={20}
                    cy={20}
                    r={13}
                    fill={fill ?? 'none'}
                    fillOpacity={0.5}
                    stroke="none"
                />
            )
            break
    }

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            aria-hidden="true"
            className="shrink-0"
        >
            {mark}
        </svg>
    )
}
