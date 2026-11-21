import { HANDLE_STROKE } from '../constants/misc'

export { HANDLE_STROKE }

export const SELECTION_HANDLE_FILL = '#FFFFFF'

export const SELECTION_BOX_LINEWIDTH_PX = 1.5

export const SELECTION_HANDLE_LINEWIDTH_PX = 1.5

const SELECTION_HANDLE_RADIUS_PX_MOUSE = 5
const SELECTION_HANDLE_RADIUS_PX_TOUCH = 7
const SELECTION_HANDLE_HIT_RADIUS_PX_MOUSE = 5
const SELECTION_HANDLE_HIT_RADIUS_PX_TOUCH = 11

function isCoarsePointer(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(pointer: coarse)')?.matches === true
    )
}

export function selectionHandleRadiusPx(): number {
    return isCoarsePointer()
        ? SELECTION_HANDLE_RADIUS_PX_TOUCH
        : SELECTION_HANDLE_RADIUS_PX_MOUSE
}

export function selectionHandleHitRadiusPx(): number {
    return isCoarsePointer()
        ? SELECTION_HANDLE_HIT_RADIUS_PX_TOUCH
        : SELECTION_HANDLE_HIT_RADIUS_PX_MOUSE
}

export function getSelectionStroke(): string {
    if (typeof document === 'undefined') return '#14161C'
    const channels = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-ink')
        .trim()
    return channels ? `rgb(${channels})` : '#14161C'
}
