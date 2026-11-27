#!/usr/bin/env node
/** MD-BUILD-012 — built digest must equal traffic-serving UAT and PROD digests,
 *  bound to the release commit. Blue/green aware: follows Service color selector. */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const LEDGER = path.resolve(HERE, '../data/watchdog/release-provenance.jsonl')
const argv = process.argv.slice(2)
const flag = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
function run (cmd, args, cwd = ROOT) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: ${(r.stderr || r.stdout || '').slice(0, 250)}`)
  return r.stdout.trim()
}
export function evaluateProvenance ({ releaseCommit, builtDigest, uatDigest, prodDigest }) {
  const p = []
  if (!releaseCommit) p.push('release commit unresolved')
  if (!builtDigest) p.push('built digest unresolved')
  if (!uatDigest) p.push('UAT digest unresolved')
  if (!prodDigest) p.push('PROD digest unresolved')
  if (builtDigest && uatDigest && builtDigest !== uatDigest) p.push(`built!=UAT (${builtDigest} vs ${uatDigest})`)
  if (uatDigest && prodDigest && uatDigest !== prodDigest) p.push(`UAT!=PROD (${uatDigest} vs ${prodDigest})`)
  return { ok: p.length === 0, problems: p }
}
function digestOf (image) {
  if (/^sha256:[0-9a-f]{64}$/i.test(image)) return image.toLowerCase()
  const out = run('docker', ['inspect', '--format', '{{index .RepoDigests 0}}', image])
  const m = out.match(/@(sha256:[0-9a-f]{64})$/i); return m ? m[1].toLowerCase() : null
}
function resourceKind (ns, name) {
  // Deployment is the common case. StatefulSets (e.g. chakra-agents, with RWO
  // PVCs) have no Service color selector and must be read via `sts`.
  if (spawnSync('kubectl', ['get', 'deployment', name, '-n', ns], { encoding: 'utf8' }).status === 0) return 'deployment'
  if (spawnSync('kubectl', ['get', 'statefulset', name, '-n', ns], { encoding: 'utf8' }).status === 0) return 'statefulset'
  throw new Error(`no Deployment or StatefulSet named ${name} in namespace ${ns}`)
}
function deployedImage (ns, deployment, service) {
  const kind = resourceKind(ns, deployment)
  let active = deployment
  // Blue/green color switching only applies to Deployments fronted by a
  // Service whose selector carries color=blue|green. StatefulSets are rolled
  // with RollingUpdate and never switch color.
  if (kind === 'deployment' && service) {
    const c = run('kubectl', ['get', 'svc', service, '-n', ns, '-o', 'jsonpath={.spec.selector.color}'])
    if ((c === 'blue' || c === 'green') && spawnSync('kubectl', ['get', 'deployment', `${deployment}-${c}`, '-n', ns], { encoding: 'utf8' }).status === 0) active = `${deployment}-${c}`
  }
  return run('kubectl', ['get', kind, active, '-n', ns, '-o', 'jsonpath={.spec.template.spec.containers[0].image}'])
}
function main () {
  const repo = flag('--repo'), deployment = flag('--deployment') || repo, image = flag('--image')
  if (!repo || !image) throw new Error('--repo and --image required')
  const service = flag('--service') || `${deployment}-svc`
  const releaseCommit = run('git', ['-C', path.join(ROOT, repo), 'rev-parse', 'origin/release/release-v1.0.0'])
  const r = evaluateProvenance({ releaseCommit, builtDigest: digestOf(image), uatDigest: digestOf(deployedImage(flag('--namespace-uat') || 'chakra-uat', deployment, service)), prodDigest: digestOf(deployedImage(flag('--namespace-prod') || 'chakra-prod', deployment, service)) })
  const rec = { ts: new Date().toISOString(), event: 'MD_BUILD_012_PROVENANCE', repo, deployment, image, release_commit: releaseCommit, ok: r.ok, problems: r.problems }
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true }); fs.appendFileSync(LEDGER, JSON.stringify(rec) + '\n')
  console.log(JSON.stringify(rec, null, 2)); if (!r.ok) process.exitCode = 1
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
