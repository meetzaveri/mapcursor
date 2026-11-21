import Main from './main'
import {
    attachImageNode,
    IMAGE_PLACEHOLDER_FILL,
    IMAGE_PLACEHOLDER_STROKE,
} from '../utils/imageNode'
import { readProperties } from '../utils/geometry'
import { isImageAssetRef } from '../types/asset'
import type { GeometrySource } from '../utils/geometry'

export interface ImageProperties extends GeometrySource {
    width?: number
    height?: number
    ownsImageNode?: boolean
    onImageSettled?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export const IMAGE_DEFAULT_WIDTH = 240
export const IMAGE_DEFAULT_HEIGHT = 160

export default class ImageFactory extends Main<ImageProperties> {
    createElement(): {
        group: ShapeLike
        frame: ShapeLike
        disposeImageNode: () => void
    } {
        const two = this.two
        const { width, height, ownsImageNode, onImageSettled } =
            this.properties
        const ref = readProperties(this.properties).image

        const frame = two.makeRectangle(
            0,
            0,
            width || IMAGE_DEFAULT_WIDTH,
            height || IMAGE_DEFAULT_HEIGHT
        )
        frame.fill = IMAGE_PLACEHOLDER_FILL
        frame.stroke = IMAGE_PLACEHOLDER_STROKE
        frame.linewidth = 1
        frame.dashes = [4, 4]

        const group = two.makeGroup(frame)
        group.translation.x = parseInt(String(this.x))
        group.translation.y = parseInt(String(this.y))

        const disposeImageNode = attachImageNode(
            two,
            group,
            frame,
            isImageAssetRef(ref) ? ref : null,
            !ownsImageNode,
            onImageSettled
        )

        return { group, frame, disposeImageNode }
    }
}
