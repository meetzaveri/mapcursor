import { geometryOrigin } from '../utils/geometry'
import type { GeometrySource } from '../utils/geometry'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any

// Generic base class for shape factories. Subclasses bind a concrete
// `properties` shape; this lets `this.properties.fill` etc. be typed without
// every factory casting.
export default class Main<P = unknown> {
    two: TwoLike
    x: number
    y: number
    properties: P

    constructor(instance: TwoLike, x: number, y: number, properties: P) {
        this.two = instance
        // The origin comes from the GEOMETRY, not from the x/y arguments.
        //
        // Those columns are a cache of exactly this value, so reading them here
        // is how the two used to drift apart — a vertex edit persisted new
        // coordinates without touching the columns, and the next load rebuilt
        // the path against a stale origin.
        //
        // This is also what retired the old `x === 0 ? 500` coercion that stood
        // here. On a map base that was a live bug rather than a nicety: surface
        // (0, 0) IS the georeference anchor, so anything drawn exactly on it
        // was teleported 500 units east. It only survived because nothing else
        // owned the origin; now the geometry does.
        const origin = geometryOrigin(properties as GeometrySource)
        this.x = origin ? origin.x : x
        this.y = origin ? origin.y : y
        this.properties = properties
    }
}
