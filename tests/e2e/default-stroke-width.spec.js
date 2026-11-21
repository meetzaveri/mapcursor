import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    drawPencilStroke,
    setDefaultStrokeWidth,
    clickToolbarButton,
    getCanvasBox,
    drawArea,
    getDraftComponents,
    clickPointerTool,
} from './helpers/index.js'

const DEFAULT_LABEL = '4'
const EXPECTED_LINEWIDTH = '4'

async function getLinewidth(handle) {
    return handle.getAttribute('data-linewidth')
}

test.describe('Default stroke width applies to drawn shapes', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    test('drawn pencil stroke uses default stroke width', async ({ page }) => {
        await clickToolbarButton(page, 'Pencil')
        await setDefaultStrokeWidth(page, DEFAULT_LABEL)

        const box = await getCanvasBox(page)
        const cx = box.x + box.width * 0.65
        const cy = box.y + box.height * 0.65

        const handle = await drawPencilStroke(page, {
            startX: cx - 80,
            startY: cy - 30,
            endX: cx + 80,
            endY: cy + 30,
        })

        expect(await getLinewidth(handle)).toBe(EXPECTED_LINEWIDTH)
    })

    test('pencil stroke width does not restyle the area just drawn', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        const cx = box.x + box.width * 0.5
        const cy = box.y + box.height * 0.6
        await drawArea(page, [
            { x: cx - 80, y: cy - 60 },
            { x: cx + 80, y: cy - 60 },
            { x: cx, y: cy + 60 },
        ])
        await clickPointerTool(page)
        await page.mouse.click(cx - 40, cy - 59)
        await expect(page.locator('#stroke-width-section')).toBeVisible()

        const readAreaLinewidth = async () => {
            const components = (await getDraftComponents(page)) || {}
            const area = Object.values(components).find(
                (c) => c.componentType === 'area'
            )
            return area?.linewidth
        }
        await expect.poll(readAreaLinewidth).toBeDefined()
        const before = await readAreaLinewidth()

        await clickToolbarButton(page, 'Pencil')
        await setDefaultStrokeWidth(page, String(before) === '8' ? '2' : '8')
        await page.waitForTimeout(800)

        expect(await readAreaLinewidth()).toBe(before)
    })
})
