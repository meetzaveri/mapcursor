import type { ReactElement } from 'react'

import { strokeToAreaFill, strokeTypeToDashes } from '../../utils/misc'
import { presetStylePatch } from '../../types/legend'
import {
    POINT_BORDER_COLOR,
    POINT_BORDER_WIDTH,
    POINT_RADIUS,
    POINT_SHADOW_LAYERS,
    POINT_SHADOW_OFFSET_Y,
} from '../../constants/misc'
import type { LegendPreset, LegendPresetType } from '../../types/legend'

// What a preset will look like on the map, drawn as plain SVG.
//
// Deliberately NOT a second Two.js scene: a preset carries four style keys, and
// every one of them maps onto an SVG attribute directly. Standing up a renderer
// in a modal to draw a 44px swatch would cost a canvas, a mount/unmount cycle
// and a camera, to arrive at the same four attributes.
//
// The two derivations that are NOT direct — an area's fill being a light shade
// of its stroke, and a dash pattern from a stroke type — go through the same
// helpers the canvas uses (`strokeToAreaFill`, `strokeTypeToDashes`), so the
// preview cannot disagree with what gets drawn.
//
// Stroke widths are NOT counter-scaled here. On the canvas a geo stroke is
// scaled against the live camera; in a fixed swatch there is no camera, so the
// logical width is the honest thing to show — it is the number the user picked.

interface PresetPreviewProps {
    elementType: LegendPresetType
    /** A whole preset, or the in-progress style from the wizard. */
    preset: LegendPreset
    size?: number
}

/**
 * Sizes are in the swatch's own viewBox units (0–40), not surface units. A
 * stroke width is clamped so an 8px route still reads as a line rather than
 * filling the box.
 */
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
    }
    const stroke = patch.stroke ?? 'rgb(var(--color-ink-muted))'
    const fill = patch.fill
    // A 0-width stroke is a real choice ("no outline"); anything above 8 is not
    // offered by the picker, so the clamp only guards a hand-edited preset.
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
            // The pin exactly as buildPointVisual draws it, from the same
            // constants: shadow discs, then the disc with its white ring. At
            // 1 surface unit per viewBox unit the shadow's 11.5 radius fits.
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
        case 'area':
            // Closed polygon, filled with the derived wash — the single rule
            // that makes an area read as an area and not a route.
            mark = (
                <polygon
                    points="6,30 13,9 30,7 34,26 20,34"
                    fill={strokeToAreaFill(stroke)}
                    {...common}
                />
            )
            break
        case 'route':
            mark = (
                <polyline points="5,29 15,14 25,24 35,9" fill="none" {...common} />
            )
            break
        case 'circle':
            // A radius map: a BORDERLESS disc at the 50% opacity it is created
            // with, so the swatch reads the way the mark does over a basemap.
            // `common` is deliberately not spread here — an outline in the
            // swatch would promise a ring the canvas never draws.
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
