/**
 * ChakraCore (@chakra/core) — Six Sigma (6σ) Product Development & Quality Engine (DMAIC / DMADV)
 * Maps Chakra Groups' G1-G9 gates, UAT persona feedback, and observability metrics to
 * Six Sigma DPMO (<= 3.4 Defects Per Million Opportunities = 99.99966% defect-free yield).
 */

export const SIX_SIGMA_TARGET = {
  target_sigma: 6.0,
  max_dpmo: 3.4,
  min_yield_pct: 99.99966,
  methodology: 'DMAIC (Existing Products) / DMADV (New Product Lines)'
}

export const DMAIC_STAGE_MAPPING = {
  Define: 'Core Goal Charter (PRODUCT_PLAN.md), Target Customer Personas (uat/feedback.json), Zero-Dummy Policy',
  Measure: 'Unit/E2E Test Counts (G1), Observability SLO & Latency (observabilityAndFinops.js)',
  Analyze: 'Honest Persona Feedback Triage (G8), Architecture & Security Review (G9), Root-Cause Defect Classification',
  Improve: 'Concrete Code Fixes Linked to fixRef, Employee Excellence Remediation',
  Control: 'Automated G1-G7 Gates, Dharma Zero-Trust IAM, ProductionDataAccuracyGate & DR Snapshots'
}

export const INDUSTRY_BEST_PRACTICES = {
  six_sigma: {
    name: 'Six Sigma (6σ DMAIC / DMADV)',
    target: '<= 3.4 DPMO (99.99966% defect-free yield)',
    enforced_by: 'calculateSixSigmaMetrics + G1-G9 Gates'
  },
  dora_elite: {
    name: 'DORA Metrics (DevOps Research & Assessment)',
    targets: { change_failure_rate_max_pct: 5.0, mttr_max_minutes: 60, lead_time: 'on-demand' },
    enforced_by: '5-Stage Agentic SDLC + Rancher K8s Rollouts'
  },
  sre_error_budget: {
    name: 'Google SRE (SLIs, SLOs & Error Budgets)',
    target: '99.9% SLO (freeze non-reliability releases if error budget exhausted)',
    enforced_by: 'observabilityAndFinops.js'
  },
  nist_ssdf_owasp: {
    name: 'NIST SSDF & OWASP ASVS Zero-Trust Security',
    target: 'Zero hardcoded secrets, zero dangerous patterns, 100% Red-Team pass',
    enforced_by: 'Dharma (@chakra/dharma) + G3/G5/G6/G9 Gates'
  },
  lean_persona_loop: {
    name: 'Lean Customer Feedback & ISO/IEC 25010 Quality',
    target: 'Every release incorporates honest end-customer persona feedback',
    enforced_by: 'G8 Persona UAT Bench (uat/feedback.json)'
  },
  clean_code_complexity: {
    name: 'Sonar / Clean-Code Cognitive Complexity',
    target: 'Cognitive Complexity strictly < 15 per function',
    enforced_by: 'checkCognitiveComplexity (< 15)'
  },
  dry_duplication: {
    name: 'DRY / Sonar Duplicate Code Threshold',
    target: 'Duplicate code strictly < 10% across firm',
    enforced_by: 'checkCodeDuplication (< 10%) + G13_duplication_sla'
  }
}

export function estimateCognitiveComplexity(fnSource = '') {
  const lines = String(fnSource).split(/\r?\n/)
  let complexity = 0
  let braceDepth = 0
  let baseDepth = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('//') || line.startsWith('*')) continue
    const opens = (line.match(/\{/g) || []).length
    const closes = (line.match(/\}/g) || []).length
    if (baseDepth === null && opens > 0) baseDepth = braceDepth
    const nesting = Math.max(0, braceDepth - (baseDepth ?? 0) - 1)
    if (/^(if|else\s+if|for|while|switch|catch)\b/.test(line) || /\?\s*[^:]+\s*:/.test(line)) {
      complexity += 1 + nesting
    }
    const logicalOps = (line.match(/(\&\&|\|\|)/g) || []).length
    complexity += logicalOps
    braceDepth = Math.max(0, braceDepth + opens - closes)
  }
  return { cognitive_complexity: complexity, compliant: complexity < 15, max_allowed: 14 }
}

export function checkCodeDuplication(sources = [], maxDuplicatePct = 10, windowSize = 5) {
  const seen = new Map()
  let totalLines = 0
  let duplicateLines = 0

  for (const src of sources) {
    const lines = String(src || '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//') && !l.startsWith('#') && !l.startsWith('*') && l.length > 3)
    totalLines += lines.length
    const dupIdx = new Set()
    for (let i = 0; i <= lines.length - windowSize; i++) {
      const block = lines.slice(i, i + windowSize).join('\n')
      if (seen.has(block)) {
        for (let k = i; k < i + windowSize; k++) dupIdx.add(k)
      } else {
        seen.set(block, true)
      }
    }
    duplicateLines += dupIdx.size
  }

  const duplicationPct = totalLines > 0 ? Number(((duplicateLines / totalLines) * 100).toFixed(2)) : 0
  return {
    total_lines: totalLines,
    duplicate_lines: duplicateLines,
    duplication_pct: duplicationPct,
    max_allowed_pct: maxDuplicatePct,
    compliant: duplicationPct < maxDuplicatePct
  }
}

export function evaluateDoraAndSreHealth({ deployments = 0, failedDeployments = 0, avgMttrMinutes = 0, sloSuccessPct = 100 } = {}) {
  const deps = Number(deployments)
  const failed = Number(failedDeployments)
  const mttr = Number(avgMttrMinutes)
  const slo = Number(sloSuccessPct)
  if (!Number.isFinite(deps) || deps <= 0) throw new Error('deployments must be positive')
  const changeFailureRatePct = Number(((failed / deps) * 100).toFixed(2))
  const eliteDora = changeFailureRatePct <= 5.0 && mttr <= 60
  const errorBudgetHealthy = slo >= 99.9
  return {
    change_failure_rate_pct: changeFailureRatePct,
    avg_mttr_minutes: mttr,
    slo_success_pct: slo,
    dora_tier: eliteDora ? 'ELITE' : 'STANDARD',
    error_budget_healthy: errorBudgetHealthy,
    release_freeze_recommended: !errorBudgetHealthy
  }
}

export function calculateSixSigmaMetrics({ totalOpportunities = 0, defects = 0 } = {}) {
  const opps = Number(totalOpportunities)
  const defs = Number(defects)
  if (!Number.isFinite(opps) || opps <= 0) {
    throw new Error('totalOpportunities must be a positive number')
  }
  if (!Number.isFinite(defs) || defs < 0 || defs > opps) {
    throw new Error('defects must be between 0 and totalOpportunities')
  }

  const dpmo = Number(((defs / opps) * 1_000_000).toFixed(2))
  const yieldPct = Number((((opps - defs) / opps) * 100).toFixed(5))

  let sigmaLevel = 1.0
  if (dpmo <= 3.4) sigmaLevel = 6.0
  else if (dpmo <= 233) sigmaLevel = 5.0
  else if (dpmo <= 6210) sigmaLevel = 4.0
  else if (dpmo <= 66807) sigmaLevel = 3.0
  else if (dpmo <= 308537) sigmaLevel = 2.0

  return {
    total_opportunities: opps,
    defects: defs,
    dpmo,
    yield_pct: yieldPct,
    sigma_level: sigmaLevel,
    meets_six_sigma: dpmo <= SIX_SIGMA_TARGET.max_dpmo,
    evaluated_at: new Date().toISOString()
  }
}
