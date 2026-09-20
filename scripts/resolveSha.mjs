import { execSync } from 'node:child_process'

/**
 * The commit this bundle was built from.
 *
 * Shared by `write-build-info.mjs` (which writes it to a file the app can
 * fetch) and `vite.config.mjs` (which bakes it into the bundle as
 * `__BUILD_SHA__` for analytics). One resolver so those two can never disagree
 * about which build is which — the whole point of stamping events with it is
 * that a funnel measured before a change is comparable to one measured after.
 *
 * Netlify sets COMMIT_REF, GitHub Actions sets GITHUB_SHA, and a local build
 * falls back to the working tree's HEAD.
 */
export function resolveSha() {
    if (process.env.COMMIT_REF) return process.env.COMMIT_REF
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    } catch {
        return 'unknown'
    }
}
