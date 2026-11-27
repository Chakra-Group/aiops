#!/usr/bin/env node
/**
 * Chakra Groups — DEV & UAT Functional Test Simulator (Strictly Non-PROD)
 *
 * Enforces Managing Director (MD-000) Directives:
 *   1. "dummy data should not be present in any env at all; if needed you can add simulated
 *       test data via scripts to do any functional test mimics if needed"
 *   2. "in prod we should not run any functional tests"
 *   3. "when you ship any feature to production every feature should have its functional tests
 *       implemented and validated against DEV as well as UAT"
 *
 * Usage: node tools/simulate-functional-test.mjs
 * Targets DEV (:30081) and UAT (:30082) ONLY. Strictly blocks any execution against PROD (:30083 or :8085..:8095).
 */
const TARGETS = process.env.CHAKRA_PORTAL_URL
  ? [{ env: 'CUSTOM', base: process.env.CHAKRA_PORTAL_URL }]
  : [
      { env: 'DEV', base: 'http://localhost:30081' },
      { env: 'UAT', base: 'http://localhost:30082' }
    ]

for (const t of TARGETS) {
  if (/30083|\bprod\b|:80(8[5-9]|9[0-5])\b/i.test(t.base)) {
    console.error(`BLOCKED ❌ Functional test simulations are strictly forbidden against PROD (${t.base}). Target DEV (:30081) and UAT (:30082) only.`)
    process.exit(1)
  }
}

async function getJson(base, path) {
  const res = await fetch(`${base}${path}`)
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function runForEnv({ env, base }) {
  const checks = [
    [`${env} Portal Health`, () => getJson(base, '/health'), r => r.status === 200],
    [`${env} Product-Head Priorities`, () => getJson(base, '/api/v1/workforce/product-head-priorities'), r => r.status === 200 && r.data.summary?.total_products >= 14],
    [`${env} Role-Based LLM RBAC`, () => getJson(base, '/api/v1/workforce/llm-rbac'), r => r.status === 200 && r.data.total_employees_mapped >= 22],
    [`${env} Employee Excellence Ledger`, () => getJson(base, '/api/v1/workforce/excellence'), r => r.status === 200 && r.data.total_employees >= 22],
    [`${env} Active Workers Pool`, () => getJson(base, '/api/v1/workforce/active-workers'), r => r.status === 200 && r.data.concurrent_working_employees_count >= 5],
    [`${env} Session Data Policy`, () => getJson(base, '/api/v1/session-policy'), r => r.status === 200],
    [`${env} Iniolu Semantic Zero-Placeholder & Deduplication`, () => getJson(base, '/api/v1/iniolu/events?limit=30'), r => {
      if (r.status !== 200 || !Array.isArray(r.data)) return false
      const seen = new Set()
      for (const e of r.data) {
        if ((e.organizer || '').includes('Kaala Astronomical Engine')) return false
        if ((e.venue_name || '').includes('Sacred Venue')) return false
        if (['deepa', 'gopuram', 'veena'].includes(String(e.art_form || '').toLowerCase())) return false
        const key = `${e.date}|${e.venue_name}`
        if (seen.has(key)) return false
        seen.add(key)
      }
      return true
    }],
    [`${env} Iniolu B2B Past Archive Policy`, () => getJson(base, '/api/v1/iniolu/b2b-policy'), r => r.status === 200 && String(r.data?.billing_engine || '').includes('Artha')],
    [`${env} Agile 4h Sprint Kanban Board`, () => getJson(base, '/api/v1/workforce/agile-board'), r => r.status === 200 && r.data.sprint_window_hours === 4]
  ]

  let passed = 0
  for (const [label, fn, verify] of checks) {
    const res = await fn()
    const ok = verify(res)
    if (ok) passed++
    console.log(`${ok ? 'PASS ✅' : 'FAIL ❌'} ${label} (HTTP ${res.status})`)
  }
  console.log(`${env} Functional Check Summary (${base}): ${passed}/${checks.length} passed.\n`)
  return passed === checks.length
}

async function run() {
  let allPassed = true
  for (const target of TARGETS) {
    const ok = await runForEnv(target)
    allPassed &&= ok
  }
  process.exit(allPassed ? 0 : 1)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
