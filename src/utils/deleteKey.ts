const DELETE_KEY_CODE = 46

export function dispatchDeleteKey(target?: EventTarget | null): void {
    const event = new KeyboardEvent('keydown', {
        key: 'Delete',
        code: 'Delete',
        bubbles: true,
        cancelable: true,
    })
    Object.defineProperty(event, 'keyCode', { get: () => DELETE_KEY_CODE })
    Object.defineProperty(event, 'which', { get: () => DELETE_KEY_CODE })
    ;(target ?? window).dispatchEvent(event)
}
