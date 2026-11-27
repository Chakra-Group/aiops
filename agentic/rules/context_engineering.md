---
trigger: always_on
description: Intelligent per-employee context engineering, strict token economy, and latest-stable dependency currency across all languages.
---

# Context Engineering & Token Economy (MD-000)

## 1. Principle
Every AI interaction must maximise firm value per token. Context is a scarce
resource: deliver the *minimum sufficient* context for the task, not the maximum
available context. Never load every project document or rule file by default.

## 2. Context hierarchy (industry pattern)
1. **Stable identity/charter** — always on, tiny: employee id, role, veto chain,
   non-negotiable rules (MD-000 veto, OSS-only, zero dummy data, Dharma naming,
   English-default, prod-safety).
2. **Task context** — loaded just-in-time: only the repo/rule files relevant to
   the current task. `AGENTS.md` first, then selected `rules/*.md` by need.
3. **Retrieved facts** — query CodeGraph / MCP ledgers for live truth instead of
   pasting files or history. One `codegraph_explore` replaces grep+read loops.
4. **Working memory** — current session decisions only; compact into structured
   summaries, not raw transcripts.
5. **Long-term memory** — last 40 lines of MEMORY.md at start; full MEMORY only
   on specific search. Version-controlled ledgers are the durable source of truth.

## 3. Per-employee context budget
- C-Suite/strategic roles: wider cross-product context, compressed to decisions.
- Product specialists: only their own product line + shared firm rules.
- Verifiers/QA: evidence and diffs first, narrative last.
- Each dispatch prompt must state: objective, scope, allowed repos, proofs
  required, and a word/token cap. Delegated workers report evidence, not prose.

## 4. Token optimisation practices
- Progressive disclosure: index → select → read. Never preload.
- Prefer tool calls over natural-language descriptions of state.
- Cache stable prefixes (charter + rules) via provider prompt caching where
  available; keep volatile task content at the end.
- Use structured outputs (JSON) for machine-consumed results.
- Use cheap/fast models for routine cycles; reserve stronger models for hard
  reasoning. Rotate LEAST-USED across all free models (see
  `release_and_quality_directives.md` §5); never use a rate-limited model.
- Compaction model must be on a different quota pool from the primary session.
- Measure: tokens per verified outcome; flag any worker above 750-token average
  prompt (token_budget.md) and escalate after 3 consecutive warnings.

## 5. Dependency currency (all languages, MD-000)
- Every direct dependency must be the **latest stable** compatible with the
  runtime, not merely a version that works. Upgrade automatically (OSS-only).
- Node: use `node:26-alpine` (latest stable verified 2026-11-27) wherever a
  runtime needs `node:sqlite` (Node >=22). Re-verify at each release.
- Python: pin latest stable in `requirements.txt`; use `pip list --outdated`.
- JS/TS: `npm outdated`, then upgrade + full tests + gates.
- Verify upgrades in DEV `:30081`, then UAT `:30082`, then promote the exact
  UAT==PROD digest to PROD `:30083` via MD-BUILD-010/011/012 gates.
- Commercial tooling requires written MD-000 approval; OSS automation
  (Renovate/Dependabot or homegrown scheduled job) is preferred.

## 6. Anti-patterns (blocked)
- Stuffing full MEMORY.md, all rules, or whole repos into a prompt.
- Re-reading files CodeGraph has already returned verbatim.
- Spawning a replacement on a model already blocked by rate limit.
- Claiming COMPLETED without verifiable evidence in a shared ledger.
- Inventing data, reviews, digests, or rollout status to pass a gate.

## 7. Enforcement
Token audits via `/api/v1/workforce/token_audit`; worker logs
`data/worker_logs/<worker_id>.json`. Gate G6 (dependency audit) + this rule are
reviewed by Sutradhara (CTO) and Rakshaka (CISO).
