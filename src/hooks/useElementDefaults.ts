import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { DEFAULT_TEXT_FONT_FAMILY } from '../constants/misc'

const STORAGE_KEY = 'mapcursor:elementDefaults'

export type TextSizeLabel = 'S' | 'M' | 'L' | 'XL'

export interface ElementDefaultsState {
    defaultFill: string
    defaultStrokeColor: string
    defaultLinewidth: number
    defaultStrokeType: string | null
    defaultFillType: string | null
    defaultOpacity: number
    defaultTextColor: string
    defaultTextSize: TextSizeLabel
    defaultTextFontFamily: string
}

const INITIAL_DEFAULTS: ElementDefaultsState = {
    defaultFill: '#FFFFFF',
    defaultStrokeColor: '#000',
    defaultLinewidth: 2,
    defaultStrokeType: null,
    defaultFillType: null,
    defaultOpacity: 1,
    defaultTextColor: '#000',
    defaultTextSize: 'S',
    defaultTextFontFamily: DEFAULT_TEXT_FONT_FAMILY,
}

function loadFromStorage(): ElementDefaultsState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return INITIAL_DEFAULTS
        const parsed = JSON.parse(raw) as Partial<ElementDefaultsState>
        return { ...INITIAL_DEFAULTS, ...parsed }
    } catch {
        return INITIAL_DEFAULTS
    }
}

export interface ElementDefaultsApi extends ElementDefaultsState {
    setDefaultFill: Dispatch<SetStateAction<string>>
    setDefaultStrokeColor: Dispatch<SetStateAction<string>>
    setDefaultLinewidth: Dispatch<SetStateAction<number>>
    setDefaultStrokeType: Dispatch<SetStateAction<string | null>>
    setDefaultFillType: Dispatch<SetStateAction<string | null>>
    setDefaultOpacity: Dispatch<SetStateAction<number>>
    setDefaultTextColor: Dispatch<SetStateAction<string>>
    setDefaultTextSize: Dispatch<SetStateAction<TextSizeLabel>>
    setDefaultTextFontFamily: Dispatch<SetStateAction<string>>
    setDefaultFillInBase: (val: string) => void
    setDefaultStrokeColorInBase: (val: string) => void
    setDefaultLinewidthInBase: (val: number) => void
    setDefaultStrokeTypeInBase: (val: string | null) => void
    setDefaultOpacityInBase: (val: number) => void
    setDefaultTextColorInBase: (val: string) => void
    setDefaultTextSizeInBase: (val: TextSizeLabel) => void
    setDefaultTextFontFamilyInBase: (val: string) => void
    resetDefaults: () => void
}

export function useElementDefaults(): ElementDefaultsApi {
    const initial = loadFromStorage()

    const [defaultFill, setDefaultFill] = useState(initial.defaultFill)
    const [defaultStrokeColor, setDefaultStrokeColor] = useState(
        initial.defaultStrokeColor
    )
    const [defaultLinewidth, setDefaultLinewidth] = useState(
        initial.defaultLinewidth
    )
    const [defaultStrokeType, setDefaultStrokeType] = useState<string | null>(
        initial.defaultStrokeType
    )
    const [defaultFillType, setDefaultFillType] = useState<string | null>(
        initial.defaultFillType
    )
    const [defaultOpacity, setDefaultOpacity] = useState(initial.defaultOpacity)

    const [defaultTextColor, setDefaultTextColor] = useState(
        initial.defaultTextColor
    )
    const [defaultTextSize, setDefaultTextSize] = useState<TextSizeLabel>(
        initial.defaultTextSize
    )
    const [defaultTextFontFamily, setDefaultTextFontFamily] = useState(
        initial.defaultTextFontFamily
    )

    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    defaultFill,
                    defaultStrokeColor,
                    defaultLinewidth,
                    defaultStrokeType,
                    defaultFillType,
                    defaultOpacity,
                    defaultTextColor,
                    defaultTextSize,
                    defaultTextFontFamily,
                })
            )
        } catch {}
    }, [
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

    const setDefaultLinewidthInBase = (val: number): void =>
        setDefaultLinewidth(val)
    const setDefaultStrokeTypeInBase = (val: string | null): void =>
        setDefaultStrokeType(val)
    const setDefaultFillInBase = (val: string): void => setDefaultFill(val)
    const setDefaultStrokeColorInBase = (val: string): void =>
        setDefaultStrokeColor(val)
    const setDefaultOpacityInBase = (val: number): void =>
        setDefaultOpacity(val)
    const setDefaultTextColorInBase = (val: string): void =>
        setDefaultTextColor(val)
    const setDefaultTextSizeInBase = (val: TextSizeLabel): void =>
        setDefaultTextSize(val)
    const setDefaultTextFontFamilyInBase = (val: string): void =>
        setDefaultTextFontFamily(val)

    const resetDefaults = (): void => {
        setDefaultFill(INITIAL_DEFAULTS.defaultFill)
        setDefaultStrokeColor(INITIAL_DEFAULTS.defaultStrokeColor)
        setDefaultLinewidth(INITIAL_DEFAULTS.defaultLinewidth)
        setDefaultStrokeType(INITIAL_DEFAULTS.defaultStrokeType)
        setDefaultFillType(INITIAL_DEFAULTS.defaultFillType)
        setDefaultOpacity(INITIAL_DEFAULTS.defaultOpacity)
        setDefaultTextColor(INITIAL_DEFAULTS.defaultTextColor)
        setDefaultTextSize(INITIAL_DEFAULTS.defaultTextSize)
        setDefaultTextFontFamily(INITIAL_DEFAULTS.defaultTextFontFamily)
    }

    return {
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultFillType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
        setDefaultFill,
        setDefaultStrokeColor,
        setDefaultLinewidth,
        setDefaultStrokeType,
        setDefaultFillType,
        setDefaultOpacity,
        setDefaultTextColor,
        setDefaultTextSize,
        setDefaultTextFontFamily,
        setDefaultFillInBase,
        setDefaultStrokeColorInBase,
        setDefaultLinewidthInBase,
        setDefaultStrokeTypeInBase,
        setDefaultOpacityInBase,
        setDefaultTextColorInBase,
        setDefaultTextSizeInBase,
        setDefaultTextFontFamilyInBase,
        resetDefaults,
    }
}
