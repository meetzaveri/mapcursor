import type { ReactElement } from 'react'

import {
    HATCH_GAP_PX,
    HATCH_LINE_PX,
    areaFillTilePath,
} from '../../utils/areaFill'
import type { AreaFillType } from '../../utils/areaFill'

// The canvas hatch, as plain React SVG, for places that draw an area without
// Two.js: the fill-type buttons and the legend preset preview. The tile comes
// from `areaFillTilePath`, the same one the canvas patterns use.

interface AreaFillPatternProps {
    id: string
    fillType: Exclude<AreaFillType, 'solid'>
    /** The hatch line colour, already resolved (see `areaHatchColor`). */
    color: string
    /**
     * How many swatch units one tile unit is: 1 draws the tile's 8-unit gap
     * as 8 swatch units. A swatch has no area to size its hatch from, so it
     * just picks a density that reads at its own size.
     */
    scale?: number
}

/** A `<pattern>` to put inside the swatch's own `<defs>`. */
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
    /** Any CSS colour, `var()` included: it is applied through `style`. */
    color: string
    /** Must be unique in the document; see `svgSafeId`. */
    patternId: string
}

/**
 * Make a `useId()` value usable as an SVG id. React's ids carry colons
 * (`:r1:`), which do not survive a `url(#…)` reference reliably.
 */
export function svgSafeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '')
}

/** A small outlined box painted with one fill type, for the picker buttons. */
export default function AreaFillSwatch({
    fillType,
    color,
    patternId,
}: AreaFillSwatchProps): ReactElement {
    // Drawn in currentColor, set through `style`: a presentation attribute
    // does not resolve the theme's `rgb(var(--…))` colours reliably.
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
                        // Denser than the canvas: at 8px a 14px box shows
                        // barely two lines, which does not read as a hatch.
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
