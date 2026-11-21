import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'
import { resolveSha } from './scripts/resolveSha.mjs'

export default defineConfig({
    plugins: [svgr(), react(), tsconfigPaths()],
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
        exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    },
})
