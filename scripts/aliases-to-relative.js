#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '..', 'src')

const TOP_LEVEL_DIRS = fs
	.readdirSync(SRC, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name)

const ALIAS_RE = new RegExp(
	`(from\\s+['"]|import\\s+['"]|require\\(['"])(${TOP_LEVEL_DIRS.join('|')})(/[^'"]*)?(['"]\\)?)`,
	'g',
)

function* walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			yield* walk(full)
		} else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
			yield full
		}
	}
}

let touched = 0
let totalEdits = 0

for (const file of walk(SRC)) {
	const orig = fs.readFileSync(file, 'utf8')
	let fileEdits = 0
	const next = orig.replace(
		ALIAS_RE,
		(_m, prefix, alias, rest = '', suffix) => {
			const fromDir = path.dirname(file)
			const target = path.join(SRC, alias, rest || '')
			let rel = path.relative(fromDir, target)
			if (!rel.startsWith('.')) rel = './' + rel
			fileEdits++
			return prefix + rel + suffix
		},
	)
	if (next !== orig) {
		fs.writeFileSync(file, next)
		touched++
		totalEdits += fileEdits
	}
}

console.log(`rewrote ${totalEdits} imports across ${touched} files`)
