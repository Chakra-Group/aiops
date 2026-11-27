#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const GATE = path.resolve(HERE, '../../tools/done-done-gate.mjs')
const argv = process.argv.slice(2)
const i = argv.indexOf('--product')
const args = i >= 0 ? [argv[i + 1]] : []
const r = spawnSync(process.execPath, [GATE, ...args], { stdio: 'inherit' })
process.exit(r.status == null ? 1 : r.status)
