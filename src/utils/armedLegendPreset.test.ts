import { describe, it, expect, beforeEach } from 'vitest'
import { armedPresetPatch, setArmedPreset } from './armedLegendPreset'
import type { LegendPreset } from '../types/legend'

const preset = (over: Partial<LegendPreset> = {}): LegendPreset => ({
    id: 'p1',
    baseId: null,
    name: 'Catchment',
    elementType: 'circle',
    style: { fill: '#A32D2D' },
    position: 0,
    ...over,
})

describe('armedPresetPatch', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('is empty when nothing is armed, so it never overrides defaults', () => {
        expect(armedPresetPatch('circle')).toEqual({})
    })

    // A radius map is borderless and reads as one mark, so its stroke column
    // follows its fill — the drawn disc and the legend swatch must agree.
    it('carries a radius map colour and its binding', () => {
        setArmedPreset('circle', preset())

        expect(armedPresetPatch('circle')).toEqual({
            fill: '#A32D2D',
            stroke: '#A32D2D',
            legendPresetId: 'p1',
        })
    })

    // The ordering bug this guards: arming happens AFTER the tool is picked,
    // because the chips for a tool only appear once it is current. Anything
    // reading the armed map has to read it at CREATION time, not before —
    // a patch built before the arm is, correctly, empty.
    it('reflects an arm that happened after an earlier read', () => {
        const atToolPick = armedPresetPatch('circle')
        expect(atToolPick).toEqual({})

        setArmedPreset('circle', preset())

        expect(armedPresetPatch('circle')).not.toEqual(atToolPick)
        expect(armedPresetPatch('circle')).toMatchObject({ fill: '#A32D2D' })
    })

    it('keeps each tool arm separate', () => {
        setArmedPreset('circle', preset())

        expect(armedPresetPatch('point')).toEqual({})
        expect(armedPresetPatch('circle')).toMatchObject({ legendPresetId: 'p1' })
    })
})
