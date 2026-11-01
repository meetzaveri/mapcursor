// Minimal renderHook for hook tests. @testing-library/react 16 needs
// @testing-library/dom, which this repo doesn't install, so this mounts the
// hook in a real React root instead. Call `unmountAllHooks()` in afterEach: a
// mounted hook keeps its window listeners and would act on the next test.

import { act, createElement } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const mountedRoots: ReturnType<typeof createRoot>[] = []

export function renderHook<T>(
    hook: () => T,
    wrap?: (children: ReactNode) => ReactNode
): { result: { current: T } } {
    const result = { current: undefined as unknown as T }
    const Probe = (): null => {
        result.current = hook()
        return null
    }
    const root = createRoot(document.createElement('div'))
    mountedRoots.push(root)
    act(() => {
        const probe = createElement(Probe)
        root.render(wrap ? wrap(probe) : probe)
    })
    return { result }
}

export function unmountAllHooks(): void {
    act(() => {
        mountedRoots.splice(0).forEach((root) => root.unmount())
    })
}
