import { geometryOrigin } from '../utils/geometry'
import type { GeometrySource } from '../utils/geometry'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any

export default class Main<P = unknown> {
    two: TwoLike
    x: number
    y: number
    properties: P

    constructor(instance: TwoLike, x: number, y: number, properties: P) {
        this.two = instance
        const origin = geometryOrigin(properties as GeometrySource)
        this.x = origin ? origin.x : x
        this.y = origin ? origin.y : y
        this.properties = properties
    }
}
