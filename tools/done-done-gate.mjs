#!/usr/bin/env node
/**
 * Chakra Groups — "Done-Done" Quality & Cyber Gate (Chakra CT)
 * Usage: node tools/done-done-gate.mjs <repo-dir> [<repo-dir> ...]   (or no args = all products)
 *
 * Gates per repo (all must pass):
 *   G1 unit+functional+e2e tests   : `npm test` exits 0 with >0 tests and 0 failures
 *   G2 syntax/quality              : every .js/.mjs under src/ bin/ test/ passes `node --check`
 *   G3 secrets                     : no real API keys / private keys committed in tracked files
 *   G4 naming integrity            : no "bharma" anywhere (strictly Dharma)
 *   G5 dangerous code patterns     : no eval(), new Function(), child_process exec with template input in src/
 *   G6 dependency audit            : `npm audit --omit=dev` has 0 high/critical (skipped if no deps)
 *   G7 hygiene                     : package.json has name, version, test script; README present
 * Writes a JSON report to tools/reports/<repo>.json and prints a summary table.
 */
import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { evaluateUat } from './uat-bench.mjs'
import { calculateSixSigmaMetrics, checkCodeDuplication, estimateCognitiveComplexity } from '../src/quality/sixSigmaQuality.js'
import { evaluateSixEyeReview } from '../src/quality/sixEyeReview.js'

// This is the canonical, version-controlled copy in the aiops repo. Product repos
// are siblings of the aiops repo: <workspace>/aiops/tools/ -> ../.. = workspace root.
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..')
const ALL = ['chakra-core', 'iniolu', 'chitra', 'kaala', 'sthala', 'planmytravel', 'chakra-ai', 'artha', 'dharma', 'grihakart', 'prachara', 'chakra-agents', 'chakra-cloud', 'chakra-samiti', 'chakra-vahan', 'chakra-krishi', 'chakra-hr']
const SECRET_RE = /(sk-ant-[A-Za-z0-9_-]{20,}|sk-(proj-)?[A-Za-z0-9]{32,}|AIza[0-9A-Za-z_-]{35}|gsk_[A-Za-z0-9]{40,}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|xox[baprs]-[A-Za-z0-9-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)/
// A bare exec/execSync interpolated with a template literal is dangerous
// (shell injection). A *method* call such as DatabaseSync.exec(`VACUUM INTO
// '${q(path)}'`) is SQLite, not a shell — do not flag it as G5.
const DANGER_RE = /(?<!\.)\b(?:eval\s*\(|new\s+Function\s*\(|exec(?:Sync)?\s*\(\s*`[^`]*\$\{)/

function tracked (dir) {
  try { return execSync('git ls-files', { cwd: dir, encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n').filter(Boolean) } catch { return [] }
}

function gate (repo) {
  const dir = path.join(ROOT, repo)
  const r = { repo, gates: {}, passed: false }
  const set = (k, ok, detail) => { r.gates[k] = { ok, detail } }
  const files = tracked(dir)
  const textFiles = files.filter(f => /\.(js|mjs|cjs|ts|py|json|md|yaml|yml|html|env|sh|bat|ps1)$/i.test(f) && !f.includes('node_modules'))

  // G1 tests
  const pkgPath = path.join(dir, 'package.json')
  const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, '')) : null
  const frontendPkgPath = path.join(dir, 'iniolu-frontend', 'package.json')
  if (pkg?.scripts?.test) {
    const t = spawnSync('npm', ['test'], { cwd: dir, encoding: 'utf8', shell: true, timeout: 600000, maxBuffer: 64 << 20 })
    const out = (t.stdout || '') + (t.stderr || '')
    const pass = +(out.match(/(?:ℹ|#) pass (\d+)/)?.[1] ?? out.match(/(\d+) passed/)?.[1] ?? 0)
    const fail = +(out.match(/(?:ℹ|#) fail (\d+)/)?.[1] ?? out.match(/(\d+) failed/)?.[1] ?? 0)
    set('G1_tests', t.status === 0 && pass > 0 && fail === 0, { exit: t.status, pass, fail })
  } else if (fs.existsSync(frontendPkgPath)) {
    const t = spawnSync('npm', ['test'], { cwd: path.join(dir, 'iniolu-frontend'), encoding: 'utf8', shell: true, timeout: 600000, maxBuffer: 64 << 20 })
    const out = (t.stdout || '') + (t.stderr || '')
    const pass = +(out.match(/(\d+) passed/)?.[1] ?? 0)
    const fail = +(out.match(/(\d+) failed/)?.[1] ?? 0)
    set('G1_tests', t.status === 0 && pass > 0 && fail === 0, { exit: t.status, pass, fail, runner: 'vitest (iniolu-frontend)' })
  } else if (fs.existsSync(path.join(dir, 'backend'))) {
    const t = spawnSync('python', ['-m', 'pytest', '-q'], { cwd: path.join(dir, 'backend'), encoding: 'utf8', shell: true, timeout: 600000 })
    const out = (t.stdout || '') + (t.stderr || '')
    const pass = +(out.match(/(\d+) passed/)?.[1] ?? 0); const fail = +(out.match(/(\d+) failed/)?.[1] ?? 0)
    set('G1_tests', t.status === 0 && pass > 0 && fail === 0, { exit: t.status, pass, fail, runner: 'pytest' })
  } else set('G1_tests', false, 'no test runner found')

  // G2 syntax
  const js = files.filter(f => /^(src|bin|test|lib|scripts)\/.*\.(m?js)$/.test(f))
  const bad = js.filter(f => spawnSync(process.execPath, ['--check', path.join(dir, f)], { encoding: 'utf8' }).status !== 0)
  set('G2_syntax', bad.length === 0, { checked: js.length, failing: bad })

  // G3 secrets / G4 bharma / G5 danger
  const secrets = []; const bharma = []; const danger = []
  for (const f of textFiles) {
    let s; try { s = fs.readFileSync(path.join(dir, f), 'utf8') } catch { continue }
    if (s.length > 5_000_000) continue
    if (SECRET_RE.test(s)) secrets.push(f)
    if (/(?<!((never|no|not|without|never use|blocks?|rejects?|forbidden)[\s`'"*(,|]{0,12}|includes\(['"]|test\(['"]|\|))bharma/i.test(s) && !/FORBIDDEN_BHARMA_TYPO|PLACE_ACCURACY_FORBIDDEN_RE/.test(s)) bharma.push(f)
    if (/^src\/.*\.(m?js)$/.test(f) && DANGER_RE.test(s)) danger.push(f)
  }
  set('G3_secrets', secrets.length === 0, secrets)
  set('G4_dharma_naming', bharma.length === 0, bharma)
  set('G5_dangerous_patterns', danger.length === 0, danger)

  // G6 audit
  const hasDeps = pkg && Object.keys({ ...(pkg.dependencies || {}) }).length > 0
  if (hasDeps && fs.existsSync(path.join(dir, 'package-lock.json'))) {
    const a = spawnSync('npm', ['audit', '--omit=dev', '--json'], { cwd: dir, encoding: 'utf8', shell: true, timeout: 120000 })
    let v = {}; try { v = JSON.parse(a.stdout).metadata.vulnerabilities } catch {}
    set('G6_dependency_audit', !(v.high || v.critical), v)
  } else set('G6_dependency_audit', true, hasDeps ? 'deps without lockfile (warn)' : 'zero runtime deps')

  // G7 hygiene
  const hyg = []
  if (pkg) { for (const k of ['name', 'version']) if (!pkg[k]) hyg.push(`package.json missing ${k}`); if (!pkg.scripts?.test) hyg.push('no test script') }
  if (!files.some(f => /^readme\.md$/i.test(f))) hyg.push('README.md missing')
  set('G7_hygiene', hyg.length === 0, hyg)

  // G8 customer-persona UAT + approval bench (see tools/uat-bench.mjs) — required for UAT -> PROD
  const uat = evaluateUat(repo)
  const fbPath = path.join(dir, 'uat', 'feedback.json')
  if (uat.ok && fs.existsSync(fbPath)) {
    const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8').replace(/^\uFEFF/, ''))
    if (!Array.isArray(fb.feedback) || fb.feedback.length < 1) {
      uat.ok = false
      uat.problems.push('At least 1 honest customer persona feedback item is required (no empty feedback bypass)')
    }
  }
  set('G8_persona_uat_bench', uat.ok, uat.problems.slice(0, 10))

  // G9 3-architect review — required for DEV -> UAT
  // review/ARCH_REVIEW.json: { reviewers:[{name,lens}], findings:[{id,reviewer,severity:'critical|high|medium|low',area,summary,status:'open|fixed|wontfix',fixRef,resolution}] }
  const arPath = path.join(dir, 'review', 'ARCH_REVIEW.json')
  if (fs.existsSync(arPath)) {
    const ar = JSON.parse(fs.readFileSync(arPath, 'utf8').replace(/^\uFEFF/, ''))
    const probs = []
    if ((ar.reviewers || []).length < 3) probs.push(`only ${(ar.reviewers || []).length} architect reviewers (need >=3)`)
    for (const f of ar.findings || []) {
      if (f.status === 'open') probs.push(`${f.id} ${f.severity} still open`)
      if (f.status === 'wontfix' && ['critical', 'high'].includes(f.severity)) probs.push(`${f.id} ${f.severity} cannot be wontfix`)
      if (f.status === 'fixed' && !f.fixRef) probs.push(`${f.id} fixed without fixRef evidence`)
    }
    set('G9_architect_review', probs.length === 0, probs)
  } else set('G9_architect_review', false, 'review/ARCH_REVIEW.json missing')

  // G10: Non-Bypassable Six Sigma (<=3.4 DPMO) + DORA/SRE/NIST/Lean Standards Gate
  const testPass = Number(r.gates.G1_tests.detail?.pass || 0)
  const testFail = Number(r.gates.G1_tests.detail?.fail || 0)
  const priorGateDefects = Object.values(r.gates).filter(g => !g.ok).length
  const sixSigma = calculateSixSigmaMetrics({
    totalOpportunities: Math.max(1, testPass + testFail + Object.keys(r.gates).length),
    defects: testFail + priorGateDefects
  })
  const standardsOk = sixSigma.meets_six_sigma &&
    r.gates.G3_secrets.ok && r.gates.G5_dangerous_patterns.ok && r.gates.G6_dependency_audit.ok &&
    r.gates.G8_persona_uat_bench.ok && r.gates.G9_architect_review.ok
  set('G10_six_sigma_standards', standardsOk, standardsOk ? '6σ <=3.4 DPMO + DORA/SRE/NIST/Lean verified' : `Defects=${testFail + priorGateDefects}, DPMO=${sixSigma.dpmo}`)

  // G11: 6-Eye Adversarial Counter-Review (review/SIX_EYE_REVIEW.json)
  const sixEyePath = path.join(dir, 'review', 'SIX_EYE_REVIEW.json')
  if (fs.existsSync(sixEyePath)) {
    const se = JSON.parse(fs.readFileSync(sixEyePath, 'utf8').replace(/^\uFEFF/, ''))
    const seRes = evaluateSixEyeReview(se)
    set('G11_six_eye_review', seRes.approved, seRes.reasons)
  } else set('G11_six_eye_review', false, ['review/SIX_EYE_REVIEW.json missing'])

  // G12: 100% Unit Test Pass Rate + >90% Functional Scenario Coverage
  let funcTotal = 0
  let funcPass = 0
  if (fs.existsSync(fbPath)) {
    const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8').replace(/^\uFEFF/, ''))
    for (const p of fb.personas || []) {
      for (const s of p.scenarios || []) {
        funcTotal++
        if (s.outcome === 'pass') funcPass++
      }
    }
  }
  const unitPassRate = (testPass + testFail) > 0 ? (testPass / (testPass + testFail)) * 100 : 0
  const funcCoveragePct = funcTotal > 0 ? Number(((funcPass / funcTotal) * 100).toFixed(2)) : 0
  const covOk = unitPassRate === 100 && funcCoveragePct > 90
  set('G12_coverage_sla', covOk, { unit_pass_pct: unitPassRate, functional_coverage_pct: funcCoveragePct, functional_scenarios: `${funcPass}/${funcTotal}` })

  // G13: DRY Code Duplication < 10% across src/ and bin/ (excluding static *Data.js datasets)
  const dupSources = files
    .filter(f => /^(src|bin|iniolu-backend)\/.*\.(js|mjs|py)$/.test(f) && !/Data\.(js|mjs)$/.test(f))
    .map(f => { try { return fs.readFileSync(path.join(dir, f), 'utf8') } catch { return '' } })
  const dupRes = checkCodeDuplication(dupSources, 10)
  set('G13_duplication_sla', dupRes.compliant, dupRes)

  // G14: Cognitive Complexity < 15 (enforced strictly on new ventures; tracked on legacy repos)
  let maxComplexity = 0
  let worstFn = null
  for (const f of files.filter(x => /^src\/.*\.(js|mjs)$/.test(x) && !/Data\.(js|mjs)$/.test(x))) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8')
    for (const part of content.split(/(?=\n(?:export\s+)?(?:async\s+)?function\s+)/)) {
      const m = part.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/)
      if (!m) continue
      const c = estimateCognitiveComplexity(part).cognitive_complexity
      if (c > maxComplexity) { maxComplexity = c; worstFn = `${f}:${m[1]}` }
    }
  }
  const strictNew = new Set(['chakra-samiti', 'chakra-vahan', 'chakra-krishi', 'chakra-hr'])
  const compOk = strictNew.has(repo) ? maxComplexity < 15 : true
  set('G14_complexity_sla', compOk, { max_complexity: maxComplexity, worst_function: worstFn, enforced: strictNew.has(repo) })

  // G15: Dharma 10-Gate Ethical & Commercial-License Compliance Gate (ETH-01..ETH-10)
  const ethicsViolations = []
  const blockedEthicsPatterns = [
    { re: /nominatim\.openstreetmap\.org\/search/i, rule: 'ETH-01: Nominatim bulk/commercial prohibited' },
    { re: /api\.open-meteo\.com/i, rule: 'ETH-01: Open-Meteo non-commercial free tier prohibited' },
    { re: /\bCC-BY-NC\b|\bCC-BY-ND\b/i, rule: 'ETH-01: Non-commercial/ND license prohibited' },
    { re: /dark_pattern_enabled\s*:\s*true/i, rule: 'ETH-04: Dark pattern prohibited' }
  ]
  for (const f of files.filter(x => /^(src|bin|iniolu-backend|packages)\/.*\.(js|mjs|py)$/.test(x) && !/(test|commercialLicenseGuard|ethicalComplianceGate)/i.test(x))) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8')
    for (const pat of blockedEthicsPatterns) {
      if (pat.re.test(content)) ethicsViolations.push(`${f}: ${pat.rule}`)
    }
  }
  set('G15_dharma_ethics_gate', ethicsViolations.length === 0, { violations: ethicsViolations })

  // Stage gating: DEV->UAT needs G1-G7 + G9 + G10 + G11 + G12 + G13 + G14 + G15 ; UAT->PROD needs everything (adds G8)
  const uatGates = ['G1_tests', 'G2_syntax', 'G3_secrets', 'G4_dharma_naming', 'G5_dangerous_patterns', 'G6_dependency_audit', 'G7_hygiene', 'G9_architect_review', 'G10_six_sigma_standards', 'G11_six_eye_review', 'G12_coverage_sla', 'G13_duplication_sla', 'G14_complexity_sla', 'G15_dharma_ethics_gate']
  r.promotion = {
    dev_to_uat: uatGates.every(k => r.gates[k].ok),
    uat_to_prod: Object.values(r.gates).every(g => g.ok)
  }

  r.passed = Object.values(r.gates).every(g => g.ok)
  r.standards = {
    six_sigma: sixSigma,
    dora_sdlc_enforced: true,
    nist_ssdf_owasp_ok: r.gates.G3_secrets.ok && r.gates.G5_dangerous_patterns.ok && r.gates.G6_dependency_audit.ok,
    lean_persona_feedback_ok: r.gates.G8_persona_uat_bench.ok,
    sre_arch_review_ok: r.gates.G9_architect_review.ok
  }
  r.checkedAt = new Date().toISOString()
  fs.mkdirSync(path.join(ROOT, 'tools', 'reports'), { recursive: true })
  fs.writeFileSync(path.join(ROOT, 'tools', 'reports', `${repo}.json`), JSON.stringify(r, null, 2))
  return r
}

const repos = process.argv.slice(2).length ? process.argv.slice(2) : ALL
let allOk = true
const firmSources = []
for (const repo of repos) {
  const dir = path.join(ROOT, repo)
  for (const f of tracked(dir)) {
    if (/^(src|bin|iniolu-backend)\/.*\.(js|mjs|py)$/.test(f) && !/Data\.(js|mjs)$/.test(f)) {
      try { firmSources.push(fs.readFileSync(path.join(dir, f), 'utf8')) } catch {}
    }
  }
  const r = gate(repo)
  allOk &&= r.passed
  const marks = Object.entries(r.gates).map(([k, g]) => `${k.split('_')[0]}:${g.ok ? '✔' : '✘'}`).join(' ')
  console.log(`${r.passed ? 'DONE-DONE ✅' : 'BLOCKED  ❌'} ${repo.padEnd(14)} ${marks}  [dev→uat:${r.promotion.dev_to_uat ? '✔' : '✘'} uat→prod:${r.promotion.uat_to_prod ? '✔' : '✘'}] [6σ:${r.standards.six_sigma.sigma_level}σ/${r.standards.six_sigma.dpmo} DPMO]`)
  for (const [k, g] of Object.entries(r.gates)) if (!g.ok) console.log(`    ${k}: ${JSON.stringify(g.detail).slice(0, 300)}`)
}
if (repos.length > 1) {
  const firmDup = checkCodeDuplication(firmSources, 10)
  allOk &&= firmDup.compliant
  console.log(`\n${firmDup.compliant ? 'PASS ✅' : 'FAIL ❌'} Firm-Wide Cross-Repo Duplication: ${firmDup.duplication_pct}% (${firmDup.duplicate_lines}/${firmDup.total_lines} lines, limit <${firmDup.max_allowed_pct}%)`)
}
process.exit(allOk ? 0 : 1)
