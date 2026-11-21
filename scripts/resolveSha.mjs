import { execSync } from 'node:child_process'

export function resolveSha() {
    if (process.env.COMMIT_REF) return process.env.COMMIT_REF
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    } catch {
        return 'unknown'
    }
}
