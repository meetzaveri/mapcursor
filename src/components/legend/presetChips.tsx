// The secondary drawer: which legend preset a mark belongs to.
//
// It unfurls from under the primary toolbar whenever one of the four
// preset-able tools is selected — Point, Area, Route, Radius Map — and answers
// the question you are about to act on: *what am I drawing?* Choosing before
// you draw is what lets a legend be built as the map is made, rather than
// reconstructed from memory afterwards.
//
// It also opens for an already-drawn mark that is selected, so an existing
// element can be re-filed. Both cases are the same row; only what a pick does
// differs — arm the tool, or restyle the selection.
//
// Picking is never compulsory. **None** always leads, because a mark with no
// caption is a perfectly good mark. But a preset that IS picked overrides the
// styling: the legend promises everything under a caption looks alike, and the
// only way to keep that promise is for the caption to win.

import { useState } from 'react'
import type { ReactElement } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import PresetPreview from './presetPreview'
import type { LegendPreset } from '../../types/legend'
import { setArmedPreset } from '../../utils/armedLegendPreset'
import { readLegendPresetTarget } from '../../utils/legendPresetTarget'

/**
 * The primary toolbar's bottom edge: `top-2` (8px) plus its 46px height. The
 * drawer starts flush against it so it reads as coming OUT of the toolbar
 * rather than floating below it.
 */
const TOOLBAR_BOTTOM = 54

export const PRESET_CHIPS_ID = 'mc-preset-chips'

interface ChipProps {
    label: string
    isSelected: boolean
    onClick: () => void
    preset?: LegendPreset
}

const Chip = ({
    label,
    isSelected,
    onClick,
    preset,
}: ChipProps): ReactElement => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        title={label}
        className={`flex items-center gap-1 h-7 px-2 rounded-md shrink-0 cursor-pointer
            text-xs transition-colors duration-150 ${
                isSelected
                    ? 'bg-accent/10 border-2 border-accent-dark text-ink'
                    : 'border border-border-card text-ink-mid hover:bg-sidebar'
            }`}
    >
        {preset && (
            <PresetPreview
                elementType={preset.elementType}
                preset={preset}
                size={16}
            />
        )}
        <span className="max-w-32 truncate">{label}</span>
    </button>
)

/**
 * The row's contents, shared with the mobile properties panel — which renders
 * them inline rather than as floating chrome, because a phone's toolbar band is
 * already full.
 */
export function PresetChipRow(): ReactElement | null {
    const {
        selectedComponent,
        currentElement,
        legendPresets,
        applyLegendPresetToSelection,
    } = useBaseContext()
    // The armed map lives in localStorage (the canvas reads it from a frozen
    // handler), so a pick has nothing in React to re-render off. This bumps to
    // force the re-read.
    const [armedTick, setArmedTick] = useState(0)
    void armedTick

    const target = readLegendPresetTarget(selectedComponent, currentElement)
    if (!target) return null

    const applicable = legendPresets.filter(
        (p) => p.elementType === target.elementType
    )

    const pick = (preset: LegendPreset | null): void => {
        if (target.isArmed) {
            // Nothing drawn to apply to yet — remember it for the next mark
            // made with this tool.
            setArmedPreset(target.elementType, preset)
            setArmedTick((t) => t + 1)
            return
        }
        applyLegendPresetToSelection(preset)
    }

    return (
        <div className="flex items-center gap-1 overflow-x-auto">
            <Chip
                label="None"
                isSelected={target.boundId === null}
                onClick={(): void => pick(null)}
            />
            {applicable.map((preset) => (
                <Chip
                    key={preset.id}
                    label={preset.name}
                    preset={preset}
                    isSelected={target.boundId === preset.id}
                    onClick={(): void => pick(preset)}
                />
            ))}
            {applicable.length === 0 && (
                <span className="text-xs text-ink-muted px-1 shrink-0">
                    No presets for this yet
                </span>
            )}
        </div>
    )
}

/**
 * Desktop only. On mobile the same row renders inside the element-properties
 * panel — see ElementPropertiesToolbar — because the bottom band already
 * carries the toolbar, undo/redo and the draw controls.
 */
export default function PresetChips(): ReactElement | null {
    const { selectedComponent, currentElement, isElementDragging } =
        useBaseContext()
    const { isMobile } = useMediaQueryUtils()

    if (isMobile) return null

    // Mirrors the properties toolbar: chrome that follows the selection must
    // get out of the way while that selection is being dragged.
    const target = isElementDragging
        ? null
        : readLegendPresetTarget(selectedComponent, currentElement)

    return (
        <div
            className="fixed pointer-events-none"
            style={{
                top: `${TOOLBAR_BOTTOM}px`,
                left: '50%',
                // The centering lives on THIS element, not on the animated one:
                // framer writes `transform` itself, so a translateX here would
                // be overwritten the moment the drawer animates.
                transform: 'translateX(-50%)',
                zIndex: 10,
            }}
        >
            <AnimatePresence initial={false}>
                {target && (
                    <motion.div
                        id={PRESET_CHIPS_ID}
                        // Unfurls downward out of the toolbar: height drives the
                        // reveal (the same `0 → auto` the colour picker uses),
                        // and the small negative `y` makes it look tucked behind
                        // the toolbar at the start rather than merely short.
                        initial={{ opacity: 0, height: 0, y: -8 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="overflow-hidden pointer-events-auto"
                    >
                        <div
                            className="bg-card-bg border border-border-panel shadow-panel
                                rounded-card flex items-center px-2 py-1 mt-1
                                max-w-[min(680px,calc(100vw-40px))]"
                        >
                            <span className="text-xs text-ink-muted pr-2 shrink-0">
                                Legend
                            </span>
                            <PresetChipRow />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
