import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveSha } from './resolveSha.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(__dirname, '..', 'public', 'build-info.json')

const payload = {
    sha: resolveSha(),
    builtAt: new Date().toISOString(),
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n')

console.log(`[write-build-info] wrote ${outputPath}: sha=${payload.sha}`)
