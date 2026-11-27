# Skill: Firm Gate Runner (deterministic)

Runs the canonical done-done quality/cyber gate for one or all product lines and
returns a truthful PASS/BLOCKED result with the per-gate detail. Deterministic —
no model, no judgement, exit code is authority.

Run: `node aiops/skills/gate-runner/run.mjs [--product <slug>]`
(calls `aiops/tools/done-done-gate.mjs`; exit 0 = all gates pass).
