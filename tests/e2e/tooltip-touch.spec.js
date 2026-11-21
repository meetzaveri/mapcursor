import { test, expect } from './helpers/test.js'
import { setupLocalBase } from './helpers/index.js'

const openTooltips = (page) =>
    page.evaluate(() =>
        Array.from(document.querySelectorAll('[role="tooltip"]')).map(
            (t) => t.textContent
        )
    )

test.describe('touch', () => {
    test.use({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
    })

    test('tapping a tool never leaves a tooltip behind', async ({ page }) => {
        await setupLocalBase(page)
        const draw = page.locator('[aria-label="Draw"]').first()
        await draw.waitFor()

        await draw.tap()
        expect(
            await openTooltips(page),
            'a finger opened a hover hint'
        ).toEqual([])

        await page.touchscreen.tap(195, 500)
        await page.touchscreen.tap(60, 700)
        expect(await openTooltips(page)).toEqual([])
    })
})

test.describe('mouse', () => {
    test.use({
        viewport: { width: 1280, height: 800 },
        hasTouch: false,
        isMobile: false,
    })

    test('hover still shows the hint, and leaving still hides it', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const pencil = page.locator('[aria-label="Pencil"]').first()
        await pencil.waitFor()
        const box = await pencil.boundingBox()
        const centre = {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
        }

        await page.mouse.move(centre.x, centre.y)
        await expect.poll(() => openTooltips(page)).toContain('Pencil')

        await page.mouse.move(centre.x + 400, centre.y + 400)
        await expect.poll(() => openTooltips(page)).toEqual([])
    })
})
