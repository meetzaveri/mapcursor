import { describe, expect, it } from 'vitest'
import { geometryFields, pointGeometry } from '../../utils/geometry'
import { visibleSections } from './visibleSections'

const CIRCLE = ['fill', 'textColor', 'textSize', 'textFont', 'opacity']

const labelled = (label: string): object =>
    geometryFields(pointGeometry(0, 0), { label })

describe('visibleSections', () => {
    it('drops the label controls from an unnamed circle', () => {
        expect(visibleSections('CIRCLE', CIRCLE, {})).toEqual([
            'fill',
            'opacity',
        ])
    })

    it('treats a whitespace-only label as blank', () => {
        expect(visibleSections('CIRCLE', CIRCLE, labelled('   '))).toEqual([
            'fill',
            'opacity',
        ])
    })

    it('keeps the label controls on a named circle', () => {
        expect(
            visibleSections('CIRCLE', CIRCLE, labelled('Delivery zone'))
        ).toEqual(CIRCLE)
    })

    it('leaves other sets and the armed tool alone', () => {
        expect(visibleSections('TEXT', ['textColor'], {})).toEqual([
            'textColor',
        ])
        expect(visibleSections('CIRCLE', CIRCLE, null)).toEqual(CIRCLE)
    })
})
