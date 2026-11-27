# Chakra AIOps (`@chakra/aiops`)

Firm-wide **AI Operations** source of truth — created on MD-000's directive (issue #203)
to be the version-controlled home for the consistent instructions, SDLC/policy gates,
CI/CD tooling, and reusable skills that apply to **all** Chakra product lines.

`chakra-agents` and `chakra-platform` now maintain only their own product-level details;
firm-wide rules live here.

## Layout
- `agentic/` — canonical AGENTS.md, GEMINI.md, MEMORY.md, rules/*.md, workforce.json (incl. `EMP-AIOPS-000`, the AIOps head).
- `tools/` — `done-done-gate.mjs` (G1–G15), uat-bench, functional/persona gate tools (now version-controlled).
- `scripts/` — `chakra-post-deploy-gate.mjs` (functional tests against the newly deployed DEV/UAT image), blue-green rollout, release-provenance verifier.
- `src/quality/` — vendored six-sigma / six-eye modules (self-contained gate).
- `skills/` — deterministic reusable skills:
  - `workspace-setup/` — pull latest `develop` for all product repos, ready for feature work (refuses to clobber local changes).
  - `gate-runner/` — run the firm gate for one/all products.
  - `digest-parity/` — Python verifier for UAT==PROD image digest parity.
  - `backlog-sync/` — Python auditor for per-product backlog ownership (MD-000 7221123071).

## MD-000 design rules encoded here
- **Embedded consumer pattern**: consumers open the owning product as a separate app/iframe, never duplicate its source/logic (Iniolu opens Chitra Studio at `/apps/chitra`; applies to PlanMyTravel and all products). Iniolu's core is the public social events list.
- **CI/CD gates**: every SDLC cycle must run done-done + org policy + post-deploy functional gates; report findings to the respective product owners as backlog.
- **Backlog ownership**: every product has a named owner; zero-backlog is a gap.
- **Zero dummy data**, UAT==PROD parity, English default, homegrown/OSS only.

## Promotion
Branch from `develop`: `feature/*` or `fix/*`; 5-stage PR pipeline feature → develop → release → main; never commit to protected branches.
