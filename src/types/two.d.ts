import 'two.js'

declare module 'two.js' {
    interface Group {
        subtractions: import('two.js').Element[]
        _flagSubtractions: boolean
    }

    interface Scene extends Group {}

    interface Renderer {
        elem: SVGElement
    }

    interface Two {
        renderer: Renderer
    }
}

declare module 'two.js/extras/jsm/zui' {
    import type { Two } from 'two.js'

    export class ZUI {
        constructor(group: Two['scene'], domElement?: HTMLElement)
        scale: number
        translateSurface(x: number, y: number): void
        zoomBy(byF: number, clientX: number, clientY: number): void
        zoomSet(scale: number, clientX: number, clientY: number): void
        clientToSurface(x: number, y: number): { x: number; y: number }
        surfaceToClient(v: { x: number; y: number }): { x: number; y: number }
        addLimits(min: number, max: number): this
        reset(): void
    }
}
