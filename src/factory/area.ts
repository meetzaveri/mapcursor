import Main from './main'
import Two from 'two.js'
import { strokeTypeToDashes, strokeToAreaFill } from '../utils/misc'
import { geometryPositions, readGeometry } from '../utils/geometry'
import type { ComponentMetadata } from '../types/base'

export interface AreaProperties {
    stroke?: string
    linewidth?: number
    strokeType?: string | null
    /** `geometry` is a Polygon whose outer ring is in absolute surface coords. */
    metadata?: ComponentMetadata | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export default class AreaFactory extends Main<AreaProperties> {
    path?: ShapeLike
    group?: ShapeLike

    createElement(): { group: ShapeLike; path: ShapeLike } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { stroke, linewidth, strokeType } = this.properties

        // `geometryPositions` hands back the ring OPEN. The stored ring repeats
        // its first position last, per RFC 7946, but the path below is built
        // with `closed = true` and closes itself — a duplicate final vertex
        // there draws a zero-length segment and stacks a grab handle on top of
        // the first one.
        const positions = geometryPositions(readGeometry(this.properties))
        const anchors = positions.map(
            ([x, y]) => new (Two as ShapeLike).Anchor(x - prevX, y - prevY)
        )

        // closed = true → filled polygon (area)
        const path = new (Two as ShapeLike).Path(anchors, true, false)
        const strokeColor = stroke || '#A32D2D'
        path.stroke = strokeColor
        // Fill is always derived from stroke @ 0.7 — never persisted.
        path.fill = strokeToAreaFill(strokeColor)
        path.linewidth = linewidth ? linewidth : 2
        path.dashes = strokeTypeToDashes(strokeType)

        this.path = path
        const group = two.makeGroup(path)
        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))
        this.group = group
        return { group: this.group, path }
    }
}
