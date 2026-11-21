import Main from './main'
import { DEFAULT_TEXT_FONT_FAMILY } from '../constants/misc'
import { scheduleRender } from '../utils/renderScheduler'
import { readProperties } from '../utils/geometry'
import type { ComponentMetadata } from '../types/base'

export interface TextMetadata {
    content?: string
    fontSize?: number
    textFontFamily?: string
}

export interface TextProperties {
    textColor?: string
    metadata?: ComponentMetadata | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export default class TextFactory extends Main<TextProperties> {
    createElement(): { group: ShapeLike; twoText: ShapeLike } {
        const two = this.two
        const prevX = this.x
        const prevY = this.y
        const { textColor } = this.properties || {}
        const {
            content = '',
            fontSize = 36,
            textFontFamily = DEFAULT_TEXT_FONT_FAMILY,
        } = readProperties(this.properties) as TextMetadata

        const twoText = two.makeText(content || '', 0, 0)
        twoText.fill = textColor || '#3A342C'
        twoText.size = fontSize
        twoText.alignment = 'left'
        twoText.baseline = 'middle'
        twoText.family = textFontFamily

        const group = two.makeGroup(twoText)
        group.translation.x = parseInt(String(prevX))
        group.translation.y = parseInt(String(prevY))

        scheduleRender(two)

        return { group, twoText }
    }
}
