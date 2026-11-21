export const elementModules = import.meta.glob('./components/elements/*.tsx')

const inFlight = new Map<string, Promise<unknown>>()

export function prefetchElementModule(componentType: string): void {
    const key = `./components/elements/${componentType}.tsx`
    const loader = elementModules[key]
    if (!loader) return
    if (inFlight.has(key)) return
    inFlight.set(key, loader().catch(() => undefined))
}
