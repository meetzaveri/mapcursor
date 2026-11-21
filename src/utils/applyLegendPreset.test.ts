import { describe, it, expect, vi } from 'vitest'
import { applyPresetToElement } from './applyLegendPreset'
import { POINT_CHROME_FLAG } from '../factory/point'
import type { LegendPreset } from '../types/legend'

const preset = (elementType: LegendPreset['elementType']): LegendPreset => ({
    id: 'p1',
    baseId: null,
    name: 'Post Office',
    elementType,
    style: { fill: '#2BB0ED' },
    position: 0,
})

const makeGroup = (id: string, componentType: string, children: object[]) => ({
    elementData: { id, componentType },
    children,
})

const makeDeps = (group: object) => {
    const write = vi.fn()
    return {
        deps: {
            twoJSInstance: {
                scene: { children: [group], scale: 1 },
                update: vi.fn(),
            },
            updateComponentBulkPropertiesInLocalStore: write,
        },
        write,
    }
}

describe('applyPresetToElement', () => {
    it('paints a selected point on its pin, not on its selection chrome', () => {
        const chrome = { [POINT_CHROME_FLAG]: true, fill: '#chrome' }
        const pin = { fill: '#FF5630', stroke: '#FF5630' }
        const group = makeGroup('pt-1', 'point', [chrome, pin])
        const { deps } = makeDeps(group)

        applyPresetToElement(deps, 'pt-1', preset('point'))

        expect(pin.fill).toBe('#2BB0ED')
        expect(chrome.fill).toBe('#chrome')
    })

    it('still paints an unselected point, whose pin is the only child', () => {
        const pin = { fill: '#FF5630', stroke: '#FF5630' }
        const group = makeGroup('pt-2', 'point', [pin])
        const { deps } = makeDeps(group)

        applyPresetToElement(deps, 'pt-2', preset('point'))

        expect(pin.fill).toBe('#2BB0ED')
    })

    it('paints a radius map on its disc', () => {
        const disc = { fill: '#A32D2D', stroke: '#A32D2D' }
        const labelLayer = { children: [] }
        const group = makeGroup('c-1', 'circle', [disc, labelLayer])
        const { deps } = makeDeps(group)

        applyPresetToElement(deps, 'c-1', preset('circle'))

        expect(disc.fill).toBe('#2BB0ED')
    })

    it('writes the binding alongside the styling, as one patch', () => {
        const pin = { fill: '#FF5630', stroke: '#FF5630' }
        const group = makeGroup('pt-3', 'point', [pin])
        const { deps, write } = makeDeps(group)

        applyPresetToElement(deps, 'pt-3', preset('point'))

        expect(write).toHaveBeenCalledWith(
            'pt-3',
            expect.objectContaining({
                fill: '#2BB0ED',
                stroke: '#2BB0ED',
                legendPresetId: 'p1',
            }),
            false
        )
    })
})

describe('area fill type in a preset', () => {
    const areaPreset = (
        fillType?: string | null,
        opacity?: number
    ): LegendPreset => ({
        id: 'p-area',
        baseId: null,
        name: 'Flood zone',
        elementType: 'area',
        style: {
            stroke: '#3B82F6',
            linewidth: 2,
            strokeType: null,
            ...(fillType !== undefined ? { fillType } : {}),
            ...(opacity !== undefined ? { opacity } : {}),
        },
        position: 0,
    })

    it('writes the fill type and marks the element with it', () => {
        const path = { fill: '', stroke: '#A32D2D', linewidth: 2 }
        const group = makeGroup('a-1', 'area', [path])
        const { deps, write } = makeDeps(group)

        applyPresetToElement(deps, 'a-1', areaPreset('hachure'))

        expect(write).toHaveBeenCalledWith(
            'a-1',
            expect.objectContaining({
                fillType: 'hachure',
                legendPresetId: 'p-area',
            }),
            false
        )
        expect(
            (group.elementData as Record<string, unknown>).fillType
        ).toBe('hachure')
    })

    it('reads a preset with no fill type as solid', () => {
        const path = { fill: '', stroke: '#A32D2D', linewidth: 2 }
        const group = makeGroup('a-2', 'area', [path])
        const { deps, write } = makeDeps(group)

        applyPresetToElement(deps, 'a-2', areaPreset())

        expect(write).toHaveBeenCalledWith(
            'a-2',
            expect.objectContaining({ fillType: null }),
            false
        )
    })

    it('never hands a fill type to a route', () => {
        const path = { fill: 'none', stroke: '#A32D2D', linewidth: 2 }
        const group = makeGroup('r-1', 'route', [path])
        const { deps, write } = makeDeps(group)

        applyPresetToElement(deps, 'r-1', {
            ...areaPreset('hachure'),
            elementType: 'route',
        })

        expect(write.mock.calls[0]?.[1]).not.toHaveProperty('fillType')
        expect(path.fill).toBe('none')
    })

    it('paints its opacity into the fill, never the border', () => {
        const path = { fill: '', stroke: '#A32D2D', linewidth: 2, opacity: 1 }
        const group = makeGroup('a-3', 'area', [path])
        const { deps, write } = makeDeps(group)

        applyPresetToElement(deps, 'a-3', areaPreset(null, 1))

        expect(write).toHaveBeenCalledWith(
            'a-3',
            expect.objectContaining({ opacity: 1 }),
            false
        )
        expect(path.fill).toBe('rgba(59,130,246,1)')
        expect(path.opacity).toBe(1)
        expect((group as Record<string, unknown>).opacity).toBe(1)
    })

    it('reads a preset with no opacity as the half-strength default', () => {
        const path = { fill: '', stroke: '#A32D2D', linewidth: 2 }
        const group = makeGroup('a-4', 'area', [path])
        const { deps, write } = makeDeps(group)

        applyPresetToElement(deps, 'a-4', areaPreset(null))

        expect(write).toHaveBeenCalledWith(
            'a-4',
            expect.objectContaining({ opacity: 0.5 }),
            false
        )
        expect(path.fill).toBe('rgba(59,130,246,0.5)')
    })
})
