# Skill: Chakra Workspace Setup (fresh-feature-ready)

Purpose: bring the local workspace to a clean, latest-`develop` state across all
relevant Chakra repos so a new feature-development task can start from current
code. This is the industry-standard "repo bootstrap / sync" workflow, encoded
once in AIOps and reusable by every employee.

## When to use
- Starting a new feature pass for any product line.
- After a long gap, or when the local workspace may be stale.
- Before running the done-done gate / functional gate on a fresh clone.

## Procedure
1. Identify the workspace root (parent dir containing the product repos).
2. For each repo in the registry (default: all 20 product lines + aiops):
   - `git fetch origin --prune`
   - verify the working tree is clean; if dirty, STOP and report (never clobber work).
   - `git checkout develop && git pull --ff-only origin develop`
   - if `develop` is absent, fall back to the default branch and report.
3. Confirm each repo's HEAD matches `origin/develop`.
4. Report a clean summary: repo -> branch -> short SHA, plus any repos skipped.
5. Only then start feature work (always on a fresh `feature/*` or `fix/*` branch off develop).

## Script
Run: `node aiops/skills/workspace-setup/workspace-setup.mjs [--workspace <path>] [--only <repo,...>]`

The script is idempotent, never force-pulls, refuses to overwrite local changes,
and prints a truthful per-repo status. It never fabricates "up to date".
