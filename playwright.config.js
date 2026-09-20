import { defineConfig, devices } from '@playwright/test'

// CI runs against a remote Netlify deploy preview, which is slower and flakier
// than the local Vite dev server. Give it longer per-test/per-action budgets
// and a couple of retries; keep local fast and strict.
const CI = !!process.env.CI

export default defineConfig({
    testDir: './tests/e2e',
    timeout: CI ? 60_000 : 30_000,
    retries: CI ? 2 : 0,
    reporter: 'list',
    expect: {
        timeout: CI ? 15_000 : 5_000,
    },
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
        actionTimeout: CI ? 15_000 : 0,
        navigationTimeout: CI ? 30_000 : 0,
        screenshot: 'only-on-failure',
        video: 'off',
        // Analytics must never hear from a test run. CI points at a real
        // Netlify deploy preview where the umami tracker is live, so without
        // this every run lands in the production dashboard as fake traffic.
        // Failing DNS at the browser level covers every page in the run,
        // including a spec that imports `test` from @playwright/test and so
        // bypasses the opt-out fixture in tests/e2e/helpers/test.js.
        //
        // App code DOES read window.umami now (src/utils/analytics.ts sends
        // the funnel events), so this is load-bearing rather than belt-and
        // braces. With the CDN unresolvable the tracker never attaches,
        // trackEvent queues its events, and the queue is dropped after its
        // timeout — nothing is sent and nothing leaks into the dashboard.
        // Chromium-only flag: a firefox or webkit project would need the
        // fixture's route abort, which is engine-independent, to carry it.
        launchOptions: {
            args: [
                '--host-resolver-rules=MAP cloud.umami.is ~NOTFOUND,MAP gateway.umami.is ~NOTFOUND',
            ],
        },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
