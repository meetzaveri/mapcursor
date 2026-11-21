import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react'
import {
    staticPrimaryElementData,
    type PrimaryElement,
} from '../../utils/constants'
import { useBaseContext } from '../../views/Base/baseContext'
import { SHAPES_TOOLBAR_ID } from './shapesToolbarId'
import Tooltip from '../common/tooltip'
import UndoIcon from '../../assets/undo_amber.svg?react'
import RedoIcon from '../../assets/redo.svg?react'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { IMAGE_COMPONENT } from '../../constants/misc'
import EraserSizeButtons from './eraserSizeButtons'
import MobileDrawToolbar from './mobileDrawToolbar'
import {
    DRAW_GROUP,
    groupToolsForMobile,
    isDrawTool,
    type DrawTool,
} from './mobileToolGroups'

const allElementsRaw = staticPrimaryElementData.flatMap(
    (section) => section.elements
)

const HOVER_DRAWER_DEFAULT_TOOL: Record<string, string> = {
    lines: 'line',
}

const HOVER_DRAWER_BRIDGE_PX = 6

const DESKTOP_FLATTENED_DRAWERS: ReadonlySet<string> = new Set(['shapes'])

const flattenDrawersForDesktop = (
    elements: readonly PrimaryElement[]
): PrimaryElement[] =>
    elements.flatMap((el) =>
        DESKTOP_FLATTENED_DRAWERS.has(el.elementName)
            ? el.drawerData.map((d) => ({
                  elementName: d.elementName,
                  elementDisplayName: d.elementDisplayName,
                  elementIcon: d.elementIcon,
                  hasDrawer: false,
                  noAction: false,
                  drawerData: [],
              }))
            : [el]
    )

interface ShapesToolbarProps {
    addElement: (label: string) => void
}

interface DrawerAnchor {
    left: number
    top: number
    rectTop: number
}

const ShapesToolbar = ({ addElement }: ShapesToolbarProps): ReactElement => {
    const {
        currentElement,
        setCurrentElementInBase,
        undoLastAction,
        redoLastAction,
        historyLog,
        bucketLog,
        selectedComponent,
        eraserSize,
        setEraserSizeInBase,
        isPersisted,
        showMobileToolbarPanel,
    } = useBaseContext()
    const { isMobile } = useMediaQueryUtils()
    const [openDrawer, setOpenDrawer] = useState<string | null>(null)
    const [drawerAnchor, setDrawerAnchor] = useState<DrawerAnchor | null>(null)
    const drawerRef = useRef<HTMLDivElement | null>(null)
    const homeTool = 'pointer'

    const showEraserSizes = currentElement === 'rubber' && !selectedComponent

    const [lastDrawTool, setLastDrawTool] = useState<DrawTool>(
        DRAW_GROUP.children[0]
    )
    useEffect(() => {
        if (isDrawTool(currentElement)) setLastDrawTool(currentElement)
    }, [currentElement])
    const drawTriggerRef = useRef<HTMLDivElement | null>(null)
    const showDrawToolbar =
        isMobile && isDrawTool(currentElement) && !showMobileToolbarPanel
    const drawTools = allElementsRaw.filter((el) => isDrawTool(el.elementName))

    const pickTool = (tool: string): void => {
        addElement(tool)
        setCurrentElementInBase(tool)
    }

    const allElements = (
        isMobile
            ? groupToolsForMobile(allElementsRaw, lastDrawTool)
            : flattenDrawersForDesktop(allElementsRaw)
    ).filter((el) => !isPersisted || el.elementName !== IMAGE_COMPONENT)

    useEffect(() => {
        setCurrentElementInBase(homeTool)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!openDrawer) return
        const handleClickOutside = (e: MouseEvent): void => {
            if (
                drawerRef.current &&
                !drawerRef.current.contains(e.target as Node)
            ) {
                setOpenDrawer(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return (): void => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [openDrawer])

    const hoverDrawerRef = useRef<HTMLDivElement | null>(null)

    const closeHoverDrawer = (): void =>
        setOpenDrawer((current) =>
            current && current in HOVER_DRAWER_DEFAULT_TOOL ? null : current
        )

    const movingIntoHoverDrawer = (e: ReactMouseEvent): boolean => {
        const to = e.relatedTarget
        return to instanceof Node && !!hoverDrawerRef.current?.contains(to)
    }

    const btnSize = isMobile ? 'w-8 h-8' : 'w-9 h-9'
    const iconSize = isMobile ? 'w-4 h-4' : 'w-5 h-5'
    const tooltipPlacement = isMobile ? 'top' : 'bottom'

    const shapeDrawerElements =
        allElements.find((el) => el.elementName === openDrawer)?.drawerData ??
        []

    const undoButton = (
        <Tooltip label="Undo" placement={tooltipPlacement}>
            <div
                className={`
                    ${btnSize} flex items-center justify-center rounded cursor-pointer
                    transition-all ease-in-out duration-200 text-ink-muted
                    ${historyLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-sidebar hover:text-ink'}
                `}
                onClick={(): void => {
                    if (historyLog.length > 0) {
                        undoLastAction()
                    }
                }}
            >
                <UndoIcon className={iconSize} aria-label="Undo" />
            </div>
        </Tooltip>
    )
    const redoButton = (
        <Tooltip label="Redo" placement={tooltipPlacement}>
            <div
                className={`
                    ${btnSize} flex items-center justify-center rounded cursor-pointer
                    transition-all ease-in-out duration-200 text-ink-muted
                    ${bucketLog.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-sidebar hover:text-ink'}
                `}
                onClick={(): void => {
                    if (bucketLog.length > 0) {
                        redoLastAction()
                    }
                }}
            >
                <RedoIcon className={iconSize} aria-label="Redo" />
            </div>
        </Tooltip>
    )

    return (
        <div ref={drawerRef}>
            {isMobile && (
                <div
                    className="fixed bg-card-bg border border-border-panel shadow-panel rounded-card flex items-center flex-row px-1 py-1 gap-0.5"
                    style={{ bottom: '64px', left: '10px', zIndex: 10 }}
                >
                    {undoButton}
                    {redoButton}
                </div>
            )}
            <div
                id={SHAPES_TOOLBAR_ID}
                className={`fixed bg-card-bg border border-border-panel shadow-panel rounded-card flex items-center flex-row
                    ${isMobile ? 'px-1 py-1 gap-0.5' : 'top-2 left-1/2 px-2 py-1 gap-1'}`}
                style={
                    isMobile
                        ? { bottom: '16px', left: '10px', zIndex: 10 }
                        : { transform: 'translateX(-50%)', zIndex: 10 }
                }
            >
                {allElements.map((element) => {
                    const Icon = element.elementIcon
                    const isDrawGroup =
                        element.elementName === DRAW_GROUP.elementName
                    const isActive =
                        currentElement === element.elementName ||
                        (isDrawGroup && isDrawTool(currentElement)) ||
                        openDrawer === element.elementName ||
                        (element.hasDrawer &&
                            element.drawerData.some(
                                (d) => d.elementName === currentElement
                            ))
                    return (
                        <Tooltip
                            key={element.elementName}
                            label={element.elementDisplayName}
                            placement={tooltipPlacement}
                            disabled={element.hasDrawer}
                        >
                            <div
                                ref={isDrawGroup ? drawTriggerRef : undefined}
                                className={`
                                ${btnSize} flex items-center justify-center rounded cursor-pointer
                                transition-all ease-in-out duration-200
                                ${
                                    isActive
                                        ? 'bg-accent/10 text-accent-dark ring-1 ring-accent/30'
                                        : 'text-ink-muted hover:bg-sidebar hover:text-ink'
                                }
                            `}
                                onMouseEnter={(e): void => {
                                    if (isMobile) return
                                    if (
                                        !(
                                            element.elementName in
                                            HOVER_DRAWER_DEFAULT_TOOL
                                        )
                                    ) {
                                        closeHoverDrawer()
                                        return
                                    }
                                    const rect =
                                        e.currentTarget.getBoundingClientRect()
                                    setDrawerAnchor({
                                        left: rect.left,
                                        top: rect.bottom,
                                        rectTop: rect.top,
                                    })
                                    setOpenDrawer(element.elementName)
                                }}
                                onMouseLeave={(e): void => {
                                    if (isMobile) return
                                    if (movingIntoHoverDrawer(e)) return
                                    closeHoverDrawer()
                                }}
                                onClick={(e): void => {
                                    if (isDrawGroup) {
                                        setOpenDrawer(null)
                                        pickTool(
                                            isDrawTool(currentElement)
                                                ? homeTool
                                                : lastDrawTool
                                        )
                                        return
                                    }
                                    const defaultTool =
                                        HOVER_DRAWER_DEFAULT_TOOL[
                                            element.elementName
                                        ]
                                    if (defaultTool) {
                                        const rect =
                                            e.currentTarget.getBoundingClientRect()
                                        setDrawerAnchor({
                                            left: rect.left,
                                            top: rect.bottom,
                                            rectTop: rect.top,
                                        })
                                        setOpenDrawer(element.elementName)
                                        addElement(defaultTool)
                                        setCurrentElementInBase(defaultTool)
                                        return
                                    }
                                    if (element.hasDrawer) {
                                        const rect =
                                            e.currentTarget.getBoundingClientRect()
                                        setDrawerAnchor({
                                            left: rect.left,
                                            top: rect.bottom,
                                            rectTop: rect.top,
                                        })
                                        const isToggleClose =
                                            openDrawer === element.elementName
                                        setOpenDrawer(
                                            isToggleClose
                                                ? null
                                                : element.elementName
                                        )
                                        setCurrentElementInBase(
                                            isToggleClose
                                                ? homeTool
                                                : element.elementName
                                        )
                                    } else if (
                                        element.elementName === IMAGE_COMPONENT
                                    ) {
                                        setOpenDrawer(null)
                                        addElement(IMAGE_COMPONENT)
                                    } else {
                                        setOpenDrawer(null)
                                        pickTool(element.elementName)
                                    }
                                }}
                            >
                                <Icon
                                    className={iconSize}
                                    aria-label={element.elementDisplayName}
                                />
                            </div>
                        </Tooltip>
                    )
                })}
                {!isMobile && showEraserSizes && (
                    <>
                        <div className="bg-border-panel w-px h-6 mx-1" />
                        <EraserSizeButtons
                            eraserSize={eraserSize}
                            onChange={setEraserSizeInBase}
                            btnSize={btnSize}
                            tooltipPlacement={tooltipPlacement}
                        />
                    </>
                )}
                {!isMobile && (
                    <>
                        <div className="bg-border-panel w-px h-6 mx-1" />
                        {undoButton}
                        {redoButton}
                    </>
                )}
            </div>

            {openDrawer && shapeDrawerElements.length > 0 && drawerAnchor && (
                <div
                    ref={hoverDrawerRef}
                    onMouseLeave={(): void => {
                        if (isMobile) return
                        closeHoverDrawer()
                    }}
                    className="fixed"
                    style={
                        isMobile
                            ? {
                                  bottom:
                                      window.innerHeight -
                                      drawerAnchor.rectTop +
                                      6,
                                  left: drawerAnchor.left,
                                  zIndex: 11,
                              }
                            : {
                                  top: drawerAnchor.top,
                                  left: drawerAnchor.left,
                                  paddingTop: HOVER_DRAWER_BRIDGE_PX,
                                  zIndex: 11,
                              }
                    }
                >
                    <div
                        className={`bg-card-bg shadow-panel rounded-card flex items-center flex-row
                        ${isMobile ? 'px-1 py-1 gap-0.5 border border-border-panel' : 'px-2 py-1 gap-1 border border-border-panel'}`}
                    >
                        {shapeDrawerElements.map((item) => {
                            const Icon = item.elementIcon
                            const isActive = currentElement === item.elementName
                            return (
                                <Tooltip
                                    key={item.elementName}
                                    label={item.elementDisplayName}
                                    placement={tooltipPlacement}
                                >
                                    <div
                                        className={`
                                    ${btnSize} flex items-center justify-center rounded cursor-pointer
                                    transition-all ease-in-out duration-200
                                    ${
                                        isActive
                                            ? 'bg-accent/10 text-accent-dark ring-1 ring-accent/30'
                                            : 'text-ink-muted hover:bg-sidebar hover:text-ink'
                                    }
                                `}
                                        onClick={(): void => {
                                            addElement(item.elementName)
                                            setCurrentElementInBase(
                                                item.elementName
                                            )
                                            setOpenDrawer(null)
                                        }}
                                    >
                                        <Icon
                                            className={iconSize}
                                            aria-label={item.elementDisplayName}
                                        />
                                    </div>
                                </Tooltip>
                            )
                        })}
                    </div>
                </div>
            )}

            {showDrawToolbar && isDrawTool(currentElement) && (
                <MobileDrawToolbar
                    triggerRef={drawTriggerRef}
                    tools={drawTools}
                    currentTool={currentElement}
                    onPick={pickTool}
                    showEraserSizes={showEraserSizes}
                    eraserSize={eraserSize}
                    onEraserSizeChange={setEraserSizeInBase}
                    btnSize={btnSize}
                    iconSize={iconSize}
                />
            )}
        </div>
    )
}

export default ShapesToolbar
