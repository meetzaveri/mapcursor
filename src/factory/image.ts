import Main from './main'
import {
    attachImageNode,
    IMAGE_PLACEHOLDER_FILL,
    IMAGE_PLACEHOLDER_STROKE,
} from '../utils/imageNode'
import { readProperties } from '../utils/geometry'
import { isImageAssetRef } from '../types/asset'
import type { GeometrySource } from '../utils/geometry'

// Ported from craftbase. The record's `ImageAssetRef` lives at
// `metadata.properties.image`; width/height are in the group's LOCAL units.
// The group counter-scales (an image keeps its on-screen size, like geo-text),
// so on-map size = local size × group.scale. See utils/counterScale.ts.

export interface ImageProperties extends GeometrySource {
    width?: number
    height?: number
    /**
     * Set by the image element component, which disposes the bitmap node in
     * its own cleanup. Unset for group-select member copies, whose node
     * releases itself once the copy leaves the scene.
     */
    ownsImageNode?: boolean
    /** Called once the bitmap has painted or turned out to be missing. */
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

        // The frame is the hit, selection and resize target. It shows as a
        // dashed placeholder until the bitmap loads, then goes transparent.
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
