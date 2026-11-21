import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'

import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { RIGHT_MARGIN } from '../../hooks/useTopRightOffset'
import Tooltip from '../common/tooltip'
import DragGrip from '../common/dragGrip'
import { useDraggablePanel } from '../../hooks/useDraggablePanel'
import { LEGEND_PANEL_MOVED_EVENT } from '../../constants/misc'
import PresetPreview from './presetPreview'
import LegendPresetWizard from './legendPresetWizard'
import ApplyPresetButton from './applyPresetButton'
import { LEGEND_TYPE_LABELS } from '../../types/legend'
import type { LegendPreset } from '../../types/legend'
import type { LegendPresetInput } from '../../hooks/useLegendPresets'
import {
    readSelectedPresetTarget,
    readSelectedTypeLabel,
} from '../../utils/legendPresetTarget'

export const LEGEND_PANEL_TOP = 62
const PANEL_WIDTH = 260

export const LEGEND_PANEL_ID = 'mc-legend-panel'
export const LEGEND_FLOATING_ATTR = 'data-floating'
const POSITION_STORAGE_KEY = 'mapcursor:legendPanelPosition'

const DOCKED_PLACEMENT = {
    top: `${LEGEND_PANEL_TOP}px`,
    right: `${RIGHT_MARGIN}px`,
}

interface LegendListProps {
    presets: LegendPreset[]
    counts: Record<string, number>
    onCreate: () => void
    onEdit: (preset: LegendPreset) => void
    onDelete: (id: string) => void
    blockMismatches?: boolean
}

const MISMATCH_NOTICE_MS = 2500

export function LegendList({
    presets,
    counts,
    onCreate,
    onEdit,
    onDelete,
    blockMismatches = false,
}: LegendListProps): ReactElement {
    const { selectedComponent, applyLegendPresetToSelection } = useBaseContext()
    const selection = readSelectedPresetTarget(selectedComponent)
    const selectedType = blockMismatches
        ? readSelectedTypeLabel(selectedComponent)
        : null

    const [blockedId, setBlockedId] = useState<string | null>(null)
    useEffect(() => {
        if (!blockedId) return
        const timer = window.setTimeout(
            () => setBlockedId(null),
            MISMATCH_NOTICE_MS
        )
        return (): void => window.clearTimeout(timer)
    }, [blockedId])

    const isMismatch = (preset: LegendPreset): boolean =>
        !!selectedType && preset.elementType !== selectedType.componentType

    const onRowTap = (preset: LegendPreset): void => {
        if (!isMismatch(preset)) return
        setBlockedId((current) => (current === preset.id ? null : preset.id))
    }

    if (presets.length === 0) {
        return (
            <div className="px-3 py-4 text-center">
                <div className="text-xs text-ink-muted mb-3">
                    No legend presets yet. Create legend preset so that you can
                    create object with that preset styling.
                </div>
                <button
                    type="button"
                    onClick={onCreate}
                    className="w-full h-8 text-xs rounded-md bg-accent text-white
                        hover:shadow-lg transition-shadow duration-150"
                >
                    Create a Legend Preset
                </button>
            </div>
        )
    }

    return (
        <div>
            <ul className="max-h-72 overflow-y-auto">
                {presets.map((preset) => {
                    const count = counts[preset.id] ?? 0
                    const isBlocked = blockedId === preset.id
                    const mismatched = isMismatch(preset)
                    return (
                        <li
                            key={preset.id}
                            data-preset-id={preset.id}
                            onClick={(): void => onRowTap(preset)}
                            aria-disabled={mismatched || undefined}
                            className="group relative flex items-center gap-3 px-2 py-2 text-left
                                border-b border-border-panel last:border-b-0"
                        >
                            {isBlocked && selectedType && (
                                <div
                                    role="status"
                                    className="absolute inset-0 z-10 flex items-center justify-center
                                        px-3 text-xs font-medium text-ink pointer-events-none"
                                >
                                    Cannot be applied to {selectedType.label}
                                </div>
                            )}
                            <span
                                className={`shrink-0 flex transition ${
                                    isBlocked ? 'blur-[2px] opacity-40' : ''
                                }`}
                            >
                                <PresetPreview
                                    elementType={preset.elementType}
                                    preset={preset}
                                    size={28}
                                />
                            </span>
                            <div
                                className={`min-w-0 flex-1 transition ${
                                    isBlocked ? 'blur-[2px] opacity-40' : ''
                                }`}
                            >
                                <div className="text-xs text-ink truncate">
                                    {preset.name}
                                </div>
                                <div className="text-[11px] text-ink-muted">
                                    {LEGEND_TYPE_LABELS[preset.elementType]}
                                </div>
                            </div>
                            {!mismatched && (
                                <div
                                    className="flex items-center gap-1 shrink-0 overflow-hidden
                                    max-w-0 opacity-0
                                    group-hover:max-w-40 group-hover:opacity-100
                                    focus-within:max-w-40 focus-within:opacity-100
                                    transition-[max-width,opacity] duration-150"
                                >
                                    {selection?.elementType ===
                                        preset.elementType && (
                                        <ApplyPresetButton
                                            presetName={preset.name}
                                            isApplied={
                                                selection.boundId === preset.id
                                            }
                                            onApply={(): void =>
                                                applyLegendPresetToSelection(
                                                    preset
                                                )
                                            }
                                        />
                                    )}
                                    <Tooltip
                                        label="Edit preset"
                                        placement="left"
                                    >
                                        <button
                                            type="button"
                                            aria-label={`Edit ${preset.name}`}
                                            onClick={(): void => onEdit(preset)}
                                            className="w-6 h-6 flex items-center justify-center
                                            rounded text-ink-muted hover:bg-sidebar"
                                        >
                                            <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 16 16"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M11.5 2.5l2 2L6 12l-3 1 1-3z" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                    <Tooltip
                                        label="Delete preset"
                                        placement="left"
                                    >
                                        <button
                                            type="button"
                                            aria-label={`Delete ${preset.name}`}
                                            onClick={(): void =>
                                                onDelete(preset.id)
                                            }
                                            className="w-6 h-6 flex items-center justify-center
                                            rounded text-ink-muted hover:bg-sidebar"
                                        >
                                            <svg
                                                width="12"
                                                height="12"
                                                viewBox="0 0 16 16"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                                strokeLinecap="round"
                                            >
                                                <path d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9h5l.5-9" />
                                            </svg>
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
            <button
                type="button"
                onClick={onCreate}
                className="w-full h-8 text-xs text-center text-accent-dark border-t
                    border-border-panel hover:bg-sidebar transition-colors duration-150"
            >
                + New Legend Preset
            </button>
        </div>
    )
}

export function useLegendWizard(): {
    wizardOpen: boolean
    editing: LegendPreset | null
    openCreate: () => void
    openEdit: (preset: LegendPreset) => void
    close: () => void
    save: (input: LegendPresetInput) => void
} {
    const { createLegendPreset, updateLegendPreset } = useBaseContext()
    const [wizardOpen, setWizardOpen] = useState(false)
    const [editing, setEditing] = useState<LegendPreset | null>(null)

    return {
        wizardOpen,
        editing,
        openCreate: (): void => {
            setEditing(null)
            setWizardOpen(true)
        },
        openEdit: (preset: LegendPreset): void => {
            setEditing(preset)
            setWizardOpen(true)
        },
        close: (): void => setWizardOpen(false),
        save: (input: LegendPresetInput): void => {
            if (editing) updateLegendPreset(editing.id, input)
            else createLegendPreset(input)
        },
    }
}

export default function LegendPanel(): ReactElement | null {
    const { legendPresets, legendPresetCounts, deleteLegendPreset } =
        useBaseContext()
    const { isMobile } = useMediaQueryUtils()
    const wizard = useLegendWizard()
    const [collapsed, setCollapsed] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)
    const { position, isDragging, gripHandlers } = useDraggablePanel(
        panelRef,
        POSITION_STORAGE_KEY
    )
    const isFloating = position !== null

    useEffect(() => {
        window.dispatchEvent(new CustomEvent(LEGEND_PANEL_MOVED_EVENT))
    }, [isFloating])

    if (isMobile) return null

    return (
        <>
            <div
                ref={panelRef}
                id={LEGEND_PANEL_ID}
                {...{ [LEGEND_FLOATING_ATTR]: isFloating || undefined }}
                className="fixed"
                style={{
                    ...(position
                        ? { left: `${position.x}px`, top: `${position.y}px` }
                        : DOCKED_PLACEMENT),
                    width: `${PANEL_WIDTH}px`,
                    zIndex: isDragging ? 13 : 11,
                }}
            >
                <div className="bg-card-bg border border-border-panel rounded-card overflow-hidden shadow-panel">
                    <div className="flex items-center gap-0.5 pl-1">
                        <DragGrip
                            label="Drag to move · double-click to dock"
                            isDragging={isDragging}
                            {...gripHandlers}
                        />
                        <button
                            type="button"
                            onClick={(): void => setCollapsed((v) => !v)}
                            aria-expanded={!collapsed}
                            className="flex-1 flex items-center justify-between px-2 py-1
                            text-xs font-semibold text-ink-muted hover:bg-sidebar
                            transition-colors duration-150 rounded"
                        >
                            <span>Legend</span>
                            <svg
                                width="10"
                                height="10"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                    transform: collapsed
                                        ? 'rotate(-90deg)'
                                        : 'none',
                                    transition: 'transform 150ms',
                                }}
                            >
                                <path d="M3 6l5 5 5-5" />
                            </svg>
                        </button>
                    </div>
                    {!collapsed && (
                        <div className="border-t border-border-panel">
                            <LegendList
                                presets={legendPresets}
                                counts={legendPresetCounts}
                                onCreate={wizard.openCreate}
                                onEdit={wizard.openEdit}
                                onDelete={deleteLegendPreset}
                            />
                        </div>
                    )}
                </div>
            </div>

            <LegendPresetWizard
                open={wizard.wizardOpen}
                editing={wizard.editing}
                onClose={wizard.close}
                onSave={wizard.save}
            />
        </>
    )
}
