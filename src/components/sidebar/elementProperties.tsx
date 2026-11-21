import React, { Fragment, useEffect, useMemo, useState } from 'react'

import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import ColorPicker from '../utils/colorPicker'
import OpacitySlider from '../utils/opacitySlider'
import { visibleSections } from './visibleSections'
import {
    SectionLabel,
    StrokeTypeRow,
    StrokeWidthRow,
} from '../utils/strokeRows'
import { FillTypeRow } from '../utils/fillTypeRow'
import { AREA_DEFAULT_OPACITY } from '../../utils/areaFill'
import { PresetChipRow } from '../legend/presetChips'
import Tooltip from '../common/tooltip'
import ToggleSwitch from '../common/toggleSwitch'
import {
    TEXT_SIZES_ARRAY,
    fillEssentialShades,
    pointFillEssentialShades,
} from '../../utils/constants'
import { MIXED, inspectGroupValues } from '../../utils/groupInspect'
import { readOpacity } from '../../utils/canvasUtils'
import { isStandaloneTextType, POINT_LABEL_SIZES } from '../../constants/misc'
import { pointFontFamilyOf, pointFontSizeOf } from '../../factory/point'
import {
    circleLabelColorOf,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
} from '../../factory/circleLabel'
import type { ReorderOp } from '../canvasContextMenu'
import BringToFrontIcon from '../../assets/bring-to-front.svg?react'
import BringForwardIcon from '../../assets/bring-forward.svg?react'
import SendBackwardIcon from '../../assets/send-backward.svg?react'
import SendToBackIcon from '../../assets/send-to-back.svg?react'
import ColoursIcon from '../../assets/colours.svg?react'
import EllypsisIcon from '../../assets/ellypsis.svg?react'
import TextIcon from '../../assets/text.svg?react'
import SunsetIcon from '../../assets/sunset.svg?react'

const REORDER_ICON_STROKE = 'currentColor'

const REORDER_BUTTONS: {
    op: ReorderOp
    label: string
    Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
}[] = [
    { op: 'front', label: 'Bring to Front', Icon: BringToFrontIcon },
    { op: 'forward', label: 'Bring Forward', Icon: BringForwardIcon },
    { op: 'backward', label: 'Send Backward', Icon: SendBackwardIcon },
    { op: 'back', label: 'Send to Back', Icon: SendToBackIcon },
]

type MobileTab = 'fill' | 'stroke' | 'text' | 'extras'

const MOBILE_TAB_ICON_ACTIVE = 'currentColor'
const MOBILE_TAB_ICON_INACTIVE = 'currentColor'

const MOBILE_TABS: {
    key: MobileTab
    label: string
    Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
}[] = [
    { key: 'fill', label: 'Fill', Icon: ColoursIcon },
    { key: 'stroke', label: 'Stroke', Icon: EllypsisIcon },
    { key: 'text', label: 'Text', Icon: TextIcon },
    { key: 'extras', label: 'Opacity & order', Icon: SunsetIcon },
]

const SETS = {
    PENCIL: ['stroke', 'strokeWidth', 'strokeType'],
    TEXT: ['textColor', 'textSize', 'textFont', 'zoomResist'],
    POINT: ['fill', 'textSize', 'textFont'],
    AREA: ['fillType', 'stroke', 'strokeWidth', 'strokeType', 'opacity'],
    ROUTE: ['stroke', 'strokeWidth', 'strokeType'],
    CIRCLE: ['fill', 'textColor', 'textSize', 'textFont'],
    IMAGE: [],
    GROUP: [
        'fill',
        'stroke',
        'strokeWidth',
        'strokeType',
        'textColor',
        'textSize',
        'textFont',
    ],
}

const SET_LABELS = {
    PENCIL: 'Pencil',
    TEXT: 'Text',
    GROUP: 'Group',
    POINT: 'Point',
    AREA: 'Area',
    ROUTE: 'Route',
    CIRCLE: 'Radius Map',
    IMAGE: 'Image',
}

interface ResolveSetKeyOptions {
    isRubberMode: boolean
    isPencilMode: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedComponent: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedGroup: any
    isTextDrawMode: boolean
    currentElement: string | null
}

function resolveSetKey({
    isRubberMode,
    isPencilMode,
    selectedComponent,
    selectedGroup,
    isTextDrawMode,
    currentElement,
}: ResolveSetKeyOptions): string | null {
    if (selectedGroup) return 'GROUP'
    if (isRubberMode) return null
    if (isPencilMode) return 'PENCIL'
    if (selectedComponent) {
        const shapeType = selectedComponent?.shape?.type
        const elementType =
            selectedComponent?.group?.data?.elementData?.componentType
        if (elementType === 'point') return 'POINT'
        if (elementType === 'area') return 'AREA'
        if (elementType === 'route') return 'ROUTE'
        if (elementType === 'circle') return 'CIRCLE'
        if (elementType === 'image') return 'IMAGE'
        if (
            isStandaloneTextType(shapeType) ||
            isStandaloneTextType(elementType)
        )
            return 'TEXT'
        if (shapeType === 'circle' || shapeType === 'ellipse') return 'CIRCLE'
        if (elementType === 'pencil') return 'PENCIL'
        return null
    }
    if (isTextDrawMode) return 'TEXT'
    if (currentElement === 'area') return 'AREA'
    if (currentElement === 'route') return 'ROUTE'
    if (currentElement === 'circle') return 'CIRCLE'
    return null
}

interface ReadEffectiveValuesOptions {
    setKey: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedComponent: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedGroup: any
    isMobile: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaults: any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readEffectiveValues({
    setKey,
    selectedComponent,
    selectedGroup,
    isMobile,
    defaults,
}: ReadEffectiveValuesOptions): any {
    if (setKey === 'GROUP' && selectedGroup) {
        const inspected = inspectGroupValues(selectedGroup, defaults)
        let textSizeOut = inspected.textSize
        if (textSizeOut !== MIXED) {
            const match = TEXT_SIZES_ARRAY.find((s) =>
                isMobile
                    ? s.mobileValue === textSizeOut
                    : s.value === textSizeOut
            )
            textSizeOut = match?.label ?? defaults.defaultTextSize
        }
        return { ...inspected, textSize: textSizeOut }
    }
    if (!selectedComponent) {
        return {
            fill: defaults.defaultFill,
            stroke: defaults.defaultStrokeColor,
            linewidth: defaults.defaultLinewidth,
            strokeType: defaults.defaultStrokeType ?? 'solid',
            fillType: defaults.defaultFillType ?? 'solid',
            opacity:
                setKey === 'AREA'
                    ? AREA_DEFAULT_OPACITY
                    : (defaults.defaultOpacity ?? 1),
            textColor: defaults.defaultTextColor,
            textSize: defaults.defaultTextSize,
            textFontFamily: defaults.defaultTextFontFamily,
            zoomResistant: true,
        }
    }

    const shapeData = selectedComponent?.shape?.data
    const elementData = selectedComponent?.group?.data?.elementData
    const textData = selectedComponent?.text?.data

    const isText = isStandaloneTextType(selectedComponent?.shape?.type)
    const textNode = isText ? shapeData : textData

    const isPoint = elementData?.componentType === 'point'
    const isCircle = elementData?.componentType === 'circle'
    const isMarkLabel = isPoint || isCircle
    const textSizeNumeric = isPoint
        ? pointFontSizeOf(elementData)
        : isCircle
          ? circleLabelFontSizeOf(elementData)
          : textNode?.size
    const sizeLadder = isMarkLabel ? POINT_LABEL_SIZES : TEXT_SIZES_ARRAY
    const textSizeLabel =
        sizeLadder.find((s) =>
            isMobile && !isMarkLabel
                ? (s as { mobileValue?: number }).mobileValue ===
                  textSizeNumeric
                : s.value === textSizeNumeric
        )?.label || (isMarkLabel ? 'M' : defaults.defaultTextSize)

    return {
        fill: shapeData?.fill ?? defaults.defaultFill,
        stroke: shapeData?.stroke ?? defaults.defaultStrokeColor,
        linewidth: shapeData?.linewidth ?? defaults.defaultLinewidth,
        strokeType: elementData?.strokeType ?? 'solid',
        fillType: elementData?.fillType ?? 'solid',
        opacity: readOpacity(elementData),
        textColor: isCircle
            ? circleLabelColorOf(elementData)
            : isText
              ? (shapeData?.fill ?? defaults.defaultTextColor)
              : (textData?.fill ?? defaults.defaultTextColor),
        textSize: textSizeLabel,
        textFontFamily: isPoint
            ? pointFontFamilyOf(elementData)
            : isCircle
              ? circleLabelFontFamilyOf(elementData)
              : (textNode?.family ?? defaults.defaultTextFontFamily),
        zoomResistant: elementData?.zoomResistant ?? true,
    }
}

const ReorderRow = ({ onReorder }: { onReorder: (op: ReorderOp) => void }) => (
    <div
        data-section="reorder"
        className="pt-2 px-2 pb-2 border-b border-border-panel"
    >
        <SectionLabel>Reorder</SectionLabel>
        <div className="flex gap-2">
            {REORDER_BUTTONS.map(({ op, label, Icon }) => (
                <Tooltip key={op} label={label} placement="top">
                    <button
                        type="button"
                        aria-label={label}
                        onClick={() => onReorder(op)}
                        className="flex-1 h-8 flex items-center justify-center rounded cursor-pointer transition-colors ease-in-out duration-150 border border-border-card hover:bg-sidebar"
                    >
                        <Icon
                            width={15}
                            height={15}
                            stroke={REORDER_ICON_STROKE}
                            strokeWidth={2}
                        />
                    </button>
                </Tooltip>
            ))}
        </div>
    </div>
)

const TextSizeRow = ({
    value,
    onChange,
    sizes = TEXT_SIZES_ARRAY,
}: {
    value: string
    onChange: (v: string) => void
    sizes?: { label: string }[]
}) => (
    <div className="pt-3 px-2">
        <SectionLabel>Text Size</SectionLabel>
        <div className="flex flex-row gap-2">
            {sizes.map(({ label }) => {
                const isSelected = value === label
                return (
                    <button
                        key={label}
                        onClick={() => onChange(label)}
                        className={`w-9 h-8 text-xs font-semibold border rounded transition-colors ${
                            isSelected
                                ? 'bg-accent/10 text-accent-dark border-accent-dark border-2'
                                : 'bg-card-bg text-ink-mid border-border-card hover:bg-sidebar'
                        }`}
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    </div>
)

const FontFamilyRow = ({
    value,
    onChange,
}: {
    value: string
    onChange: (v: string) => void
}) => {
    const families = [
        { label: 'Avenir', family: 'Avenir' },
        { label: 'Frutiger', family: 'Frutiger' },
    ]
    return (
        <div className="pt-3 px-2">
            <SectionLabel>Font</SectionLabel>
            <div className="flex flex-row gap-2">
                {families.map(({ label, family }) => {
                    const isSelected = value === family
                    return (
                        <button
                            key={family}
                            onClick={() => onChange(family)}
                            aria-label={label}
                            style={{ fontFamily: family }}
                            className={`w-12 h-8 text-sm border rounded transition-colors ${
                                isSelected
                                    ? 'bg-accent/10 text-accent-dark border-accent-dark border-2'
                                    : 'bg-card-bg text-ink-mid border-border-card hover:bg-sidebar'
                            }`}
                        >
                            Aa
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

const ZoomResistRow = ({
    value,
    onChange,
}: {
    value: boolean
    onChange: (v: boolean) => void
}) => (
    <div className="pt-3 px-2 flex items-center justify-between gap-2">
        <label
            htmlFor="zoom-resist-toggle"
            className="text-ink-muted font-normal text-xs"
        >
            Zoom resistant
        </label>
        <ToggleSwitch
            id="zoom-resist-toggle"
            checked={value}
            onChange={onChange}
            label="Zoom resistant"
        />
    </div>
)

const MobileTabBar = ({
    tabs,
    active,
    onSelect,
}: {
    tabs: typeof MOBILE_TABS
    active: MobileTab
    onSelect: (key: MobileTab) => void
}) => (
    <div className="flex gap-1 px-2 py-2 border-t border-border-panel shrink-0">
        {tabs.map(({ key, label, Icon }) => {
            const isActive = active === key
            return (
                <button
                    key={key}
                    type="button"
                    aria-label={label}
                    aria-pressed={isActive}
                    onClick={() => onSelect(key)}
                    className={`flex-1 h-8 flex items-center justify-center rounded cursor-pointer transition-colors ${
                        isActive
                            ? 'bg-accent/10 border-2 border-accent-dark'
                            : 'border border-border-card hover:bg-sidebar'
                    }`}
                >
                    <Icon
                        width={20}
                        height={20}
                        strokeWidth={1.5}
                        stroke={
                            isActive
                                ? MOBILE_TAB_ICON_ACTIVE
                                : MOBILE_TAB_ICON_INACTIVE
                        }
                    />
                </button>
            )
        })}
    </div>
)

const ElementPropertiesToolbar = () => {
    const ctx = useBaseContext()

    const {
        isPencilMode,
        isTextDrawMode,
        isRubberMode,
        selectedComponent,
        selectedGroup,
        currentElement,
        componentStore,
        applyProperty,
        applyGroupProperty,
        reorderSelected,
        isElementDragging,
        showMobileToolbarPanel,
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultFillType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
    } = ctx
    const { isMobile } = useMediaQueryUtils()

    const setKey = useMemo(
        () =>
            resolveSetKey({
                isRubberMode,
                isPencilMode,
                selectedComponent,
                selectedGroup,
                isTextDrawMode,
                currentElement,
            }),
        [
            isRubberMode,
            isPencilMode,
            selectedComponent,
            selectedGroup,
            isTextDrawMode,
            currentElement,
        ]
    )

    const defaults = {
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultFillType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
    }

    const [values, setValues] = useState(() =>
        readEffectiveValues({
            setKey: setKey || 'TEXT',
            selectedComponent,
            selectedGroup,
            isMobile,
            defaults,
        })
    )

    const [expandedSection, setExpandedSection] = useState<string | null>(null)

    const [mobileTab, setMobileTab] = useState<MobileTab>('fill')

    const toggleSection = (key: string): void =>
        setExpandedSection((prev) => (prev === key ? null : key))

    useEffect(() => {
        setExpandedSection(null)
        setMobileTab('fill')
    }, [setKey, selectedComponent, selectedGroup, showMobileToolbarPanel])

    useEffect(() => {
        if (!setKey) return
        setValues(
            readEffectiveValues({
                setKey,
                selectedComponent,
                selectedGroup,
                isMobile,
                defaults,
            })
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        setKey,
        selectedComponent,
        selectedGroup,
        isMobile,
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultFillType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
    ])

    if (!setKey) return null
    if (isMobile && !showMobileToolbarPanel) return null
    if (isElementDragging) return null

    const selectedId: string | undefined =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selectedComponent as any)?.group?.data?.elementData?.id
    const sections = visibleSections(
        setKey,
        SETS[setKey as keyof typeof SETS],
        selectedId ? componentStore?.[selectedId] : null
    )
    const showReorder =
        Boolean(selectedComponent || selectedGroup) && !isPencilMode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle =
        (key: string, opts?: { preview?: boolean }) =>
        (val: any): void => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setValues((prev: any) => ({ ...prev, [key]: val }))
            if (selectedGroup) {
                if (key === 'textSize') {
                    const entry = TEXT_SIZES_ARRAY.find((s) => s.label === val)
                    const numeric = entry
                        ? isMobile
                            ? entry.mobileValue
                            : entry.value
                        : val
                    applyGroupProperty?.(key, numeric, opts)
                } else {
                    applyGroupProperty?.(key, val, opts)
                }
                return
            }
            applyProperty?.(key, val, opts)
        }

    const fillGroup =
        sections.includes('fill') || sections.includes('fillType') ? (
            <div className="pb-2 border-b border-border-panel">
                {sections.includes('fillType') && (
                    <div data-section="fillType">
                        <FillTypeRow
                            value={values.fillType}
                            onChange={handle('fillType')}
                        />
                    </div>
                )}
                {sections.includes('fill') && (
                    <div data-section="fill" className="pt-2 px-2">
                        <ColorPicker
                            title="Fill"
                            currentColor={values.fill}
                            onChangeComplete={handle('fill')}
                            isExpanded={expandedSection === 'fill'}
                            onToggleExpand={() => toggleSection('fill')}
                            essentialColors={
                                setKey === 'POINT' || setKey === 'CIRCLE'
                                    ? pointFillEssentialShades
                                    : fillEssentialShades
                            }
                        />
                    </div>
                )}
            </div>
        ) : null

    const strokeGroup =
        sections.includes('stroke') ||
        sections.includes('strokeWidth') ||
        sections.includes('strokeType') ? (
            <div className="pb-3 border-b border-border-panel">
                {sections.includes('stroke') && (
                    <div data-section="stroke" className="pt-2 px-2">
                        <ColorPicker
                            title="Stroke"
                            currentColor={values.stroke}
                            onChangeComplete={handle('stroke')}
                            isExpanded={expandedSection === 'stroke'}
                            onToggleExpand={() => toggleSection('stroke')}
                        />
                    </div>
                )}

                {sections.includes('strokeWidth') && (
                    <StrokeWidthRow
                        value={values.linewidth}
                        onChange={handle('linewidth')}
                    />
                )}

                {sections.includes('strokeType') && (
                    <StrokeTypeRow
                        value={values.strokeType}
                        onChange={handle('strokeType')}
                    />
                )}
            </div>
        ) : null

    const textGroup =
        sections.includes('textColor') ||
        sections.includes('textSize') ||
        sections.includes('textFont') ||
        sections.includes('zoomResist') ? (
            <div className="pb-3 border-b border-border-panel">
                {sections.includes('textColor') && (
                    <div data-section="textColor" className="pt-2 px-2">
                        <ColorPicker
                            title="Text"
                            currentColor={values.textColor}
                            onChangeComplete={handle('textColor')}
                            isExpanded={expandedSection === 'textColor'}
                            onToggleExpand={() => toggleSection('textColor')}
                        />
                    </div>
                )}

                {sections.includes('textSize') && (
                    <TextSizeRow
                        value={values.textSize}
                        onChange={handle('textSize')}
                        sizes={
                            setKey === 'POINT' || setKey === 'CIRCLE'
                                ? POINT_LABEL_SIZES
                                : undefined
                        }
                    />
                )}

                {sections.includes('textFont') && (
                    <FontFamilyRow
                        value={values.textFontFamily}
                        onChange={handle('textFontFamily')}
                    />
                )}

                {sections.includes('zoomResist') && (
                    <ZoomResistRow
                        value={values.zoomResistant}
                        onChange={handle('zoomResistant')}
                    />
                )}
            </div>
        ) : null

    const opacityGroup = sections.includes('opacity') ? (
        <div className="pt-3 px-2 pb-3 border-b border-border-panel">
            <SectionLabel>Opacity</SectionLabel>
            <OpacitySlider
                isMixed={values.opacity === MIXED}
                currentOpacity={
                    typeof values.opacity === 'number' ? values.opacity : 1
                }
                handleOnDrag={(arr): void =>
                    handle('opacity', { preview: true })(arr[0])
                }
                handleOnChange={(arr) => handle('opacity')(arr[0])}
            />
        </div>
    ) : null

    const reorderGroup = showReorder ? (
        <ReorderRow onReorder={reorderSelected} />
    ) : null

    const availableMobileTabs = MOBILE_TABS.filter(({ key }) => {
        if (key === 'fill') return Boolean(fillGroup)
        if (key === 'stroke') return Boolean(strokeGroup)
        if (key === 'text') return Boolean(textGroup)
        return Boolean(opacityGroup) || Boolean(reorderGroup)
    })
    const activeMobileTab: MobileTab = availableMobileTabs.some(
        (t) => t.key === mobileTab
    )
        ? mobileTab
        : (availableMobileTabs[0]?.key ?? 'fill')

    let mobileActiveContent: React.ReactNode
    if (activeMobileTab === 'fill') mobileActiveContent = fillGroup
    else if (activeMobileTab === 'stroke') mobileActiveContent = strokeGroup
    else if (activeMobileTab === 'text') mobileActiveContent = textGroup
    else
        mobileActiveContent = (
            <>
                {opacityGroup}
                {reorderGroup}
            </>
        )

    return (
        <div
            id="floating-toolbar"
            onMouseDown={(e): void => {
                if (!selectedGroup) return
                const tag = (e.target as HTMLElement | null)?.tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA') return
                e.preventDefault()
            }}
            className={
                isMobile
                    ? 'secondary-sidebar-content fixed bg-card-bg flex flex-col text-left rounded-card border border-border-panel shadow-card overflow-hidden'
                    : 'secondary-sidebar-content fixed bg-card-bg block text-left pb-4 rounded-card border border-border-panel shadow-card overflow-y-auto tablet:max-h-128'
            }
            style={
                isMobile
                    ? {
                          bottom: '60px',
                          right: '10px',
                          width: '208px',
                          zIndex: 20,
                          maxHeight: 'calc(100dvh - 70px)',
                      }
                    : { left: '10px', top: '56px', width: '13rem' }
            }
        >
            <div className="w-full px-2 font-semibold text-xs pt-1 pb-1 border-b border-border-panel text-ink-muted shrink-0">
                Styling: {SET_LABELS[setKey as keyof typeof SET_LABELS]}
            </div>

            {isMobile && (
                <div
                    data-section="legendPreset"
                    className="px-2 py-2 border-b border-border-panel shrink-0"
                >
                    <PresetChipRow />
                </div>
            )}

            {isMobile ? (
                <>
                    <div className="flex-1 overflow-y-auto">
                        {mobileActiveContent}
                    </div>
                    <MobileTabBar
                        tabs={availableMobileTabs}
                        active={activeMobileTab}
                        onSelect={setMobileTab}
                    />
                </>
            ) : (
                <>
                    {fillGroup}
                    {strokeGroup}
                    {textGroup}
                    {opacityGroup}
                    {reorderGroup}
                </>
            )}
        </div>
    )
}

export default ElementPropertiesToolbar
