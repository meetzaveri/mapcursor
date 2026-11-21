import { useState } from 'react'
import type { ReactElement } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import PresetPreview from './presetPreview'
import type { LegendPreset } from '../../types/legend'
import { setArmedPreset } from '../../utils/armedLegendPreset'
import { readLegendPresetTarget } from '../../utils/legendPresetTarget'

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

export function PresetChipRow(): ReactElement | null {
    const {
        selectedComponent,
        currentElement,
        legendPresets,
        applyLegendPresetToSelection,
    } = useBaseContext()
    const [armedTick, setArmedTick] = useState(0)
    void armedTick

    const target = readLegendPresetTarget(selectedComponent, currentElement)
    if (!target) return null

    const applicable = legendPresets.filter(
        (p) => p.elementType === target.elementType
    )

    const pick = (preset: LegendPreset | null): void => {
        if (target.isArmed) {
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

export default function PresetChips(): ReactElement | null {
    const { selectedComponent, currentElement, isElementDragging } =
        useBaseContext()
    const { isMobile } = useMediaQueryUtils()

    if (isMobile) return null

    const target = isElementDragging
        ? null
        : readLegendPresetTarget(selectedComponent, currentElement)

    return (
        <div
            className="fixed pointer-events-none"
            style={{
                top: `${TOOLBAR_BOTTOM}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
            }}
        >
            <AnimatePresence initial={false}>
                {target && (
                    <motion.div
                        id={PRESET_CHIPS_ID}
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
