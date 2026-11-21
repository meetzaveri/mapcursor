import Main from './main'
import Two from 'two.js'
import { chaikinSmooth, pencilPointsOf } from '../utils/pencilHelper'
import { strokeTypeToDashes } from '../utils/misc'
import type { ComponentMetadata } from '../types/base'

export interface PencilProperties {
    stroke?: string
    linewidth?: number
    metadata?: ComponentMetadata | null
    strokeType?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export default class PencilFactory extends Main<PencilProperties> {
    path?: ShapeLike
    group?: ShapeLike

    createElement(): { group: ShapeLike; path: ShapeLike } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { stroke, linewidth, strokeType } = this.properties

        const points = pencilPointsOf(this.properties)

        const smoothed = points.length > 2 ? chaikinSmooth(points, 2) : points

        const path = two.makePath()
        smoothed.forEach((point) => {
            path.vertices.push(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                new (Two as any).Anchor(point.x - prevX, point.y - prevY)
            )
        })
        path.noFill()
        path.stroke = stroke || '#3A342C'
        path.closed = false
        path.cap = 'round'
        path.join = 'round'
        path.linewidth = linewidth ? linewidth : 1
        path.dashes = strokeTypeToDashes(strokeType)

        this.path = path
        const group = two.makeGroup(path)
        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))
        this.group = group
        return { group: this.group, path }
    }
}
