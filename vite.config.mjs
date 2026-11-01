import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'
import { resolveSha } from './scripts/resolveSha.mjs'

export default defineConfig({
    plugins: [svgr(), react(), tsconfigPaths()],
    // Baked in at build time so every analytics event can say which build
    // produced it. Without this a funnel spanning an onboarding change is one
    // undifferentiated pile of events with no way to split before from after.
    // Short form: 7 characters is unambiguous here and keeps the event payload
    // small. `public/build-info.json` carries the full sha.
    define: {
        __BUILD_SHA__: JSON.stringify(resolveSha().slice(0, 7)),
    },
    server: {
        host: true,
        allowedHosts: ['10.251.150.95'],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.js',
        // Playwright owns tests/e2e. Vitest's default include matches
        // **/*.spec.js, which sweeps all 28 of those in and fails every one
        // with "Playwright Test did not expect test() to be called here" —
        // noise that hid a bare `yarn test` being useful at all.
        exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    },
})
