import type { RandomUsername } from '../types/base'
import { isInSelectionChrome } from './canvasChrome'

export const isMac: boolean =
    typeof navigator !== 'undefined' &&
    /mac|iphone|ipad|ipod/i.test(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).userAgentData?.platform || navigator.platform || ''
    )

export const PRIMARY_MOD_LABEL: string = isMac ? '⌘' : 'Ctrl'

export function strokeTypeToDashes(
    strokeType: string | null | undefined
): number[] {
    if (strokeType === 'dashed') return [8]
    if (strokeType === 'dotted') return [4]
    return []
}

const AREA_FILL_ALPHA = 0.5

export function strokeToAreaFill(
    stroke: string | null | undefined,
    alpha: number = AREA_FILL_ALPHA
): string {
    if (!stroke) return `rgba(0,0,0,${alpha})`
    const hex = stroke.trim()

    const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex)
    const longHex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
    if (shortHex) {
        const r = parseInt(shortHex[1]! + shortHex[1]!, 16)
        const g = parseInt(shortHex[2]! + shortHex[2]!, 16)
        const b = parseInt(shortHex[3]! + shortHex[3]!, 16)
        return `rgba(${r},${g},${b},${alpha})`
    }
    if (longHex) {
        const r = parseInt(longHex[1]!, 16)
        const g = parseInt(longHex[2]!, 16)
        const b = parseInt(longHex[3]!, 16)
        return `rgba(${r},${g},${b},${alpha})`
    }

    const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(hex)
    if (rgb) {
        return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`
    }

    return stroke
}

export function clearDashesOnTwoJSShape(
    shape:
        | {
              _renderer?: { elem?: SVGElement }
          }
        | null
        | undefined
): void {
    if (shape?._renderer?.elem) {
        shape._renderer.elem.removeAttribute('stroke-dasharray')
        shape._renderer.elem.removeAttribute('stroke-dashoffset')
    }
}

export const elementOnBlurHandler = (
    e: FocusEvent | null | undefined,
    selectorInstance: { hide?: () => void } | null | undefined,
    two: { update: () => void }
): void => {
    const blurListenerCB = (innerEvent: FocusEvent): void => {
        const target = innerEvent?.relatedTarget as HTMLElement | null
        if (target?.dataset?.parent === 'floating-toolbar') {
        } else {
            selectorInstance?.hide?.()
        }
    }

    const related = e?.relatedTarget as HTMLElement | null
    if (
        related &&
        related.id !== 'floating-toolbar' &&
        related.dataset?.parent !== 'floating-toolbar' &&
        isInSelectionChrome(related)
    ) {
        return
    }
    if (
        related?.id === 'floating-toolbar' ||
        related?.dataset?.parent === 'floating-toolbar'
    ) {
        document
            .getElementById('floating-toolbar')
            ?.addEventListener('blur', blurListenerCB as EventListener)
    } else {
        selectorInstance?.hide?.()
    }
    two.update()
}

export const generateRandomUsernames = (): RandomUsername => {
    const names = [
        'cake_salad',
        'raspberry_waffle',
        'tropical_owl',
        'high_antopera',
        'banestick_watermelon',
        'zephyr_pomegranate',
        'optimus_prime',
        'network_tea',
        'floral_cake',
        'volcano_bee',
        'hurricane_cat',
        'juice_walrus',
        'groundhog_day',
        'spacex_dragon',
        'icecream_fox',
        'astronout_fly',
        'icecoffee_cat',
        'pumpkin_bat',
        'anonymous_galileo',
        'raspberry_cat',
        'water_rabbit',
        'violet_turtle',
    ]

    const rB = Math.floor(Math.random() * names.length)
    const name = names[rB]!
    const [firstName, lastName] = name.split('_') as [string, string]

    return { nickname: name, firstName, lastName }
}

export const generateUUID = (): string => {
    let d = new Date().getTime()
    let d2 =
        (typeof performance !== 'undefined' &&
            performance.now &&
            performance.now() * 1000) ||
        0
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random() * 16
        if (d > 0) {
            r = ((d + r) % 16) | 0
            d = Math.floor(d / 16)
        } else {
            r = ((d2 + r) % 16) | 0
            d2 = Math.floor(d2 / 16)
        }
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
}
