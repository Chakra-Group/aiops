/**
 * ChakraCore (@chakra/core) — Autonomous 6-Eye Adversarial Counter-Review Framework
 * Prevents autonomous self-approval / rubber-stamping by requiring 6 distinct eyes:
 *   1. Builder Owner (Author)
 *   2. Domain Architect (Design & Scope Alignment)
 *   3. Security Challenger (Dharma CISO / Zero-Trust)
 *   4. FinTech & SRE Challenger (Artha CFO / Unit-Economics & Error Budget)
 *   5. Independent Counter-Reviewer (Devil's Advocate — MUST raise >=1 concrete counter-challenge)
 *   6. Customer Persona Advocate (Honest End-User Friction Check)
 */

export const SIX_EYE_ROLES = [
  { eye: 1, role_key: 'builder_owner', title: 'Builder Owner (Author)' },
  { eye: 2, role_key: 'domain_architect', title: 'Domain Architect (Scope & Design)' },
  { eye: 3, role_key: 'security_challenger', title: 'Security Challenger (Dharma Zero-Trust)' },
  { eye: 4, role_key: 'fintech_sre_challenger', title: 'FinTech & SRE Challenger (Artha / SLO)' },
  { eye: 5, role_key: 'independent_counter_reviewer', title: 'Independent Counter-Reviewer (Devil\'s Advocate)' },
  { eye: 6, role_key: 'customer_persona_advocate', title: 'Customer Persona Advocate (End-User Voice)' }
]

export function evaluateSixEyeReview(review = {}) {
  const reviewers = Array.isArray(review.reviewers) ? review.reviewers : []
  const challenges = Array.isArray(review.counter_challenges) ? review.counter_challenges : []
  const reasons = []

  // Enforce 6 distinct eyes (no duplicate reviewer names wearing multiple hats)
  const uniqueNames = new Set(reviewers.map(r => String(r.name || '').trim().toLowerCase()).filter(Boolean))
  if (reviewers.length < 6 || uniqueNames.size < 6) {
    reasons.push(`Requires 6 distinct reviewers (6-Eye Principle); found ${uniqueNames.size} unique`)
  }

  // Enforce every required role_key is represented
  const presentRoles = new Set(reviewers.map(r => r.role_key).filter(Boolean))
  for (const reqRole of SIX_EYE_ROLES) {
    if (!presentRoles.has(reqRole.role_key)) {
      reasons.push(`Missing 6-Eye role: ${reqRole.role_key}`)
    }
  }

  // Prevent rubber-stamp: require >=1 substantive counter-challenge raised & resolved with evidence
  if (challenges.length < 1) {
    reasons.push('At least 1 counter_challenge from an independent challenger is required (no rubber-stamp LGTM)')
  }
  for (const ch of challenges) {
    if (ch.status !== 'resolved') {
      reasons.push(`Counter-challenge ${ch.id || '(unnamed)'} is still '${ch.status || 'open'}'`)
    }
    if (!ch.evidence && !ch.fixRef) {
      reasons.push(`Counter-challenge ${ch.id || '(unnamed)'} resolved without evidence/fixRef`)
    }
  }

  // Cumulative sign-off: no reviewer can reject
  const rejections = reviewers.filter(r => r.decision === 'reject')
  if (rejections.length > 0) {
    reasons.push(`Rejected by ${rejections.map(r => r.name).join(', ')}`)
  }

  return {
    approved: reasons.length === 0,
    eyes_verified: uniqueNames.size,
    counter_challenges_count: challenges.length,
    reasons,
    evaluated_at: new Date().toISOString()
  }
}
