// Ambient declarations for non-code assets and module shapes that aren't
// covered by their own packages.

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

// The commit this bundle was built from, baked in by vite.config.mjs. Read
// only through `src/utils/analytics.ts`, which guards against it being absent.
declare const __BUILD_SHA__: string

// Umami's analytics script attaches itself to `window` when it loads. It is
// deferred and may be blocked outright, so the handle is optional and every
// caller goes through `src/utils/analytics.ts` rather than touching it here.
interface Window {
    umami?: {
        track: (
            eventName: string,
            eventData?: Record<string, string | number | boolean>
        ) => void
    }
}

// `idx` ships without types in some versions. Minimal shim so callers don't
// see implicit-any errors during migration; we can sharpen this later.
declare module 'idx' {
    function idx<T, R>(input: T, accessor: (input: T) => R): R | null | undefined
    export default idx
}
