import { test as base, expect } from '@playwright/test'

const CI = !!process.env.CI
export const DEFAULT_TIMEOUT =
    Number(process.env.E2E_WAIT_TIMEOUT) || (CI ? 15_000 : 5_000)

async function hideNetlifyDrawer(page) {
    await page.addInitScript(() => {
        const inject = () => {
            const style = document.createElement('style')
            style.textContent =
                'iframe[title="Netlify Drawer"],[data-netlify-deploy-id]' +
                '{display:none!important;pointer-events:none!important}'
            ;(document.head || document.documentElement).appendChild(style)
        }
        if (document.documentElement) inject()
        else document.addEventListener('DOMContentLoaded', inject, { once: true })
    })
}

export const ANALYTICS_HOSTS = ['cloud.umami.is', 'gateway.umami.is']

export const test = base.extend({
    context: async ({ context }, use) => {
        await context.addInitScript(() => {
            try {
                window.localStorage.setItem('umami.disabled', '1')
            } catch (e) {}
            window.__mcSkipChromeReveal = true
        })
        await context.route(
            (url) => ANALYTICS_HOSTS.includes(url.hostname),
            (route) => route.abort()
        )
        await use(context)
    },
    page: async ({ page }, use) => {
        page.setDefaultTimeout(DEFAULT_TIMEOUT)
        await hideNetlifyDrawer(page)
        await use(page)
    },
})

export { expect }
