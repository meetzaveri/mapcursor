/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
    readonly VITE_GRAPHQL_ENDPOINT: string
    readonly VITE_WS_GRAPHQL_ENDPOINT: string
    readonly VITE_AUTH_ENDPOINT: string
    readonly VITE_SENTRY_DSN?: string
    readonly VITE_GRAPHQL_ERROR_POLICY?: string
    readonly VITE_CARTO_API_KEY?: string
    readonly MODE: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare const __BUILD_SHA__: string

interface Window {
    __mcSkipChromeReveal?: boolean
    umami?: {
        track: (
            eventName: string,
            eventData?: Record<string, string | number | boolean>
        ) => void
    }
}

declare module 'idx' {
    function idx<T, R>(input: T, accessor: (input: T) => R): R | null | undefined
    export default idx
}
