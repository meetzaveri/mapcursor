import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'

import Modal from '../common/modal'
import Button from '../common/button'
import ColorPicker from '../utils/colorPicker'
import {
    SectionLabel,
    StrokeTypeRow,
    StrokeWidthRow,
} from '../utils/strokeRows'
import { FillTypeRow } from '../utils/fillTypeRow'
import OpacitySlider from '../utils/opacitySlider'
import {
    AREA_DEFAULT_OPACITY,
    areaFillTypeToDb,
    areaOpacityOf,
} from '../../utils/areaFill'
import { essentialShades } from '../../utils/constants'
import PresetPreview from './presetPreview'
import {
    LEGEND_PRESET_TYPES,
    LEGEND_TYPE_LABELS,
    PRESET_STYLE_KEYS,
} from '../../types/legend'
import type {
    LegendPreset,
    LegendPresetStyle,
    LegendPresetType,
} from '../../types/legend'
import type { LegendPresetInput } from '../../hooks/useLegendPresets'

const SEED_STYLE: Record<LegendPresetType, LegendPresetStyle> = {
    point: { fill: '#FF5630' },
    area: {
        stroke: '#A32D2D',
        linewidth: 2,
        strokeType: null,
        fillType: null,
        opacity: AREA_DEFAULT_OPACITY,
    },
    route: { stroke: '#3B82F6', linewidth: 3, strokeType: null },
    circle: { fill: '#A32D2D' },
}

const NAME_PLACEHOLDER: Record<LegendPresetType, string> = {
    area: 'e.g. Residential cluster',
    route: 'e.g. High traffic corridor',
    point: 'e.g. School Drop-Off',
    circle: 'e.g. Theft Hotspot',
}

type Page = 'type' | 'colour' | 'fill' | 'stroke' | 'review'

function pagesFor(type: LegendPresetType): Page[] {
    const keys = PRESET_STYLE_KEYS[type]
    const pages: Page[] = ['type']
    if (keys.includes('fill') || keys.includes('stroke')) pages.push('colour')
    if (keys.includes('fillType') || keys.includes('opacity')) {
        pages.push('fill')
    }
    if (keys.includes('linewidth') || keys.includes('strokeType')) {
        pages.push('stroke')
    }
    pages.push('review')
    return pages
}

function colourKeyFor(type: LegendPresetType): 'fill' | 'stroke' {
    return PRESET_STYLE_KEYS[type].includes('fill') ? 'fill' : 'stroke'
}

export interface LegendPresetWizardProps {
    open: boolean
    onClose: () => void
    onSave: (input: LegendPresetInput) => void
    editing?: LegendPreset | null
}

export default function LegendPresetWizard({
    open,
    onClose,
    onSave,
    editing = null,
}: LegendPresetWizardProps): ReactElement {
    const [name, setName] = useState('')
    const [elementType, setElementType] = useState<LegendPresetType>('area')
    const [style, setStyle] = useState<LegendPresetStyle>(SEED_STYLE.area)
    const [pageIndex, setPageIndex] = useState(0)
    const [colourExpanded, setColourExpanded] = useState(true)

    useEffect(() => {
        if (!open) return
        if (editing) {
            setName(editing.name)
            setElementType(editing.elementType)
            setStyle(editing.style)
        } else {
            setName('')
            setElementType('area')
            setStyle(SEED_STYLE.area)
        }
        setPageIndex(0)
        setColourExpanded(true)
    }, [open, editing])

    const pages = useMemo(() => pagesFor(elementType), [elementType])
    const page = pages[pageIndex] ?? 'type'
    const colourKey = colourKeyFor(elementType)

    const previewPreset: LegendPreset = {
        id: 'preview',
        baseId: null,
        name,
        elementType,
        style,
        position: 0,
    }

    const handleTypeChange = (next: LegendPresetType): void => {
        setElementType(next)
        setStyle(SEED_STYLE[next])
    }

    const canAdvance = page !== 'type' || name.trim().length > 0
    const isLast = pageIndex === pages.length - 1

    const handleNext = (): void => {
        if (isLast) {
            onSave({ name: name.trim(), elementType, style })
            onClose()
            return
        }
        setPageIndex((i) => i + 1)
    }

    return (
        <Modal open={open} onClose={onClose}>
            <div
                style={{
                    minWidth: 'min(400px, calc(100vw - 96px))',
                    maxWidth: '460px',
                }}
            >
                <div className="flex items-start justify-between gap-4 mb-1">
                    <h2 className="text-base font-semibold text-ink">
                        {editing ? 'Edit legend preset' : 'New legend preset'}
                    </h2>
                    <PresetPreview
                        elementType={elementType}
                        preset={previewPreset}
                        size={44}
                    />
                </div>

                <div
                    className="flex items-center gap-1 mb-4"
                    aria-hidden="true"
                >
                    {pages.map((p, i) => (
                        <div
                            key={p}
                            className={`h-1 flex-1 rounded-full transition-colors duration-150 ${
                                i <= pageIndex ? 'bg-accent' : 'bg-border-panel'
                            }`}
                        />
                    ))}
                </div>

                {page === 'type' && (
                    <div>
                        <label
                            htmlFor="legend-preset-name"
                            className="block text-xs text-ink-muted mb-2"
                        >
                            What does this {LEGEND_TYPE_LABELS[elementType]}{' '}
                            mean?
                        </label>
                        <input
                            id="legend-preset-name"
                            type="text"
                            autoFocus
                            value={name}
                            onChange={(e): void => setName(e.target.value)}
                            onKeyDown={(e): void => {
                                if (e.key === 'Enter' && canAdvance) {
                                    handleNext()
                                }
                            }}
                            placeholder={NAME_PLACEHOLDER[elementType]}
                            className="w-full h-10 px-3 mb-4 text-sm bg-card-bg text-ink
                                border border-border-card rounded-md
                                focus:outline-none focus:border-accent"
                        />

                        <div className="text-xs text-ink-muted mb-2">
                            Applies to
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {LEGEND_PRESET_TYPES.map((t) => {
                                const isSelected = elementType === t
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={(): void =>
                                            handleTypeChange(t)
                                        }
                                        aria-pressed={isSelected}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer
                                            transition-colors duration-150 text-sm text-ink ${
                                                isSelected
                                                    ? 'bg-accent/10 border-2 border-accent-dark'
                                                    : 'border border-border-card hover:bg-sidebar'
                                            }`}
                                    >
                                        <PresetPreview
                                            elementType={t}
                                            preset={{
                                                ...previewPreset,
                                                elementType: t,
                                                style: SEED_STYLE[t],
                                            }}
                                            size={24}
                                        />
                                        {LEGEND_TYPE_LABELS[t]}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {page === 'colour' && (
                    <ColorPicker
                        title="Colour"
                        currentColor={style[colourKey]}
                        essentialColors={essentialShades}
                        isExpanded={colourExpanded}
                        onToggleExpand={(): void =>
                            setColourExpanded((v) => !v)
                        }
                        onChangeComplete={(color): void =>
                            setStyle((s) => ({ ...s, [colourKey]: color }))
                        }
                    />
                )}

                {page === 'fill' && (
                    <div className="-mx-2">
                        <FillTypeRow
                            value={style.fillType}
                            onChange={(v): void =>
                                setStyle((s) => ({
                                    ...s,
                                    fillType: areaFillTypeToDb(v),
                                }))
                            }
                        />
                        <div className="pt-3 px-2">
                            <SectionLabel>Opacity</SectionLabel>
                            <OpacitySlider
                                currentOpacity={areaOpacityOf(style)}
                                handleOnDrag={(arr): void =>
                                    setStyle((s) => ({
                                        ...s,
                                        opacity: arr[0],
                                    }))
                                }
                                handleOnChange={(arr): void =>
                                    setStyle((s) => ({
                                        ...s,
                                        opacity: arr[0],
                                    }))
                                }
                            />
                        </div>
                    </div>
                )}

                {page === 'stroke' && (
                    <div className="-mx-2">
                        <StrokeWidthRow
                            value={style.linewidth}
                            onChange={(v): void =>
                                setStyle((s) => ({ ...s, linewidth: v }))
                            }
                        />
                        <StrokeTypeRow
                            value={style.strokeType}
                            onChange={(v): void =>
                                setStyle((s) => ({
                                    ...s,
                                    strokeType: v === 'solid' ? null : v,
                                }))
                            }
                        />
                    </div>
                )}

                {page === 'review' && (
                    <div className="flex items-center gap-3 px-3 py-4 rounded-md border border-border-card">
                        <PresetPreview
                            elementType={elementType}
                            preset={previewPreset}
                            size={48}
                        />
                        <div className="min-w-0">
                            <div className="text-sm text-ink font-medium truncate">
                                {name.trim() || 'Untitled'}
                            </div>
                            <div className="text-xs text-ink-muted">
                                {LEGEND_TYPE_LABELS[elementType]}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 mt-5">
                    <Button
                        intent="secondary"
                        size="small"
                        onClick={
                            pageIndex === 0
                                ? onClose
                                : (): void => setPageIndex((i) => i - 1)
                        }
                    >
                        {pageIndex === 0 ? 'Cancel' : 'Back'}
                    </Button>
                    <Button
                        intent="primary"
                        size="small"
                        disabled={!canAdvance}
                        onClick={canAdvance ? handleNext : undefined}
                    >
                        {isLast ? 'Save preset' : 'Next'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
