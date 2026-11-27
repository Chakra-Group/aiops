#!/usr/bin/env node
/**
 * Chakra Groups — Customer-Persona UAT & Feature Approval Bench (Chakra CT)
 * Usage: node tools/uat-bench.mjs <repo-dir> [...]   (no args = all products)
 *
 * Input  : <repo>/uat/feedback.json   (written by persona role-play during UAT)
 * Output : <repo>/uat/prioritized-backlog.json + <repo>/uat/UAT_REPORT.md
 *
 * feedback.json schema:
 * {
 *   "product": "artha",
 *   "personas": [{ "id": "CUST-ARTHA-01", "name": "...", "profile": "...",
 *                  "scenarios": [{ "title": "...", "steps": ["..."], "outcome": "pass|friction|fail", "evidence": "cmd + observed output" }] }],
 *   "feedback": [{ "id": "FB-01", "persona": "CUST-ARTHA-01", "type": "bug|friction|feature",
 *                  "severity": "P0|P1|P2|P3", "summary": "...", "status": "open|fixed|deferred", "fixRef": "commit/test name" }],
 *   "bench": [{ "member": "Chanakya", "role": "CEO", "feedbackId": "FB-01",
 *               "vote": "approve|reject|defer", "impact": 1-5, "effort": 1-5, "rationale": "..." }]
 * }
 *
 * Bench = Chanakya (CEO), Sutradhara (CTO), Kautilya (CFO), Rakshaka (CISO), Pracharak (CMO) + product owner.
 * Decision: approved if approvals > half of votes cast. Priority score = mean(impact) * approvalRatio / mean(effort).
 * UAT gate (G8) passes when: >=3 personas, every persona ran >=2 scenarios, no 'fail' scenario left unfixed,
 * zero open P0/P1 bugs, every feedback item has >=5 bench votes, and all P0/P1 approved items are fixed.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const ALL = ['chakra-core', 'iniolu', 'chitra', 'kaala', 'sthala', 'planmytravel', 'chakra-ai', 'artha', 'dharma', 'grihakart', 'prachara', 'chakra-agents', 'chakra-cloud']
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0

export function evaluateUat (repo) {
  const file = path.join(ROOT, repo, 'uat', 'feedback.json')
  if (!fs.existsSync(file)) return { repo, ok: false, problems: ['uat/feedback.json missing'] }
  const fb = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  const problems = []
  const personas = fb.personas || []; const items = fb.feedback || []; const bench = fb.bench || []

  if (personas.length < 3) problems.push(`only ${personas.length} personas (need >=3)`)
  for (const p of personas) {
    if ((p.scenarios || []).length < 2) problems.push(`${p.id} ran <2 scenarios`)
  }

  const backlog = items.map(it => {
    const votes = bench.filter(v => v.feedbackId === it.id)
    const approvals = votes.filter(v => v.vote === 'approve').length
    const approved = votes.length > 0 && approvals > votes.length / 2
    const ratio = votes.length ? approvals / votes.length : 0
    const score = +(mean(votes.map(v => +v.impact || 0)) * ratio / Math.max(1, mean(votes.map(v => +v.effort || 1)))).toFixed(2)
    if (votes.length < 5) problems.push(`${it.id} has ${votes.length} bench votes (need >=5)`)
    if (it.type === 'bug' && ['P0', 'P1'].includes(it.severity) && it.status === 'open') problems.push(`${it.id} open ${it.severity} bug`)
    if (approved && ['P0', 'P1'].includes(it.severity) && it.status !== 'fixed') problems.push(`${it.id} approved ${it.severity} not fixed`)
    return { ...it, votes: votes.length, approvals, decision: approved ? 'APPROVED' : votes.some(v => v.vote === 'defer') ? 'DEFERRED' : 'REJECTED', priorityScore: score }
  }).sort((a, b) => (a.severity || 'P9').localeCompare(b.severity || 'P9') || b.priorityScore - a.priorityScore)

  const failsOpen = personas.flatMap(p => (p.scenarios || []).filter(s => s.outcome === 'fail').map(s => `${p.id}: ${s.title}`))
  // a failing scenario is acceptable only if a fixed feedback item references it
  for (const f of failsOpen) {
    if (!items.some(i => i.status === 'fixed' && f.includes(i.persona))) problems.push(`unfixed failing scenario ${f}`)
  }

  const out = { repo, ok: problems.length === 0, personas: personas.length, scenarios: personas.reduce((n, p) => n + (p.scenarios || []).length, 0), feedbackItems: items.length, problems, backlog, evaluatedAt: new Date().toISOString() }
  fs.writeFileSync(path.join(ROOT, repo, 'uat', 'prioritized-backlog.json'), JSON.stringify(out, null, 2))

  const md = [`# UAT Report — ${fb.product || repo}`, '', `**Gate:** ${out.ok ? '✅ PASSED' : '❌ BLOCKED'} · Personas: ${out.personas} · Scenarios: ${out.scenarios} · Feedback items: ${out.feedbackItems}`, '',
    '## Personas', ...personas.map(p => `- **${p.name}** (${p.id}) — ${p.profile} · ${(p.scenarios || []).map(s => `${s.title}: ${s.outcome}`).join('; ')}`), '',
    '## Prioritized Backlog (Approval Bench)', '| # | ID | Sev | Type | Summary | Decision | Votes | Score | Status |', '|---|---|---|---|---|---|---|---|---|',
    ...backlog.map((b, i) => `| ${i + 1} | ${b.id} | ${b.severity} | ${b.type} | ${String(b.summary).replace(/\|/g, '/')} | ${b.decision} | ${b.approvals}/${b.votes} | ${b.priorityScore} | ${b.status} |`), '',
    problems.length ? '## Blocking Problems\n' + problems.map(p => `- ${p}`).join('\n') : '']
  fs.writeFileSync(path.join(ROOT, repo, 'uat', 'UAT_REPORT.md'), md.join('\n'))
  return out
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('uat-bench.mjs')) {
  const repos = process.argv.slice(2).length ? process.argv.slice(2) : ALL
  let all = true
  for (const r of repos) {
    const o = evaluateUat(r); all &&= o.ok
    console.log(`${o.ok ? 'UAT PASSED ✅' : 'UAT BLOCKED ❌'} ${r.padEnd(14)} personas=${o.personas ?? 0} scenarios=${o.scenarios ?? 0} feedback=${o.feedbackItems ?? 0}`)
    for (const p of o.problems.slice(0, 8)) console.log(`    - ${p}`)
  }
  process.exit(all ? 0 : 1)
}
