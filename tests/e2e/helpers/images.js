export const IMAGE_GROUP = 'g[data-component-type="image"]'
export const IMAGE_NODE = `${IMAGE_GROUP} image[data-mc-image]`
export const PENDING_NODE = '[data-mc-image-pending]'
export const ASSET_DB = 'mapcursor-assets'
export const DRAFT_DEBOUNCE_MS = 700

export async function makePng(page, { width, height, color = '#3b82f6' }) {
    const base64 = await page.evaluate(
        ({ width, height, color }) => {
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.fillStyle = color
            ctx.fillRect(0, 0, width, height)
            ctx.fillStyle = '#f59e0b'
            ctx.fillRect(0, 0, width / 2, height / 2)
            return canvas.toDataURL('image/png').split(',')[1]
        },
        { width, height, color }
    )
    return Buffer.from(base64, 'base64')
}

export async function dropFile(
    page,
    data,
    { clientX, clientY, mimeType = 'image/png', name = 'photo.png' }
) {
    const base64 = Buffer.isBuffer(data) ? data.toString('base64') : data
    const dataTransfer = await page.evaluateHandle(
        ({ base64, mimeType, name }) => {
            const bin = atob(base64)
            const bytes = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
            const dt = new DataTransfer()
            dt.items.add(new File([bytes], name, { type: mimeType }))
            return dt
        },
        { base64, mimeType, name }
    )
    const init = { dataTransfer, clientX, clientY, bubbles: true }
    await page.dispatchEvent('#main-two-root', 'dragover', init)
    await page.dispatchEvent('#main-two-root', 'drop', init)
}

export async function insertImageViaToolbar(page, buffer) {
    const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('[aria-label="Image"]'),
    ])
    await chooser.setFiles({ name: 'picked.png', mimeType: 'image/png', buffer })
}

export async function waitForPaintedImage(page) {
    await page.waitForFunction(() => {
        const g = document.querySelector('g[data-component-type="image"]')
        const frame = g?.querySelector('path, rect')
        return (
            !!g?.querySelector('image[data-mc-image]') &&
            frame?.getAttribute('fill') === 'transparent'
        )
    })
}

export async function imageRect(page) {
    return page.$eval(IMAGE_NODE, (el) => {
        const r = el.getBoundingClientRect()
        return {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
            cx: r.left + r.width / 2,
            cy: r.top + r.height / 2,
        }
    })
}

export async function assetCount(page) {
    return page.evaluate(
        (db) =>
            new Promise((resolve) => {
                const open = indexedDB.open(db)
                open.onerror = () => resolve(0)
                open.onsuccess = () => {
                    const conn = open.result
                    if (!conn.objectStoreNames.contains('images')) {
                        resolve(0)
                        return
                    }
                    const req = conn
                        .transaction('images', 'readonly')
                        .objectStore('images')
                        .count()
                    req.onsuccess = () => resolve(req.result)
                    req.onerror = () => resolve(0)
                }
            }),
        ASSET_DB
    )
}

export async function readAsset(page, assetId) {
    return page.evaluate(
        ({ db, id }) =>
            new Promise((resolve, reject) => {
                const open = indexedDB.open(db)
                open.onerror = () => reject(open.error)
                open.onsuccess = () => {
                    const req = open.result
                        .transaction('images', 'readonly')
                        .objectStore('images')
                        .get(id)
                    req.onerror = () => reject(req.error)
                    req.onsuccess = () => {
                        if (!req.result) return resolve(null)
                        const u8 = new Uint8Array(req.result.bytes)
                        let s = ''
                        for (let i = 0; i < u8.length; i++)
                            s += String.fromCharCode(u8[i])
                        resolve({ base64: btoa(s), type: req.result.type })
                    }
                }
            }),
        { db: ASSET_DB, id: assetId }
    )
}

export async function draftImages(page) {
    return page.evaluate(() => {
        const raw = localStorage.getItem('mapcursor_local_draft')
        if (!raw) return []
        return Object.values(JSON.parse(raw).components || {}).filter(
            (c) => c?.componentType === 'image'
        )
    })
}

export async function waitForDraftImages(page, count = 1) {
    await page.waitForFunction((n) => {
        const raw = localStorage.getItem('mapcursor_local_draft')
        if (!raw) return n === 0
        const images = Object.values(JSON.parse(raw).components || {}).filter(
            (c) => c?.componentType === 'image'
        )
        return images.length === n
    }, count)
}
