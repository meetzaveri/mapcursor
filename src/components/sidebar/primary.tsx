import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { useQuery } from '@apollo/client'

import ShapesToolbar from './shapesToolbar'
import PlaceSearch from './placeSearch'
import TextZoomHint from '../textZoomHint'
import ToolHint from '../toolHint'
import { GET_COMPONENT_TYPES } from '../../schema/queries'
import SpinnerWithSize from '../common/spinnerWithSize'
import { armedPresetPatch } from '../../utils/armedLegendPreset'
import { isLegendPresetType } from '../../types/legend'
import { generateUUID } from '../../utils/misc'
import { prefetchElementModule } from '../../elementModules'
import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import type { ComponentRecord } from '../../types/base'
import {
    geometryFields,
    pointGeometry,
    setProperties,
} from '../../utils/geometry'
import {
    ELEMENT_DEFAULTS,
    CIRCLE_DEFAULTS,
    CIRCLE_LABEL_COLOR,
    POINT_COLOR,
    POINT_RADIUS,
    DEFAULT_RESIST,
    DRAW_MODE_KEY,
    DRAW_TYPE_KEY,
    DRAW_PROPS_KEY,
    POINT_PLACE_MODE_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    IMAGE_COMPONENT,
    pointLabelSizeFor,
} from '../../constants/misc'

import './sidebar.css'
import { openImageFilePicker } from '../../utils/imageFile'
import { requestImageInsert } from '../../hooks/useImageDrop'
import ChromeReveal from '../common/chromeReveal'
import ShareLinkPopup from './shareLinkPopup'
import MenuDrawer from './menuDrawer'

const DRAW_SHAPE_TYPES = ['circle']

const FALLBACK_CATALOG: Record<
    string,
    { width: number; height: number; fill: string; textColor: string | null }
> = {
    rectangle: { width: 160, height: 160, fill: '#fff', textColor: '#000' },
    circle: { width: 160, height: 160, fill: '#fff', textColor: '#000' },
    diamond: { width: 160, height: 160, fill: '#fff', textColor: '#000' },
    arrowLine: { width: 100, height: 0, fill: 'transparent', textColor: null },
    line: { width: 100, height: 0, fill: 'transparent', textColor: null },
    divider: { width: 100, height: 0, fill: 'transparent', textColor: null },
    text: { width: 120, height: 36, fill: 'transparent', textColor: '#3A342C' },
}

interface PrimarySidebarProps {
    chromeShown: boolean
}

const PrimarySidebar = ({ chromeShown }: PrimarySidebarProps): ReactElement => {
    const {
        baseId,
        updateLastAddedElement,
        togglePointer,
        togglePencilMode,
        togglePanMode,
        addToLocalComponentStore,
        enableTextDrawMode,
        setArrowDrawModeInBase,
        setRubberModeInBase,
        cancelPendingElement,
        defaultLinewidth,
        defaultStrokeType,
        defaultFill,
        defaultStrokeColor,
        defaultTextFontFamily,
        defaultTextSize,
    } = useBaseContext()
    const [hintText, setHintText] = useState(
        'Click anywhere to place element there.'
    )
    const { loading: getComponentTypesLoading, data: getComponentTypesData } =
        useQuery(GET_COMPONENT_TYPES)

    useEffect(() => {
        if (
            !getComponentTypesLoading &&
            getComponentTypesData &&
            getComponentTypesData.componentTypes.length < 1
        ) {
            console.error(
                'Error : The component types are not available from the DB. Hint: Please check if component types seeds are already populated in component type table in DB '
            )
        }
    }, [getComponentTypesData, getComponentTypesLoading])

    const handleArrowElement = (label: string): void => {
        togglePencilMode(false)
        togglePointer(false)

        const savingEl = document.getElementById('show-saving-loader')
        if (savingEl) {
            savingEl.style.opacity = '1'
            savingEl.style.zIndex = '1'
        }

        setTimeout(() => {
            if (savingEl) {
                savingEl.style.opacity = '0'
                savingEl.style.zIndex = '-1'
            }
        }, 100)

        let shapeData: ComponentRecord | null = null
        const generateId = generateUUID()

        if (getComponentTypesData) {
            getComponentTypesData.componentTypes.forEach((item) => {
                if (item.label === label) {
                    const userId = localStorage.getItem('userId')
                    shapeData = {
                        id: generateId,
                        componentType: label,
                        linewidth: defaultLinewidth,
                        strokeType: defaultStrokeType,
                        stroke: defaultStrokeColor ?? '#3A342C',
                        children: {},
                        ...geometryFields(pointGeometry(-9999, -9999), {
                            ...((item.metadata as Record<string, unknown>) ??
                                {}),
                            opacity: 1,
                            ...(defaultTextFontFamily && {
                                textFontFamily: defaultTextFontFamily,
                            }),
                        }),
                        x1: 0,
                        x2: 0,
                        y1: 0,
                        y2: 0,
                        baseId,
                        baseName: null,
                        isDummy: null,
                        createdAt: null,
                        width: item.width ?? 120,
                        height: item.height ?? 120,
                        fill: item.fill ?? '#f4f4f2',
                        textColor: item.textColor ?? null,
                        updatedBy: userId,
                    }
                }
            })
        }

        if (!shapeData && FALLBACK_CATALOG[label]) {
            const userId = localStorage.getItem('userId')
            const fb = FALLBACK_CATALOG[label]
            shapeData = {
                id: generateId,
                componentType: label,
                linewidth: defaultLinewidth,
                strokeType: defaultStrokeType,
                stroke: defaultStrokeColor ?? '#3A342C',
                children: {},
                ...geometryFields(pointGeometry(-9999, -9999), {
                    opacity: 1,
                    ...(defaultTextFontFamily && {
                        textFontFamily: defaultTextFontFamily,
                    }),
                }),
                x1: 0,
                x2: 0,
                y1: 0,
                y2: 0,
                baseId,
                baseName: null,
                isDummy: null,
                createdAt: null,
                width: fb.width,
                height: fb.height,
                fill: fb.fill,
                textColor: fb.textColor,
                updatedBy: userId,
            }
        }

        if (!shapeData) return

        updateLastAddedElement(shapeData)
        const root = document.getElementById('main-two-root')
        if (root) root.style.cursor = 'crosshair'
        localStorage.setItem('arrowDrawMode', 'true')
        localStorage.setItem('lastAddedElementId', generateId)
        setArrowDrawModeInBase(true)
        addToLocalComponentStore(
            (shapeData as ComponentRecord).id,
            (shapeData as ComponentRecord).componentType,
            shapeData
        )
    }

    const handleTextElement = (): void => {
        const savingEl = document.getElementById('show-saving-loader')
        if (savingEl) {
            savingEl.style.opacity = '1'
            savingEl.style.zIndex = '1'
        }

        setTimeout(() => {
            if (savingEl) {
                savingEl.style.opacity = '0'
                savingEl.style.zIndex = '-1'
            }
        }, 100)

        enableTextDrawMode()
    }

    const handlePointElement = (): void => {
        togglePencilMode(false)
        togglePointer(false)

        const userId = localStorage.getItem('userId')
        const generateId = generateUUID()
        const geoDef = ELEMENT_DEFAULTS.point

        const shapeData: ComponentRecord = {
            id: generateId,
            componentType: 'point',
            linewidth: geoDef.linewidth,
            strokeType: null,
            stroke: POINT_COLOR,
            children: {},
            ...geometryFields(pointGeometry(-9999, -9999), {
                label: '',
                resist: DEFAULT_RESIST,
                textFontSize: pointLabelSizeFor(defaultTextSize),
                ...(defaultTextFontFamily && {
                    textFontFamily: defaultTextFontFamily,
                }),
            }),
            x1: 0,
            x2: 0,
            y1: 0,
            y2: 0,
            baseId,
            baseName: null,
            isDummy: null,
            createdAt: null,
            width: POINT_RADIUS * 2,
            height: POINT_RADIUS * 2,
            fill: POINT_COLOR,
            textColor: null,
            updatedBy: userId,
            ...armedPresetPatch('point'),
        }

        updateLastAddedElement(shapeData)
        localStorage.setItem(POINT_PLACE_MODE_KEY, 'true')
        localStorage.setItem(LAST_ADDED_ELEMENT_ID_KEY, generateId)
        addToLocalComponentStore(
            shapeData.id,
            shapeData.componentType,
            shapeData
        )
        const root = document.getElementById('main-two-root')
        if (root) root.style.cursor = 'crosshair'
    }

    const handleMultiClickDraw = (label: 'area' | 'route'): void => {
        togglePencilMode(false)
        togglePointer(false)

        const def = ELEMENT_DEFAULTS[label]
        const baseProps = {
            componentType: label,
            stroke: def.stroke,
            linewidth: def.linewidth,
            strokeType: null,
            fill: 'transparent',
            baseId,
            baseName: null,
            textColor: null,
            updatedBy: localStorage.getItem('userId'),
        }

        localStorage.setItem(DRAW_MODE_KEY, 'true')
        localStorage.setItem(DRAW_TYPE_KEY, label)
        localStorage.setItem(DRAW_PROPS_KEY, JSON.stringify(baseProps))
        const root = document.getElementById('main-two-root')
        if (root) root.style.cursor = 'crosshair'

        window.dispatchEvent(new CustomEvent('multiClickDrawStart'))
    }

    const addElement = (label: string): void => {
        if (label === IMAGE_COMPONENT) {
            prefetchElementModule(IMAGE_COMPONENT)
            void openImageFilePicker().then((files) => {
                if (files.length > 0) requestImageInsert(files)
            })
            return
        }
        if (DRAW_SHAPE_TYPES.includes(label)) {
            prefetchElementModule(label)
        }
        cancelPendingElement()
        if (label !== 'rubber') setRubberModeInBase(false)
        if (label !== 'pan') togglePanMode(false)
        switch (label) {
            case 'pointer':
                togglePointer(true)
                break
            case 'pan':
                togglePanMode(true)
                break
            case 'pencil':
                togglePencilMode(true)
                break
            case 'rubber':
                togglePencilMode(false)
                togglePointer(false)
                setRubberModeInBase(true)
                break
            case 'text':
                handleTextElement()
                break
            case 'point':
                handlePointElement()
                break
            case 'area':
            case 'route':
                handleMultiClickDraw(label)
                break
            default: {
                togglePencilMode(false)
                togglePointer(false)

                const savingEl = document.getElementById('show-saving-loader')
                if (savingEl) {
                    savingEl.style.opacity = '1'
                    savingEl.style.zIndex = '1'
                }

                setTimeout(() => {
                    const clickEl = document.getElementById(
                        'show-click-anywhere-btn'
                    )
                    if (!DRAW_SHAPE_TYPES.includes(label)) {
                        setHintText('Click anywhere to place element there.')
                        if (clickEl) clickEl.style.opacity = '1'
                    }
                    if (savingEl) {
                        savingEl.style.opacity = '0'
                        savingEl.style.zIndex = '-1'
                    }
                }, 100)

                let shapeData: ComponentRecord | null = null
                const randomNumber = Math.floor(Math.random() * 80 + 30)
                const generateId = generateUUID()

                if (getComponentTypesData) {
                    getComponentTypesData.componentTypes.forEach((item) => {
                        if (item.label === label) {
                            const userId = localStorage.getItem('userId')
                            const useShapeFill =
                                DRAW_SHAPE_TYPES.includes(label)
                            shapeData = {
                                id: generateId,
                                componentType: label,
                                linewidth: defaultLinewidth,
                                strokeType: defaultStrokeType,
                                stroke: defaultStrokeColor ?? '#3A342C',
                                children: {},
                                ...geometryFields(
                                    pointGeometry(
                                        Math.floor(
                                            window.outerWidth -
                                                (randomNumber *
                                                    window.outerWidth) /
                                                    100
                                        ),
                                        Math.floor(
                                            window.outerHeight -
                                                (randomNumber *
                                                    window.outerHeight) /
                                                    100
                                        )
                                    ),
                                    {
                                        ...((item.metadata as Record<
                                            string,
                                            unknown
                                        >) ?? {}),
                                        opacity: 1,
                                        ...(defaultTextFontFamily && {
                                            textFontFamily:
                                                defaultTextFontFamily,
                                        }),
                                    }
                                ),
                                x1: 0,
                                x2: label.includes('divider') ? 100 : 0,
                                y1: 0,
                                y2: 0,
                                baseId,
                                baseName: null,
                                isDummy: null,
                                createdAt: null,
                                width: item.width ?? 120,
                                height: item.height ?? 120,
                                fill: useShapeFill
                                    ? (defaultFill ?? item.fill ?? '#f4f4f2')
                                    : (item.fill ?? '#f4f4f2'),
                                textColor: item.textColor ?? null,
                                updatedBy: userId,
                            }
                        }
                    })
                }

                if (!shapeData && FALLBACK_CATALOG[label]) {
                    const userId = localStorage.getItem('userId')
                    const fb = FALLBACK_CATALOG[label]
                    const useShapeFill = DRAW_SHAPE_TYPES.includes(label)
                    shapeData = {
                        id: generateId,
                        componentType: label,
                        linewidth: defaultLinewidth,
                        strokeType: defaultStrokeType,
                        stroke: defaultStrokeColor ?? '#3A342C',
                        children: {},
                        ...geometryFields(
                            pointGeometry(
                                Math.floor(
                                    window.outerWidth -
                                        (randomNumber * window.outerWidth) / 100
                                ),
                                Math.floor(
                                    window.outerHeight -
                                        (randomNumber * window.outerHeight) /
                                            100
                                )
                            ),
                            {
                                opacity: 1,
                                ...(defaultTextFontFamily && {
                                    textFontFamily: defaultTextFontFamily,
                                }),
                            }
                        ),
                        x1: 0,
                        x2: label.includes('divider') ? 100 : 0,
                        y1: 0,
                        y2: 0,
                        baseId,
                        baseName: null,
                        isDummy: null,
                        createdAt: null,
                        width: fb.width,
                        height: fb.height,
                        fill: useShapeFill ? (defaultFill ?? fb.fill) : fb.fill,
                        textColor: fb.textColor,
                        updatedBy: userId,
                    }
                }

                if (label === 'circle' && shapeData) {
                    const geoFill = CIRCLE_DEFAULTS.fill
                    shapeData = {
                        ...(shapeData as ComponentRecord),
                        fill: geoFill,
                        stroke: geoFill,
                        linewidth: CIRCLE_DEFAULTS.linewidth,
                        opacity: CIRCLE_DEFAULTS.opacity,
                        textColor: CIRCLE_LABEL_COLOR,
                        ...setProperties(shapeData as ComponentRecord, {
                            label: '',
                            textFontSize: pointLabelSizeFor(defaultTextSize),
                            ...(defaultTextFontFamily && {
                                textFontFamily: defaultTextFontFamily,
                            }),
                        }),
                    }
                }

                if (!shapeData) return

                if (DRAW_SHAPE_TYPES.includes(label)) {
                    localStorage.setItem('pendingShapeType', label)
                    localStorage.setItem(
                        'pendingShapeProps',
                        JSON.stringify({
                            ...shapeData,
                            ...(isLegendPresetType(label)
                                ? armedPresetPatch(label)
                                : {}),
                        })
                    )
                    const root = document.getElementById('main-two-root')
                    if (root) root.style.cursor = 'crosshair'
                } else {
                    updateLastAddedElement(shapeData)
                    localStorage.setItem('lastAddedElementId', generateId)
                    addToLocalComponentStore(
                        (shapeData as ComponentRecord).id,
                        (shapeData as ComponentRecord).componentType,
                        shapeData
                    )
                }
            }
        }
    }
    const { isMobile } = useMediaQueryUtils()
    const isLiveSession = false
    return (
        <>
            <ChromeReveal shown={chromeShown} order={0}>
                <MenuDrawer />
            </ChromeReveal>
            <ChromeReveal shown={chromeShown} order={1}>
                <PlaceSearch />
            </ChromeReveal>
            <ChromeReveal
                shown={chromeShown}
                order={2}
                from={isMobile ? 'bottom' : 'top'}
                deep
            >
                <ShapesToolbar addElement={addElement} />
            </ChromeReveal>
            <div
                id="show-click-anywhere-btn"
                className="fixed w-full flex justify-center top-0 opacity-0
                pointer-events-none transition-opacity ease-out duration-300"
            >
                <div className="w-auto mt-2 bg-hint text-hint-fg px-3 py-2 rounded-card shadow-panel">
                    <div className="flex items-center">
                        <div className="w-auto text-xs leading-snug text-left">
                            {hintText}
                        </div>
                    </div>
                </div>
            </div>
            <ToolHint />
            <TextZoomHint />
            <div className="absolute top-2 right-1rem flex items-center px-2 gap-1">
                <div
                    id="show-saving-loader"
                    className="w-28 h-9 pr-2 transition-all opacity-0"
                    style={{ zIndex: -1 }}
                >
                    <div className="w-auto bg-greens-g400 text-greens-g75 px-4 py-2 rounded-md shadow-md">
                        <div className="flex items-center ">
                            <div className="w-auto text-sm text-left">
                                Saving
                            </div>
                            <div>
                                <SpinnerWithSize
                                    loaderSize="sm"
                                    customStyles={{
                                        margin: 0,
                                        marginLeft: '4px',
                                        borderBottomColor: '#ABF5D1',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {isLiveSession && (
                    <div className="w-9 h-9 text-sm pr-2">
                        <a className="flex items-center px-4 py-2 rounded-card bg-card-bg text-ink">
                            <span className="text-sm ">Live</span>
                            <div className="ml-2  w-2 h-2 bg-reds-r400 rounded-50-percent ">
                                <div className="w-2 h-2 bg-reds-r400 rounded-50-percent animate-ping "></div>
                            </div>
                        </a>
                    </div>
                )}

                <ChromeReveal shown={chromeShown} order={3}>
                    <ShareLinkPopup />
                </ChromeReveal>
            </div>
        </>
    )
}

export default PrimarySidebar
