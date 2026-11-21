import Main from './main'
import Two from 'two.js'
import { strokeTypeToDashes } from '../utils/misc'
import { geometryPositions, readGeometry } from '../utils/geometry'
import type { ComponentMetadata } from '../types/base'

export interface RouteProperties {
    stroke?: string
    linewidth?: number
    strokeType?: string | null
    metadata?: ComponentMetadata | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export default class RouteFactory extends Main<RouteProperties> {
    path?: ShapeLike
    group?: ShapeLike

    createElement(): { group: ShapeLike; path: ShapeLike } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { stroke, linewidth, strokeType } = this.properties

        const positions = geometryPositions(readGeometry(this.properties))
        const anchors = positions.map(
            ([x, y]) => new (Two as ShapeLike).Anchor(x - prevX, y - prevY)
        )

        const path = new (Two as ShapeLike).Path(anchors, false, false)
        path.noFill()
        path.stroke = stroke || '#3B82F6'
        path.linewidth = linewidth ? linewidth : 2.5
        path.cap = 'round'
        path.join = 'round'
        path.dashes = strokeTypeToDashes(strokeType)

        this.path = path
        const group = two.makeGroup(path)
        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))
        this.group = group
        return { group: this.group, path }
    }
}
