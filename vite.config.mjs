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
            'dd43-2409-40c1-2009-b75e-49e5-1a81-c376-8bab.ngrok-free.app',
        ],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.js',
    },
})
