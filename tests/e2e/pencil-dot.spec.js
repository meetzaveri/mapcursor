import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    getDraftComponents,
    triggerUndoKeyboard,
} from './helpers/index.js'

const DRAFT_DEBOUNCE_MS = 700

async function clickDot(page, x, y) {
    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )
    await page.click('[aria-label="Pencil"]')
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForFunction(
        (n) => document.querySelectorAll('[data-component-id]').length > n,
        countBefore
    )
    const els = await page.$$('[data-component-id]')
    return els[els.length - 1]
}

test.describe('Pencil — click without drag draws a dot', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    test('commits a pencil component that actually paints', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        const handle = await clickDot(
            page,
            box.x + box.width * 0.5,
            box.y + box.height * 0.5
        )
        const id = await handle.getAttribute('data-component-id')

        await page.waitForTimeout(DRAFT_DEBOUNCE_MS)
        const draft = await getDraftComponents(page)
        const record = draft?.[id]
        expect(record?.componentType).toBe('pencil')
        const coords = record?.metadata?.geometry?.coordinates
        expect(record?.metadata?.geometry?.type).toBe('LineString')
        expect(coords).toHaveLength(2)
        expect(coords[1][0]).toBeGreaterThan(coords[0][0])

        const stroke = await handle.$$eval('path', (els) => {
            const el = els[els.length - 1]
            return {
                d: el.getAttribute('d') || '',
                cap: getComputedStyle(el).strokeLinecap,
            }
        })
        expect(stroke.cap).toBe('round')
        expect(stroke.d).toContain('L')
    })

    test('survives a reload', async ({ page }) => {
        const box = await getCanvasBox(page)
        await clickDot(page, box.x + box.width * 0.5, box.y + box.height * 0.5)

        await page.waitForTimeout(DRAFT_DEBOUNCE_MS)
        await page.reload()
        await page.waitForSelector('[data-component-id]')
        await expect(page.locator('[data-component-id]')).toHaveCount(1)
    })

    test('undo removes it', async ({ page }) => {
        const box = await getCanvasBox(page)
        await clickDot(page, box.x + box.width * 0.5, box.y + box.height * 0.5)

        await triggerUndoKeyboard(page)
        await expect(page.locator('[data-component-id]')).toHaveCount(0)
    })
})
