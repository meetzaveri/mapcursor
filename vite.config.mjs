import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
    plugins: [svgr(), react(), tsconfigPaths()],
    server: {
        host: true,
        allowedHosts: [
            '10.106.71.95',
            'ee38-2409-40c1-5477-4eb-c4f3-8a6a-2618-eaf5.ngrok-free.app',
        ],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.js',
    },
})
