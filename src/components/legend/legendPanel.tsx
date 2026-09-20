// The legend: the standing key to a map, pinned top-right under the place
// search.
//
// It is the durable half of the feature. The secondary toolbar is how a preset
// gets applied; THIS is what a person sees three weeks later, or what a
// recipient of a shared link sees on first load — a list of captions with the
// exact swatch the marks on the canvas are wearing.
//
// Desktop only, like PlaceSearch and for the same reason: a phone's top row is
// menu + share and that is the whole width. On mobile the same list is a menu
// entry that opens `legendPanelModal`; both render `LegendList`.

import { useState } from 'react'
import type { ReactElement } from 'react'

import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { useTopRightOffset } from '../../hooks/useTopRightOffset'
import Tooltip from '../common/tooltip'
import PresetPreview from './presetPreview'
import LegendPresetWizard from './legendPresetWizard'
import { LEGEND_TYPE_LABELS } from '../../types/legend'
import type { LegendPreset } from '../../types/legend'
import type { LegendPresetInput } from '../../hooks/useLegendPresets'

/** Top of the panel: 8px margin + the 46px search shell + an 8px gap. */
const PANEL_TOP = 62
const PANEL_WIDTH = 260

export const LEGEND_PANEL_ID = 'mc-legend-panel'

interface LegendListProps {
    presets: LegendPreset[]
    counts: Record<string, number>
    onCreate: () => void
    onEdit: (preset: LegendPreset) => void
    onDelete: (id: string) => void
}

/**
 * The rows themselves, shared by the desktop panel and the mobile modal.
 *
 * A count of 0 is rendered as "Unused" rather than "(0)", because zero is a
 * meaningful state here — a preset created before the marks it describes — and
 * a bare zero reads like a bug.
 */
export function LegendList({
    presets,
    counts,
    onCreate,
    onEdit,
    onDelete,
}: LegendListProps): ReactElement {
    if (presets.length === 0) {
        return (
            <div className="px-3 py-4 text-center">
                <div className="text-xs text-ink-muted mb-3">
                    No legend presets yet. Create one so the colours on this map
                    explain themselves later.
                </div>
                <button
                    type="button"
                    onClick={onCreate}
                    className="w-full h-8 text-xs rounded-md bg-accent text-white
                        hover:shadow-lg transition-shadow duration-150"
                >
                    Create a preset
                </button>
            </div>
        )
    }

    return (
        <div>
            <ul className="max-h-72 overflow-y-auto">
                {presets.map((preset) => {
                    const count = counts[preset.id] ?? 0
                    return (
                        <li
                            key={preset.id}
                            data-preset-id={preset.id}
                            className="group flex items-center gap-2 px-2 py-2
                                border-b border-border-panel last:border-b-0"
                        >
                            <PresetPreview
                                elementType={preset.elementType}
                                preset={preset}
                                size={28}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="text-xs text-ink truncate">
                                    {preset.name}
                                </div>
                                <div className="text-[11px] text-ink-muted">
                                    {LEGEND_TYPE_LABELS[preset.elementType]}
                                    {' · '}
                                    {count === 0
                                        ? 'Unused'
                                        : `${count} on map`}
                                </div>
                            </div>
                            {/* Always in the DOM, revealed on hover/focus —
                                mounting them on hover would make them
                                unreachable by keyboard. */}
                            <div
                                className="flex items-center gap-1 opacity-0
                                    group-hover:opacity-100 focus-within:opacity-100
                                    transition-opacity duration-150"
                            >
                                <Tooltip label="Edit preset" placement="left">
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
                        </li>
                    )
                })}
            </ul>
            <button
                type="button"
                onClick={onCreate}
                className="w-full h-8 text-xs text-accent-dark border-t
                    border-border-panel hover:bg-sidebar transition-colors duration-150"
            >
                + New preset
            </button>
        </div>
    )
}

/**
 * Owns the wizard for both surfaces, so "edit" and "create" behave identically
 * whether they were reached from the pinned panel or the mobile modal.
 */
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
    const rightOffset = useTopRightOffset(!isMobile)
    const wizard = useLegendWizard()
    const [collapsed, setCollapsed] = useState(false)

    if (isMobile) return null

    return (
        <>
            <div
                id={LEGEND_PANEL_ID}
                className="fixed"
                style={{
                    top: `${PANEL_TOP}px`,
                    right: `${rightOffset}px`,
                    width: `${PANEL_WIDTH}px`,
                    // Same band as the place search it stacks under, and below
                    // the modal backdrop (1000) by a wide margin.
                    zIndex: 11,
                }}
            >
                {/* Chrome mirrors the search field and the toolbar exactly —
                    same card background, panel border and card radius — so the
                    whole top-right corner reads as one surface. */}
                <div className="bg-card-bg border border-border-panel rounded-card overflow-hidden shadow-panel">
                    <button
                        type="button"
                        onClick={(): void => setCollapsed((v) => !v)}
                        aria-expanded={!collapsed}
                        className="w-full flex items-center justify-between px-2 py-1
                            text-xs font-semibold text-ink-muted hover:bg-sidebar
                            transition-colors duration-150"
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
