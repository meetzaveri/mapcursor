import { defineConfig, devices } from '@playwright/test'

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
