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

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'

import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { RIGHT_MARGIN } from '../../hooks/useTopRightOffset'
import Tooltip from '../common/tooltip'
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
    /**
     * Mobile modal only. With a mark selected, tapping a row of another type
     * blurs it and says why it can't be applied, instead of doing nothing.
     */
    blockMismatches?: boolean
}

/** How long the "Cannot be applied" notice stays on a row. */
const MISMATCH_NOTICE_MS = 2500

/**
 * The rows themselves, shared by the desktop panel and the mobile modal.
 *
 * A count of 0 is rendered as "Unused" rather than "(0)", because zero is a
 * meaningful state here — a preset created before the marks it describes — and
 * a bare zero reads like a bug.
 *
 * When a mark on the canvas is selected, rows of the SAME type offer "Apply" on
 * hover — the same apply path as the secondary drawer's chips, reached from the
 * place the preset is actually described.
 */
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

    // The row currently showing "Cannot be applied to …", if any.
    const [blockedId, setBlockedId] = useState<string | null>(null)
    useEffect(() => {
        if (!blockedId) return
        const timer = window.setTimeout(
            () => setBlockedId(null),
            MISMATCH_NOTICE_MS
        )
        return (): void => window.clearTimeout(timer)
    }, [blockedId])

    /** A row of another type than the selection: it cannot be acted on. */
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
                    // Same row as the wizard's review card — swatch, then a
                    // min-w-0 text block — so a preset reads the same way in
                    // the list it lands in as it did on the page it was made
                    // on. `text-left` is not decoration: the panel is a child
                    // of `.App`, which sets `text-align: center`, and the
                    // wizard only escapes that by portalling to the body.
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
                            {/* flex-1 is the whole justification story: it
                                pushes the actions to the far edge, where the
                                wizard's card simply has nothing. */}
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

                                    {/* {count === 0 ? 'Unused' : `${count} on map`} */}
                                </div>
                            </div>
                            {/* Always in the DOM, revealed on hover/focus —
                                mounting them on hover would make them
                                unreachable by keyboard. Collapsed to zero
                                WIDTH, not just faded: an invisible-but-sized
                                strip would truncate the name even at rest. */}
                            {/* Not rendered at all on a mismatched row: with a
                                mark of another type selected, the row is
                                blocked outright (no Apply, Edit or Delete), and
                                any tap on it shows the notice instead. */}
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
                    // The screen's right edge, NOT the search field's. The
                    // panel used to take the measured offset that keeps the
                    // place search clear of the share button, which lined the
                    // two up and made the legend read as a dropdown hanging
                    // off the search field. Tucked against the edge it reads
                    // as what it is: a panel about the map, parked in the
                    // corner. `useTopRightOffset` stays for the place search,
                    // which does still have to dodge the share button.
                    right: `${RIGHT_MARGIN}px`,
                    width: `${PANEL_WIDTH}px`,
                    // One below the place search (12), so its results
                    // dropdown opens over this panel; well below the modal
                    // backdrop (1000).
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
