import React, { Fragment, useEffect, useMemo, useState } from 'react'

import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import ColorPicker from '../utils/colorPicker'
import OpacitySlider from '../utils/opacitySlider'
import {
    SectionLabel,
    StrokeTypeRow,
    StrokeWidthRow,
} from '../utils/strokeRows'
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

// Reorder icon tone — matches the toolbar's ink-mid text. The source SVGs
// hardcode a blue stroke; SVGR spreads props after the original attrs so this
// override wins (same trick as canvasContextMenu).
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

// Mobile-only: the property groups are collapsed into a 4-way segmented control
// (one group visible at a time) so the panel never overflows a small screen.
// Each tab is a whole section, colour included — the stroke tab carries the
// stroke palette, the text tab the text palette — so editing one property
// never bounces you to another tab.
// `extras` folds opacity + reorder together. Tab icons live in src/assets and
// hardcode a blue stroke; SVGR spreads props after the original attrs so the
// `stroke` override below wins (same trick as the reorder icons).
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

// What sections each "set" should render, in display order.
const SETS = {
    PENCIL: ['stroke', 'strokeWidth', 'strokeType', 'opacity'],
    // Text carries the zoom-resistance switch, which only text counter-scales
    // for — see resolveResist in utils/counterScale.ts.
    TEXT: ['textColor', 'textSize', 'textFont', 'zoomResist', 'opacity'],
    // Placed map objects: stroke-centric. Area's fill is auto-derived from its
    // stroke, so no fill control — but its outline still takes width/type like
    // a route. A point is a filled circle plus a label whose colour is fixed by
    // design, so what is editable is the pin's fill and the label's size and
    // font. Both text controls run off the point's own ladder/record — see
    // applyProperty.
    POINT: ['fill', 'textSize', 'textFont'],
    AREA: ['stroke', 'strokeWidth', 'strokeType'],
    ROUTE: ['stroke', 'strokeWidth', 'strokeType'],
    // A circle keeps fill (it is a filled mark, unlike an area whose fill is
    // derived) but drops opacity — a circle is created half-transparent so the
    // basemap reads through it, and that is the behaviour, not a knob. Omitting
    // the section IS how the control is hidden, same as for point/area/route.
    //
    // It drops every STROKE control too, because a radius map is borderless:
    // the mark is the translucent disc, so an outline colour, a width and a
    // dash pattern would all be knobs on something that is never drawn (see
    // CIRCLE_DEFAULTS and circle.tsx, which paint a zero-width ring).
    //
    // Its label takes colour, size and font (the latter two off the POINT
    // ladder — see circleLabelFontSizeOf). No zoom-resistance switch: its
    // label scales with the map (see circleLabelScale).
    // Colour is a real control here, unlike a point's fixed ink: a point's
    // name hangs OUTSIDE a 10px pin, while a circle's sits inside a filled
    // disc the user colours, so black is not always readable.
    CIRCLE: ['fill', 'textColor', 'textSize', 'textFont'],
    // Bitmap: nothing to stroke or fill, only dim. Ported from craftbase.
    IMAGE: ['opacity'],
    // GROUP: union of every property — toolbar shows them all when a group is
    // focused. applyGroupProperty silently skips children whose element type
    // doesn't accept a given property.
    GROUP: [
        'fill',
        'stroke',
        'strokeWidth',
        'strokeType',
        'textColor',
        'textSize',
        'textFont',
        'opacity',
    ],
}

// Element names, rendered as "Styling: <name>" in the panel header.
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
    // Active tool from the toolbar (e.g. 'route'/'area'/'point' while a geo
    // draw is in progress, before any vertex/element is selected).
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
    // A focused group beats every other mode — show the union toolbar.
    if (selectedGroup) return 'GROUP'
    if (isRubberMode) return null
    if (isPencilMode) return 'PENCIL'
    if (selectedComponent) {
        const shapeType = selectedComponent?.shape?.type
        const elementType =
            selectedComponent?.group?.data?.elementData?.componentType
        // Placed map objects first: area/route are path-typed and a point's
        // circle would otherwise read as a plain shape and offer controls it
        // has no use for.
        if (elementType === 'point') return 'POINT'
        if (elementType === 'area') return 'AREA'
        if (elementType === 'route') return 'ROUTE'
        if (elementType === 'circle') return 'CIRCLE'
        // Its frame is a plain rectangle path; route it before anything that
        // keys off the shape type.
        if (elementType === 'image') return 'IMAGE'
        // Both spellings are checked because `shape.type` is set from
        // elementData.componentType for a selection made on the canvas, while
        // the elementType fallback covers the paths that don't populate it.
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
    // Draw modes: the toolbar tool is active but nothing is selected yet.
    // Surface the property panel so stroke edits seed the next draw — the same
    // way pencil mode shows the pencil panel before the first stroke.
    // Point is excluded: its category lives in the toolbar drawer, not here.
    if (currentElement === 'area') return 'AREA'
    if (currentElement === 'route') return 'ROUTE'
    if (currentElement === 'circle') return 'CIRCLE'
    // No selection and no active tool — hide the panel. Defaults still apply
    // to the next-created shape (the `useElementDefaults` state is unchanged);
    // users edit them by selecting a shape, which auto-syncs the default per
    // createApplyProperty.
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
    // Group mode: walk the group's children and report common values, falling
    // back to defaults when no child carries the property and to MIXED when
    // children disagree.
    if (setKey === 'GROUP' && selectedGroup) {
        const inspected = inspectGroupValues(selectedGroup, defaults)
        // textSize is stored numeric in properties; map to the toolbar label.
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
        // Pure default mode — pencil/arrow/shape all share the same defaults.
        return {
            fill: defaults.defaultFill,
            stroke: defaults.defaultStrokeColor,
            linewidth: defaults.defaultLinewidth,
            strokeType: defaults.defaultStrokeType ?? 'solid',
            opacity: defaults.defaultOpacity ?? 1,
            textColor: defaults.defaultTextColor,
            textSize: defaults.defaultTextSize,
            textFontFamily: defaults.defaultTextFontFamily,
            zoomResistant: true,
        }
    }

    const shapeData = selectedComponent?.shape?.data
    const elementData = selectedComponent?.group?.data?.elementData
    const textData = selectedComponent?.text?.data

    // For rectangle-with-text + plain text, the text properties live in
    // different places. Resolve here so the rest is symmetric.
    const isText = isStandaloneTextType(selectedComponent?.shape?.type)
    const textNode = isText ? shapeData : textData

    // A point's label is a bare Two.Text in its group and a circle's is a
    // sub-group of them — neither is a text layer, so `textNode` is empty for
    // both. Their size and font are per record, off the SAME (point) ladder,
    // never the live defaults. Both are annotations hanging off a mark; the
    // whiteboard ladder's smallest step already overshoots for either.
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
        // Opacity lives in the top-level `opacity` field (legacy rows fall
        // back to properties.opacity).
        opacity: readOpacity(elementData),
        // A circle's label ink is a COLUMN (see circleLabelColorOf), and its
        // line nodes never reach `textData` — so neither generic arm resolves
        // it. Falls back to the design default, not the live text default: an
        // untouched circle reads as the black it actually paints.
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
        // Per record, off the element's own row — never a default. Absent/null
        // means the column was never written, which reads as zoom-resistant.
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
    // The ladder to offer. Defaults to the whiteboard's; a point passes its own
    // (POINT_LABEL_SIZES), which is tighter and starts smaller.
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
    // Self-hosted faces (src/styles/fonts.css). These spellings are persisted
    // verbatim into `properties.textFontFamily`, so they must match the
    // @font-face family names exactly.
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

// Map text only. Checked (the default for every record) counter-scales the
// label so it holds a constant on-screen size across the map's 18 zoom stops;
// unchecked drops it to resist 0, so it grows and shrinks with the geography.
// One row per element — see applyProperty's zoomResistant branch.
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
        applyProperty,
        applyGroupProperty,
        reorderSelected,
        isElementDragging,
        showMobileToolbarPanel,
        // defaults
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
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

    // Mobile-only active segment. Resets to the first tab on any context change
    // / panel re-open below. `availableMobileTabs` clamps this to a tab the
    // current element actually has, so a set without a fill (an arrow, a line)
    // lands on its stroke tab rather than an empty one.
    const [mobileTab, setMobileTab] = useState<MobileTab>('fill')

    const toggleSection = (key: string): void =>
        setExpandedSection((prev) => (prev === key ? null : key))

    // Collapse any open color picker + reset the mobile tab to the first group
    // when context changes (new selection, mode switch, panel re-open).
    useEffect(() => {
        setExpandedSection(null)
        setMobileTab('fill')
    }, [setKey, selectedComponent, selectedGroup, showMobileToolbarPanel])

    // Re-sync local UI state whenever the source of truth changes (selection,
    // mode, or any default). Property mutations bump a default, which flows
    // through this effect to refresh the readouts.
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
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
    ])

    if (!setKey) return null
    if (isMobile && !showMobileToolbarPanel) return null
    // Hide while the selected element/group is being dragged/resized so the
    // fixed panel doesn't sit under it mid-interaction; it returns on release.
    if (isElementDragging) return null

    const sections = SETS[setKey as keyof typeof SETS]
    // Reorder controls apply to an actually-selected element (single shape or
    // group). Hidden in pencil mode (armed pencil has no selection to reorder)
    // and in the default/armed-tool panels where nothing is selected yet.
    const showReorder =
        Boolean(selectedComponent || selectedGroup) && !isPencilMode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle =
        (key: string, opts?: { preview?: boolean }) =>
        (val: any): void => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setValues((prev: any) => ({ ...prev, [key]: val }))
            if (selectedGroup) {
                // textSize comes through as a label (e.g. 'M'); resolve to the
                // numeric Two.js size before forwarding to the bulk apply path.
                // The single-element path goes through handleTextSizeChange which
                // does this conversion internally; the group path doesn't, so we
                // do it here.
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

    // Build each property group once, then lay them out differently per device:
    // desktop stacks them all; mobile shows one group at a time via the bottom
    // segmented bar.
    //
    // A group owns its own colour. The three palettes used to be stacked
    // together above every other control, which read as one undifferentiated
    // corridor of swatches and put "Stroke" three rows away from the stroke
    // width it belongs to. Now each palette sits at the head of the section it
    // edits. Mobile is the sharper case: a tab is a complete section, so the
    // stroke tab no longer sends you back to the colours tab mid-edit.
    const fillGroup = sections.includes('fill') ? (
        <div className="pb-2 border-b border-border-panel">
            <div data-section="fill" className="pt-2 px-2">
                <ColorPicker
                    title="Fill"
                    currentColor={values.fill}
                    onChangeComplete={handle('fill')}
                    isExpanded={expandedSection === 'fill'}
                    onToggleExpand={() => toggleSection('fill')}
                    // Map fills run dark; every other fill stays pastel. See
                    // pointFillEssentialShades — the pastels are tuned to sit
                    // behind text, and on CARTO Positron's pale greys they
                    // disappear. A map circle is half-transparent on top of
                    // that, so it needs the saturated row even more than a pin.
                    essentialColors={
                        setKey === 'POINT' || setKey === 'CIRCLE'
                            ? pointFillEssentialShades
                            : fillEssentialShades
                    }
                />
            </div>
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
                    // Live preview while dragging: applies to the scene only
                    // (no store/history write) so the element fades in real
                    // time. The release (handleOnChange) commits.
                    handle('opacity', { preview: true })(arr[0])
                }
                handleOnChange={(arr) => handle('opacity')(arr[0])}
            />
        </div>
    ) : null

    const reorderGroup = showReorder ? (
        <ReorderRow onReorder={reorderSelected} />
    ) : null

    // Mobile: only surface tabs that actually have content for this element.
    // `extras` folds opacity + reorder together (per the mobile spec).
    const availableMobileTabs = MOBILE_TABS.filter(({ key }) => {
        if (key === 'fill') return Boolean(fillGroup)
        if (key === 'stroke') return Boolean(strokeGroup)
        if (key === 'text') return Boolean(textGroup)
        return Boolean(opacityGroup) || Boolean(reorderGroup)
    })
    // Clamp the active tab to one that exists — the state may still point at a
    // tab the previous selection had but this one doesn't.
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
            // While a group is focused, prevent the toolbar from stealing
            // DOM focus on mousedown — the group SVG fires `blur` (and tears
            // itself down) the moment focus moves elsewhere. Clicks still
            // fire normally. Skip text inputs so the hex field in ColorPicker
            // can still receive focus.
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
                          // Anchored to the bottom; cap the height to the space
                          // above so a tall group still scrolls inside the panel
                          // instead of overflowing past the top of the screen.
                          maxHeight: 'calc(100dvh - 70px)',
                      }
                    : { left: '10px', top: '56px', width: '13rem' }
            }
        >
            <div className="w-full px-2 font-semibold text-xs pt-1 pb-1 border-b border-border-panel text-ink-muted shrink-0">
                Styling: {SET_LABELS[setKey as keyof typeof SET_LABELS]}
            </div>

            {/* Mobile only: the legend-preset picker, which on desktop is its
                own strip under the primary toolbar. A phone's bottom band
                already carries the toolbar, the undo/redo row and the draw
                controls, so it goes here instead — next to the style controls
                a preset overrides, which is arguably where it belongs anyway.
                Renders nothing when the selection takes no preset. */}
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
                    {/* Content for the active segment, scrollable if tall. */}
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
