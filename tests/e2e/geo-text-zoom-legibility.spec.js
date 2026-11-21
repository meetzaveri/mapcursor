import { test, expect } from './helpers/test.js'
import { baseRow, GQL_MOCK_RESPONSES, pointAt } from './helpers/index.js'

const BASE_ID = '11111111-1111-1111-1111-111111111111'
const ANCHOR = { lngLat: [-121.95, 37.35], zoom: 16 }
const LABEL = 'Santa Clara'
const FONT_SIZE = 18

const MAP_ZOOMS = [19, 16, 13, 10, 5, 1]

const MIN_LEGIBLE_PX = 6
const MAX_REASONABLE_PX = 60

const geoTextRecord = (id) => ({
    id,
    componentType: 'text',
    children: null,
    ...pointAt(0, 0, { content: LABEL, fontSize: FONT_SIZE }),
    x1: 0, x2: 0, y1: 0, y2: 0,
    fill: 'transparent', width: 120, height: 36,
    iconStroke: null, stroke: null, linewidth: 2, strokeType: null,
    textColor: '#3A342C', opacity: 1, position: 1,
    tailShapeId: null, tailEdge: null, headShapeId: null, headEdge: null,
    tailPortIndex: null, headPortIndex: null,
})

test('map text stays legible across the whole map zoom range', async ({
    page,
}) => {
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            data =
                body.operationName === 'getComponentsForBase'
                    ? {
                          base: baseRow({
                              id: BASE_ID,
                                                            anchor: ANCHOR,
                          }),
                          components: [
                              geoTextRecord(
                                  'aaaaaaaa-1111-1111-1111-111111111111'
                              ),
                          ],
                      }
                    : (GQL_MOCK_RESPONSES[body.operationName] ?? {})
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data }),
        })
    })
    await page.addInitScript(() => {
        localStorage.setItem('userId', 'test-user-id')
        localStorage.setItem('mapcursor_welcome_dismissed', '1')
    })

    await page.goto(`/map/${BASE_ID}`)
    await page.locator(`text=${LABEL}`).first().waitFor({ timeout: 15_000 })

    const apparentHeightAt = async (scale) =>
        page.evaluate(
            ({ s, label }) => {
                const two = window.__mcTwo
                two.scene.scale = s
                window.dispatchEvent(
                    new CustomEvent('zoomChanged', { detail: { scale: s } })
                )
                two.update()
                const el = Array.from(
                    document.querySelectorAll('text')
                ).find((n) => n.textContent === label)
                return el ? el.getBoundingClientRect().height : null
            },
            { s: scale, label: LABEL }
        )

    for (const mapZoom of MAP_ZOOMS) {
        const scale = Math.pow(2, mapZoom - ANCHOR.zoom)
        const px = await apparentHeightAt(scale)

        expect(px, `label missing at map zoom ${mapZoom}`).not.toBeNull()
        expect(
            px,
            `at map zoom ${mapZoom} (zuiScale ${scale}) the label rendered at ${px}px`
        ).toBeGreaterThan(MIN_LEGIBLE_PX)
        expect(
            px,
            `at map zoom ${mapZoom} (zuiScale ${scale}) the label rendered at ${px}px`
        ).toBeLessThan(MAX_REASONABLE_PX)
    }
})
