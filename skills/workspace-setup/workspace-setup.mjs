#!/usr/bin/env node
/**
 * Chakra Workspace Setup skill (AIOps) — bring all relevant repos to latest
 * develop, without clobbering local work. Idempotent and truthful.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
// aiops/skills/workspace-setup -> ../../.. = workspace root (parent of aiops)
const WORKSPACE = flag('--workspace', path.resolve(HERE, '../../..'))
const only = flag('--only')
const REPOS = (only ? only.split(',') : [
  'chakra-core', 'iniolu', 'chitra', 'kaala', 'sthala', 'planmytravel', 'chakra-ai',
  'artha', 'dharma', 'grihakart', 'prachara', 'chakra-agents', 'chakra-cloud',
  'chakra-samiti', 'chakra-vahan', 'chakra-krishi', 'chakra-hr', 'chakra-naama',
  'chakra-peetha', 'chakra-build', 'aiops'
]).map(s => s.trim()).filter(Boolean)

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 << 20 })
  return { status: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() }
}

let clean = 0, skipped = 0, failed = 0
for (const repo of REPOS) {
  const dir = path.join(WORKSPACE, repo)
  if (!fs.existsSync(path.join(dir, '.git'))) {
    console.log(`${repo}: SKIP (no git repo at ${dir})`)
    skipped++; continue
  }
  const dirty = git(dir, ['status', '--porcelain'])
  if (dirty.out) {
    console.log(`${repo}: SKIP (dirty working tree — refusing to clobber local work)`)
    skipped++; continue
  }
  const fetch = git(dir, ['fetch', 'origin', '--prune'])
  if (fetch.status !== 0) {
    console.log(`${repo}: FAIL (fetch: ${fetch.err.slice(0, 120)})`)
    failed++; continue
  }
  const branches = git(dir, ['branch', '-r', '--list', 'origin/develop'])
  const target = branches.out ? 'develop' : (git(dir, ['symbolic-ref', 'refs/remotes/origin/HEAD', '--short']).out || 'main').replace('origin/', '')
  const co = git(dir, ['checkout', target])
  if (co.status !== 0) { console.log(`${repo}: FAIL (checkout ${target})`); failed++; continue }
  const pull = git(dir, ['pull', '--ff-only', 'origin', target])
  if (pull.status !== 0) { console.log(`${repo}: FAIL (pull --ff-only ${target}: ${pull.err.slice(0, 120)})`); failed++; continue }
  const sha = git(dir, ['rev-parse', '--short', 'HEAD']).out
  const remoteSha = git(dir, ['rev-parse', '--short', `origin/${target}`]).out
  const ok = sha === remoteSha
  console.log(`${repo}: ${ok ? 'READY' : 'MISMATCH'} ${target} @ ${sha} (origin ${remoteSha})`)
  if (ok) clean++; else failed++
}
console.log(`WORKSPACE_SETUP_SUMMARY ready=${clean} skipped=${skipped} failed=${failed}`)
if (failed > 0) process.exit(1)
