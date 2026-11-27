#!/usr/bin/env node
/** MD-BUILD-011 — native K8s blue/green for stateless Deployments.
 *  Idle colour -> pre-traffic in-pod smoke -> atomic Service selector switch ->
 *  observation with auto-rollback -> old colour retained. PVCs never touched. */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flag = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const has = n => argv.includes(n)
const NS = flag('--namespace') || 'chakra-prod'
const LEDGER = path.resolve(HERE, '../data/watchdog/blue-green-ledger.jsonl')
const LOCK = path.resolve(HERE, '../data/watchdog/blue-green.lock')
const HEALTH_URL = flag('--health-url') || 'http://localhost:30083/health'
const OPERATORS = new Set(['EMP-AI-000', 'EMP-COO-006', 'EMP-GOV-007'])
const sleep = ms => new Promise(r => setTimeout(r, ms))
function kubectl (args, input) {
  const r = spawnSync('kubectl', args, { encoding: 'utf8', input, maxBuffer: 20 * 1024 * 1024 })
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error(`kubectl ${args.join(' ')}: ${(r.stderr || r.stdout || '').slice(0, 300)}`)
  return r.stdout
}
const getJson = a => JSON.parse(kubectl(a))
function append (record) { fs.mkdirSync(path.dirname(LEDGER), { recursive: true }); fs.appendFileSync(LEDGER, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n') }
function acquireLock (operator) {
  fs.mkdirSync(path.dirname(LOCK), { recursive: true })
  if (fs.existsSync(LOCK) && Date.now() - fs.statSync(LOCK).mtimeMs < 600000) throw new Error('another rollout holds the lock')
  fs.writeFileSync(LOCK, JSON.stringify({ operator, at: new Date().toISOString() }))
}
const releaseLock = () => { try { fs.unlinkSync(LOCK) } catch {} }
function activeColor (svc) { return svc.spec.selector.color === 'green' ? 'green' : 'blue' }
export function buildIdleDeployment (live, name, color, image) {
  const o = structuredClone(live), base = name.replace(/-(blue|green)$/, '')
  o.metadata = { ...o.metadata, name, labels: { ...(o.metadata.labels || {}), app: base, color }, resourceVersion: undefined, uid: undefined, creationTimestamp: undefined, generation: undefined, managedFields: undefined }
  o.spec.selector.matchLabels = { ...(o.spec.selector?.matchLabels || {}), color }
  o.spec.template.metadata.labels = { ...(o.spec.template.metadata?.labels || {}), color }
  o.spec.strategy = { type: 'RollingUpdate', rollingUpdate: { maxUnavailable: 0, maxSurge: 1 } }
  if (!o.spec.template.spec.containers?.[0]) throw new Error('deployment has no containers')
  o.spec.template.spec.containers[0].image = image
  o.status = undefined
  return o
}
const pvcSnapshot = () => getJson(['get', 'pvc', '-n', NS, '-o', 'json']).items.map(p => ({ name: p.metadata.name, bound: p.status.phase === 'Bound', volume: p.spec.volumeName })).sort((a, b) => a.name.localeCompare(b.name))
const assertDataIntact = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('PVC state changed during rollout'); if (a.some(p => !p.bound)) throw new Error('PVC not Bound') }
function smokeTestPod (name) {
  const c = getJson(['get', 'deployment', name, '-n', NS, '-o', 'json']).spec.template.spec.containers[0]
  const port = c.ports?.[0]?.containerPort || 8080
  const runtime = flag('--smoke-runtime') || 'node'
  const script = runtime === 'python3'
    ? `import urllib.request; urllib.request.urlopen('http://127.0.0.1:${port}/health', timeout=5)`
    : `fetch('http://127.0.0.1:${port}/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`
  const args = runtime === 'python3' ? ['-c', script]
    : runtime === 'wget' ? ['-q', '-O', '/dev/null', `http://127.0.0.1:${port}/health`]
      : ['-e', script]
  return spawnSync('kubectl', ['exec', `deployment/${name}`, '-n', NS, '--', runtime, ...args], { encoding: 'utf8' }).status === 0
}
async function probe (url, deployment) {
  if (deployment) return smokeTestPod(deployment)
  if (has('--skip-external-probe')) return true
  try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000); try { return (await fetch(url, { signal: c.signal })).ok } finally { clearTimeout(t) } } catch { return false }
}
const switchSelector = (svc, color) => kubectl(['patch', 'svc', svc, '-n', NS, '-p', JSON.stringify({ spec: { selector: { color } } })])
async function main () {
  const deployment = flag('--deployment'), service = flag('--service'), image = flag('--image'), operator = flag('--operator')
  if (!deployment || !service) throw new Error('--deployment and --service are required')
  const svc = getJson(['get', 'svc', service, '-n', NS, '-o', 'json'])
  const current = activeColor(svc), idle = current === 'blue' ? 'green' : 'blue', idleName = `${deployment}-${idle}`
  // Template from the traffic-serving coloured deployment when present. The
  // uncoloured base is intentionally scaled to zero between cutovers and would
  // otherwise produce a zero-replica idle deployment.
  let live
  const activeName = `${deployment}-${current}`
  const activeLookup = spawnSync('kubectl', ['get', 'deployment', activeName, '-n', NS, '-o', 'json'], { encoding: 'utf8' })
  live = activeLookup.status === 0 ? JSON.parse(activeLookup.stdout) : getJson(['get', 'deployment', deployment, '-n', NS, '-o', 'json'])
  if (!live.spec.replicas) live.spec.replicas = 1
  if (has('--plan')) {
    console.log(JSON.stringify({ mode: 'PLAN_ONLY_NO_MUTATION', namespace: NS, active_color: current, idle_color: idle, idle_deployment: idleName, current_image: live.spec.template.spec.containers[0].image, target_image: image || null }, null, 2)); return
  }
  if (!OPERATORS.has(operator)) throw new Error(`operator gate: ${operator || '(none)'}`)
  acquireLock(operator)
  try {
    if (has('--rollback')) {
      switchSelector(service, current)
      if (!await probe(HEALTH_URL, `${deployment}-${current}`)) { switchSelector(service, idle); throw new Error('rollback health failed') }
      append({ event: 'ROLLBACK', deployment, service, restored: current, operator }); console.log(JSON.stringify({ event: 'ROLLBACK_COMPLETED', color: current })); return
    }
    if (!has('--rollout')) throw new Error('choose --plan, --rollout, or --rollback')
    if (!image) throw new Error('--image required')
    if (!has('--image-digest-verified')) throw new Error('MD-BUILD-010: verify-product-image.mjs must exit 0')
    const before = pvcSnapshot()
    append({ event: 'ROLLOUT_START', deployment, service, from: current, to: idle, image, operator, pvc_before: before })
    kubectl(['apply', '-n', NS, '-f', '-'], JSON.stringify(buildIdleDeployment(live, idleName, idle, image)))
    kubectl(['rollout', 'status', `deployment/${idleName}`, '-n', NS, '--timeout=180s'])
    if (!await smokeTestPod(idleName)) { kubectl(['delete', 'deployment', idleName, '-n', NS]); throw new Error('idle smoke failed; traffic never switched') }
    switchSelector(service, idle)
    if (!await probe(HEALTH_URL, idleName)) { switchSelector(service, current); append({ event: 'AUTO_ROLLBACK', deployment, service, reason: 'health failed after switch', restored: current, operator }); throw new Error('health failed; selector restored') }
    const observe = Math.max(0, Number(flag('--observe-seconds') || 0))
    for (let e = 0; e < observe; e += 10) {
      await sleep(10000)
      if (!await probe(HEALTH_URL, idleName)) { switchSelector(service, current); append({ event: 'AUTO_ROLLBACK', deployment, service, reason: `health failed t+${e + 10}s`, restored: current, operator }); throw new Error('health failed during observation') }
    }
    assertDataIntact(before, pvcSnapshot())
    append({ event: 'ROLLOUT_COMPLETE', deployment, service, active_color: idle, image, operator, observed_seconds: observe, pvc_intact: true, old_color_retained: current })
    console.log(JSON.stringify({ event: 'ROLLOUT_COMPLETE', active_color: idle, health: 'ok', observed_seconds: observe, old_color_retained: current, pvc_intact: true }))
  } finally { releaseLock() }
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main().catch(e => { console.error(String(e.message || e)); process.exitCode = 1 })
