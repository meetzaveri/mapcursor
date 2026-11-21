import { useState, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
    RUBBER_MODE_KEY,
    ARROW_DRAW_MODE_KEY,
    TEXT_DRAW_MODE_KEY,
    PENDING_SHAPE_TYPE_KEY,
    PENDING_SHAPE_PROPS_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    PENCIL_MODE_KEY,
    PAN_MODE_KEY,
    ERASER_SIZE_KEY,
    DEFAULT_ERASER_SIZE,
    ERASER_SIZES,
    type EraserSize,
} from '../constants/misc'

export interface DrawingModeToggleOptions {
    cancelPendingElement?: () => void
    setSelectedComponent?: (component: unknown) => void
    toggleToolbar?: (open: boolean) => void
}

export interface DrawingModesApi {
    pointerToggle: boolean
    setPointerToggle: Dispatch<SetStateAction<boolean>>
    isPencilMode: boolean
    setPencilMode: Dispatch<SetStateAction<boolean>>
    isArrowDrawMode: boolean
    setIsArrowDrawMode: Dispatch<SetStateAction<boolean>>
    isTextDrawMode: boolean
    setIsTextDrawMode: Dispatch<SetStateAction<boolean>>
    isRubberMode: boolean
    eraserSize: EraserSize
    isPanMode: boolean
    setPanMode: Dispatch<SetStateAction<boolean>>
    togglePointer: (
        pointerVal: boolean,
        options?: DrawingModeToggleOptions
    ) => void
    togglePencilMode: (
        value: boolean,
        options?: Pick<
            DrawingModeToggleOptions,
            'cancelPendingElement' | 'toggleToolbar'
        >
    ) => void
    togglePanMode: (
        value: boolean,
        options?: DrawingModeToggleOptions
    ) => void
    setRubberModeInBase: (val: boolean) => void
    setEraserSizeInBase: (val: EraserSize) => void
    setArrowDrawModeInBase: (val: boolean) => void
    setTextDrawModeInBase: (val: boolean) => void
    clearDrawModesFromStorage: () => void
}

export function useDrawingModes(): DrawingModesApi {
    const [pointerToggle, setPointerToggle] = useState(false)
    const [isPencilMode, setPencilMode] = useState(false)
    const [isArrowDrawMode, setIsArrowDrawMode] = useState(false)
    const [isTextDrawMode, setIsTextDrawMode] = useState(false)
    const [isRubberMode, setIsRubberMode] = useState<boolean>(() => {
        try {
            return localStorage.getItem(RUBBER_MODE_KEY) === 'true'
        } catch {
            return false
        }
    })
    const [isPanMode, setPanMode] = useState<boolean>(() => {
        try {
            return localStorage.getItem(PAN_MODE_KEY) === 'true'
        } catch {
            return false
        }
    })
    const [eraserSize, setEraserSize] = useState<EraserSize>(() => {
        try {
            const stored = localStorage.getItem(ERASER_SIZE_KEY)
            return (ERASER_SIZES as string[]).includes(stored ?? '')
                ? (stored as EraserSize)
                : DEFAULT_ERASER_SIZE
        } catch {
            return DEFAULT_ERASER_SIZE
        }
    })

    const togglePointer: DrawingModesApi['togglePointer'] = (
        pointerVal,
        { cancelPendingElement, setSelectedComponent, toggleToolbar } = {}
    ) => {
        setPointerToggle(pointerVal)
        setPencilMode(false)
        if (pointerVal) {
            cancelPendingElement?.()
            setSelectedComponent?.(null)
            toggleToolbar?.(false)
            setIsRubberMode(false)
            setPanMode(false)
            try {
                localStorage.removeItem(RUBBER_MODE_KEY)
                localStorage.removeItem(PAN_MODE_KEY)
            } catch {
            }
            const el = document.getElementById('main-two-root')
            if (el) el.style.cursor = 'default'
        }
    }

    const togglePencilMode: DrawingModesApi['togglePencilMode'] = (
        value,
        { cancelPendingElement, toggleToolbar } = {}
    ) => {
        toggleToolbar?.(false)
        setPencilMode(value)
        if (value) {
            cancelPendingElement?.()
            setIsRubberMode(false)
            setPanMode(false)
            try {
                localStorage.removeItem(RUBBER_MODE_KEY)
                localStorage.removeItem(PAN_MODE_KEY)
            } catch {
            }
            localStorage.setItem(PENCIL_MODE_KEY, 'TRUE')
            const el = document.getElementById('main-two-root')
            if (el) el.style.cursor = 'crosshair'
        } else {
            localStorage.removeItem(PENCIL_MODE_KEY)
        }
    }

    const togglePanMode: DrawingModesApi['togglePanMode'] = (
        value,
        { cancelPendingElement, setSelectedComponent, toggleToolbar } = {}
    ) => {
        setPanMode(value)
        const root = document.getElementById('main-two-root')
        if (value) {
            cancelPendingElement?.()
            setSelectedComponent?.(null)
            toggleToolbar?.(false)
            setPencilMode(false)
            setIsRubberMode(false)
            try {
                localStorage.setItem(PAN_MODE_KEY, 'true')
                localStorage.removeItem(PENCIL_MODE_KEY)
                localStorage.removeItem(RUBBER_MODE_KEY)
                localStorage.removeItem(ARROW_DRAW_MODE_KEY)
                localStorage.removeItem(TEXT_DRAW_MODE_KEY)
                localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
                localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)
            } catch {
            }
            if (root) root.style.cursor = 'grab'
            try {
                window.dispatchEvent(new CustomEvent('clearSelector', {}))
            } catch {
            }
        } else {
            try {
                localStorage.removeItem(PAN_MODE_KEY)
            } catch {
            }
            if (root) root.style.cursor = 'default'
        }
    }

    const setRubberModeInBase = (val: boolean): void => {
        setIsRubberMode(!!val)
        if (val) {
            setPanMode(false)
            try {
                localStorage.removeItem(PAN_MODE_KEY)
            } catch {
            }
            localStorage.setItem(RUBBER_MODE_KEY, 'true')
            const el = document.getElementById('main-two-root')
            if (el) el.style.cursor = 'crosshair'
        } else {
            localStorage.removeItem(RUBBER_MODE_KEY)
            const el = document.getElementById('main-two-root')
            if (el) el.style.cursor = 'default'
        }
    }

    const setEraserSizeInBase = (val: EraserSize): void => {
        setEraserSize(val)
        try {
            localStorage.setItem(ERASER_SIZE_KEY, val)
        } catch {
        }
    }

    const setArrowDrawModeInBase = (val: boolean): void =>
        setIsArrowDrawMode(val)
    const setTextDrawModeInBase = (val: boolean): void =>
        setIsTextDrawMode(val)

    useEffect(() => {
        const root = document.getElementById('main-two-root')
        if (!root) return
        const active = isPencilMode || isArrowDrawMode || isRubberMode
        root.classList.toggle('draw-mode-active', active)
        root.classList.toggle('pan-mode-active', isPanMode)
    }, [isPencilMode, isArrowDrawMode, isRubberMode, isPanMode])

    const clearDrawModesFromStorage = (): void => {
        localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
        localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)
        localStorage.removeItem(ARROW_DRAW_MODE_KEY)
        localStorage.removeItem(TEXT_DRAW_MODE_KEY)
        localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
        localStorage.removeItem(RUBBER_MODE_KEY)
        localStorage.removeItem(PAN_MODE_KEY)
        setIsRubberMode(false)
        setPanMode(false)
    }

    return {
        pointerToggle,
        setPointerToggle,
        isPencilMode,
        setPencilMode,
        isArrowDrawMode,
        setIsArrowDrawMode,
        isTextDrawMode,
        setIsTextDrawMode,
        isRubberMode,
        eraserSize,
        isPanMode,
        setPanMode,
        togglePointer,
        togglePencilMode,
        togglePanMode,
        setRubberModeInBase,
        setEraserSizeInBase,
        setArrowDrawModeInBase,
        setTextDrawModeInBase,
        clearDrawModesFromStorage,
    }
}
