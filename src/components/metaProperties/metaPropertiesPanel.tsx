import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { ReactElement } from 'react'

import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { RIGHT_MARGIN } from '../../hooks/useTopRightOffset'
import Modal from '../common/modal'
import { LEGEND_PANEL_ID, LEGEND_PANEL_TOP } from '../legend/legendPanel'
import { META_PANEL_DIALOG_ATTR, META_PANEL_ID } from '../../utils/canvasChrome'
import {
    META_OBJECT_LABELS,
    useSelectedMetaObject,
} from './useSelectedMetaObject'
import type { SelectedMetaObject } from './useSelectedMetaObject'
import { useObjectMetaValues } from './useObjectMetaValues'
import MetaPropertyRow from './metaPropertyRow'
import MetaPropertyWizard from './metaPropertyWizard'
import type { MetaDraft } from './metaValueField'
import {
    ChangeTypeDialog,
    DeletePropertyDialog,
    ImageLightbox,
    RenamePropertyDialog,
} from './metaDialogs'
import type { MetaProperty } from '../../types/metaProperty'

// The meta properties panel: a floating card on the right edge, tucked under
// the legend, shown while exactly one point / route / area / radius map /
// geo-text is selected. Lists that object's properties (editable in place) and adds new
// ones through a two-step wizard. On mobile the same body opens in a sheet
// from a button in the right-edge column under Share (MobileSideActions).
// See .claude/context/meta-properties.md.

const PANEL_WIDTH = 260
// The same 8px the legend keeps under the place search, so the right edge
// stacks search → legend → meta at one rhythm.
const GAP = 8
// Room kept clear at the bottom for the help button and map attribution.
const BOTTOM_CLEARANCE = 64

/**
 * Directly under the legend, one GAP below it, following it as it collapses or
 * grows, and never past the bottom of the screen. With no legend on screen it
 * takes the legend's own top, so it sits where the legend would.
 */
function useUnderLegendPlacement(): {
    top: number
    maxHeight: number
} {
    const [placement, setPlacement] = useState({ top: 120, maxHeight: 400 })

    const measure = useCallback((): void => {
        const legendRect = document
            .getElementById(LEGEND_PANEL_ID)
            ?.getBoundingClientRect()
        const top = legendRect ? legendRect.bottom + GAP : LEGEND_PANEL_TOP
        const maxHeight = Math.max(
            window.innerHeight - top - BOTTOM_CLEARANCE,
            160
        )
        setPlacement((p) =>
            p.top === top && p.maxHeight === maxHeight ? p : { top, maxHeight }
        )
    }, [])

    useLayoutEffect(() => {
        measure()
        const observer = new ResizeObserver(measure)
        const legend = document.getElementById(LEGEND_PANEL_ID)
        if (legend) observer.observe(legend)
        window.addEventListener('resize', measure)
        return (): void => {
            observer.disconnect()
            window.removeEventListener('resize', measure)
        }
    }, [measure])

    return placement
}

/** The panel's content, shared by the desktop card and the mobile sheet. */
function MetaPanelBody({
    target,
}: {
    target: SelectedMetaObject
}): ReactElement {
    const { meta, isPersisted } = useBaseContext()
    const { values, loading, error } = useObjectMetaValues(target.objectId)
    const [view, setView] = useState<'list' | 'wizard'>('list')
    const [renaming, setRenaming] = useState<MetaProperty | null>(null)
    const [retyping, setRetyping] = useState<MetaProperty | null>(null)
    const [deleting, setDeleting] = useState<MetaProperty | null>(null)
    const [lightbox, setLightbox] = useState<string | null>(null)

    const byId = new Map(meta.metaProperties.map((p) => [p.id, p]))
    const rows = values
        .map((value) => ({ value, property: byId.get(value.propertyId) }))
        .filter(
            (r): r is { value: typeof r.value; property: MetaProperty } =>
                !!r.property
        )
        .sort((a, b) => a.property.position - b.property.position)
    const onObject = new Set(rows.map((r) => r.property.id))
    const available = meta.metaProperties.filter((p) => !onObject.has(p.id))
    const noun = META_OBJECT_LABELS[target.objectType].toLowerCase()

    // Every write below is one undo step (Ctrl/Cmd+Z, or the toolbar).
    const saveValue = async (
        property: MetaProperty,
        draft: MetaDraft
    ): Promise<string | null> => {
        const r = await meta.setValue(property, target, draft)
        return r.ok ? null : r.error
    }

    // Local mode knows every value, so the delete prompt can say how many
    // objects lose one. A shared base would need a query for a sentence.
    const usageCount = (property: MetaProperty | null): number | null => {
        if (!property || isPersisted) return null
        return meta
            .readLocalSet()
            .values.filter((v) => v.propertyId === property.id).length
    }

    return (
        <>
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-panel">
                <span className="text-xs font-semibold text-ink">
                    Properties
                </span>
                <span className="text-[11px] text-ink-muted">
                    {META_OBJECT_LABELS[target.objectType]}
                </span>
            </div>

            {view === 'wizard' ? (
                <MetaPropertyWizard
                    available={available}
                    isShared={isPersisted}
                    onCancel={(): void => setView('list')}
                    validateNewName={meta.validateNewName}
                    onSave={async (choice, draft): Promise<string | null> => {
                        const r = await meta.addPropertyToObject(
                            choice,
                            target,
                            draft
                        )
                        if (!r.ok) return r.error
                        setView('list')
                        return null
                    }}
                />
            ) : (
                <>
                    {error && (
                        <div className="px-3 py-2 text-[11px] text-red-500">
                            {error}
                        </div>
                    )}
                    {rows.length === 0 && !loading && !error && (
                        <div className="px-3 py-4 text-center text-xs text-ink-muted">
                            No properties on this {noun} yet. Add details like
                            opening hours, a photo or a contact email.
                        </div>
                    )}
                    {rows.length > 0 && (
                        <ul>
                            {rows.map(({ property, value }) => (
                                <MetaPropertyRow
                                    key={property.id}
                                    property={property}
                                    value={value}
                                    objectNoun={noun}
                                    onSave={(draft): Promise<string | null> =>
                                        saveValue(property, draft)
                                    }
                                    onRemove={(): void => {
                                        void meta.removeValue(value)
                                    }}
                                    onRename={(): void => setRenaming(property)}
                                    onChangeType={(): void =>
                                        setRetyping(property)
                                    }
                                    onDelete={(): void => setDeleting(property)}
                                    onOpenImage={setLightbox}
                                />
                            ))}
                        </ul>
                    )}
                    <button
                        type="button"
                        onClick={(): void => setView('wizard')}
                        className="w-full h-8 text-xs text-center text-accent-dark border-t
                            border-border-panel hover:bg-sidebar transition-colors duration-150"
                    >
                        + Add property
                    </button>
                </>
            )}

            <RenamePropertyDialog
                property={renaming}
                onClose={(): void => setRenaming(null)}
                onRename={async (name): Promise<string | null> => {
                    if (!renaming) return null
                    const r = await meta.renameProperty(renaming.id, name)
                    return r.ok ? null : r.error
                }}
            />
            <ChangeTypeDialog
                property={retyping}
                isShared={isPersisted}
                onClose={(): void => setRetyping(null)}
                preview={(to): ReturnType<typeof meta.previewTypeChange> =>
                    retyping
                        ? meta.previewTypeChange(retyping.id, to)
                        : Promise.resolve(null)
                }
                onChange={async (to): Promise<string | null> => {
                    if (!retyping) return null
                    const r = await meta.changePropertyType(retyping.id, to)
                    return r.ok ? null : r.error
                }}
            />
            <DeletePropertyDialog
                property={deleting}
                usageCount={usageCount(deleting)}
                onClose={(): void => setDeleting(null)}
                onDelete={(): void => {
                    if (deleting) void meta.deleteProperty(deleting.id)
                }}
            />
            <ImageLightbox
                src={lightbox}
                onClose={(): void => setLightbox(null)}
            />
        </>
    )
}

function DesktopPanel({
    target,
}: {
    target: SelectedMetaObject
}): ReactElement {
    const { top, maxHeight } = useUnderLegendPlacement()
    return (
        <div
            id={META_PANEL_ID}
            className="fixed"
            style={{
                top: `${top}px`,
                right: `${RIGHT_MARGIN}px`,
                width: `${PANEL_WIDTH}px`,
                maxHeight: `${maxHeight}px`,
                // Same layer as the legend: under the place-search dropdown
                // (12) and every modal (1000).
                zIndex: 11,
            }}
        >
            {/* Chrome mirrors the legend card, so the right edge reads as one
                surface. `text-left` because `.App` centres text. */}
            <div
                className="bg-card-bg border border-border-panel rounded-card shadow-panel
                    overflow-y-auto text-left"
                style={{ maxHeight: `${maxHeight}px` }}
            >
                {/* Keyed by object: switching selection resets the view. */}
                <MetaPanelBody key={target.objectId} target={target} />
            </div>
        </div>
    )
}

/**
 * Mobile: the meta properties button and its sheet. Rendered in the right-edge
 * column under Share by MobileSideActions, which owns the placement, so the
 * button itself is in-flow.
 */
export function MobileMetaPropertiesButton({
    target,
}: {
    target: SelectedMetaObject
}): ReactElement {
    const [open, setOpen] = useState(false)
    // A new selection starts closed, like the desktop card's fresh view.
    useEffect(() => setOpen(false), [target.objectId])
    return (
        <>
            <button
                id={META_PANEL_ID}
                type="button"
                aria-label="Properties"
                title="Properties"
                onClick={(): void => setOpen(true)}
                className="w-10 h-10 rounded-lg flex items-center justify-center
                    bg-accent-dark text-white"
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                >
                    <path d="M3 4h10M3 8h10M3 12h6" />
                </svg>
            </button>
            <Modal
                open={open}
                onClose={(): void => setOpen(false)}
                locked={false}
            >
                <div
                    {...{ [META_PANEL_DIALOG_ATTR]: '' }}
                    className="-m-5 text-left"
                    style={{ width: 'min(360px, calc(100vw - 32px))' }}
                >
                    <MetaPanelBody key={target.objectId} target={target} />
                </div>
            </Modal>
        </>
    )
}

export default function MetaPropertiesPanel(): ReactElement | null {
    const target = useSelectedMetaObject()
    const { isMobile } = useMediaQueryUtils()
    if (!target) return null
    // Mobile renders its button in the right-edge column (MobileSideActions).
    if (isMobile) return null
    return <DesktopPanel target={target} />
}
