#!/usr/bin/env node
/**
 * MD-BUILD-POSTDEPLOY — post-deploy functional gate (consistent for ALL products).
 *
 * Run the product's FUNCTIONAL suite against the URL of the NEWLY DEPLOYED image
 * in an environment, and fail if it does not pass. This closes the gap where
 * unit tests (done-done-gate G1) and in-pod /health smoke passed but a deployed
 * service was functionally broken (issue #203 comment 7220611834, :3000 defect).
 *
 * Usage:
 *   node chakra-post-deploy-gate.mjs --product iniolu --env dev --url http://localhost:3000
 *   node chakra-post-deploy-gate.mjs --product grihakart --env uat --url http://localhost:30082
 *   node chakra-post-deploy-gate.mjs --product iniolu --env prod --url http://localhost:30083/apps/iniolu
 *
 * A product with no functional suite is reported HONESTLY as NO_FUNCTIONAL_SUITE
 * (never a fabricated pass) — the registry must be extended for that product.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..') // workspace root (aiops/scripts -> ../.. = workspace)
const argv = process.argv.slice(2)
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const product = flag('--product')
const env = flag('--env', 'dev')
const url = flag('--url')
const image = flag('--image', '')
const LEDGER = path.resolve(HERE, '../data/watchdog/post-deploy-gate.jsonl')

// product -> { cwd (relative to workspace), script (npm script run with CYPRESS_BASE_URL) }
const REGISTRY = {
  iniolu: { cwd: 'iniolu/iniolu-frontend', script: 'test:cypress' },
  chitra: { cwd: 'chitra/apps/web', script: 'test:cypress' },
  grihakart: { cwd: 'grihakart', script: 'test:cypress' },
  planmytravel: { cwd: 'planmytravel', script: 'test:cypress' }
}

function record(obj) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true })
  fs.appendFileSync(LEDGER, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n')
}

function run() {
  if (!product) { console.error('POST_DEPLOY_GATE_FAIL missing --product'); process.exit(2) }
  if (!url) { console.error('POST_DEPLOY_GATE_FAIL missing --url (deployed service URL of the new image)'); process.exit(2) }
  const spec = REGISTRY[product]
  if (!spec) {
    const out = { product, env, url, image, status: 'NO_FUNCTIONAL_SUITE', detail: `no functional suite registered for ${product}` }
    record(out)
    console.error('POST_DEPLOY_GATE_NO_SUITE ' + JSON.stringify(out))
    process.exit(3) // never a fabricated pass
  }
  const cwd = path.join(ROOT, spec.cwd)
  if (!fs.existsSync(path.join(cwd, 'package.json'))) {
    record({ product, env, url, image, status: 'FAIL', detail: 'package.json missing at ' + cwd })
    console.error('POST_DEPLOY_GATE_FAIL missing suite at ' + cwd)
    process.exit(1)
  }
  // Reachability precheck against the DEPLOYED service first.
  let reachable = false
  try {
    const r = spawnSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '8', url], { encoding: 'utf8' })
    reachable = /^2\d\d$/.test((r.stdout || '').trim())
  } catch {}
  if (!reachable) {
    record({ product, env, url, image, status: 'FAIL', detail: 'deployed URL not reachable (non-2xx)' })
    console.error('POST_DEPLOY_GATE_FAIL deployed URL unreachable: ' + url)
    process.exit(1)
  }
  // Run the product's functional suite against the deployed URL.
  const r = spawnSync('npm', ['run', spec.script, '--', '--env', `CYPRESS_BASE_URL=${url}`], {
    cwd, encoding: 'utf8', shell: true, timeout: 600000, maxBuffer: 64 << 20,
    env: { ...process.env, CYPRESS_BASE_URL: url }
  })
  const passed = r.status === 0
  record({ product, env, url, image, status: passed ? 'PASS' : 'FAIL', exit: r.status })
  if (!passed) {
    console.error('POST_DEPLOY_GATE_FAIL ' + product + ' functional suite failed against ' + url)
    console.error((r.stdout || '') + (r.stderr || ''))
    process.exit(1)
  }
  console.log('POST_DEPLOY_GATE_PASS ' + JSON.stringify({ product, env, url, image }))
}

run()
