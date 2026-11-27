# Canonical Agentic Instructions & Agent Files (Single Source of Truth)

By directive of **Managing Director (`MD-000`)** of Chakra Groups:

All firm-wide agentic instructions, always-on rules, agent configuration, and persistent
executive memory are version controlled **here in the `aiops` repository** (MD-000 directive,
issue #203: "call it aiops instead of devops"). `aiops` is the single source of truth for
firm-wide instructions AND the SDLC/policy gate tooling + CI/CD. The `chakra-agents` and
`chakra-platform` repos now maintain only their own product-level details. The historical
copies under `chakra-agents/agentic/` and the non-git workspace root are thin pointers;
`aiops/agentic/` is canonical.

## Canonical files

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Workspace rules, product portfolio, K8s environments, engineering excellence standards, branch protection |
| `GEMINI.md` | Architecture & guidelines reference for Gemini-driven workers |
| `MEMORY.md` | Persistent executive memory / workforce ledger (read only the **last 40 lines** at session start) |
| `opencode.jsonc` | Canonical OpenCode config: agent definitions (orchestrator/Antigravity `EMP-AI-000`, researcher), model fallback chain, instructions glob |
| `opencode-model-fallback.jsonc` | Model failover / quota-exhaustion policy |
| `rules/full_e2e_autonomy.md` | Always-on MD-Granted Full Autonomous E2E Execution Policy and 5-stage PR pipeline |
| `rules/token_budget.md` | Always-on Token-Usage Mindfulness Policy |
| `rules/md_board_governance.md` | MD board veto, internal hierarchy, homegrown/open-source-only, MD approval gates, zero fabricated data |
| `rules/mcp_exposure.md` | Every API-bearing product exposes a real MCP server (`tools/list`/`tools/call`); label-only tools prohibited |
| `rules/codegraph.md` | Shared MIT CodeGraph index for all 19 repos; workers query it first; freshness across branches/envs |
| `../docs/HEAD_COORDINATOR_OPERATIONS.md` | Operational single source of truth for `EMP-AI-000`, watchdog, FinOps, model switching |

## Discovery / references

- The non-git workspace root contains **thin pointer shims only** (`AGENTS.md`, `GEMINI.md`,
  `MEMORY.md`, `opencode.jsonc`, `.agents/rules/*.md`, `.opencode/opencode-model-fallback.jsonc`).
  They contain no authoritative instruction text — they point to the paths below.
- Root `opencode.jsonc` sets `instructions` to `chakra-agents/agentic/rules/*.md`, so OpenCode
  auto-loads the version-controlled rules directly.
- The orchestrator agent (`EMP-AI-000`, "Antigravity") loads its prompt from
  `chakra-agents/docs/HEAD_COORDINATOR_OPERATIONS.md` and must read the canonical `AGENTS.md`
  and `rules/*.md` before acting.
- Product repositories (open code) should reference the canonical files with a relative link
  rather than duplicating firm-wide rules.

## AIOps-owned tooling (MD-000 directive, issue #203)
- `tools/done-done-gate.mjs` — canonical version-controlled done-done quality/cyber gate (G1–G15).
- `tools/uat-bench.mjs`, `simulate-functional-test.mjs`, `persona-ui-browser-review.mjs`, `functional-mcp-test.mjs` — functional/persona gates.
- `scripts/chakra-post-deploy-gate.mjs` — **post-deploy functional gate**: runs a product's functional suite against the URL of the NEWLY DEPLOYED image in DEV/UAT, consistently for all products; blocks promotion on failure (MD-000: gates must be embedded in CI/CD, issue #203 comment 7221685875).
- `scripts/chakra-blue-green-rollout.mjs`, `chakra-verify-release-provenance.mjs` — rollout + provenance.
- `src/quality/` — vendored six-sigma / six-eye modules so the gate is self-contained.
- `skills/workspace-setup/` — reusable skill that brings all product repos to latest `develop`, refusing to clobber local work.

## Key design rules (MD-000 directives)
- **Embedded consumer pattern**: a consumer product never bundles another product's source/logic; it opens the owning product as a separate app or iframe (e.g. Iniolu opens Chitra Studio at `/apps/chitra`), crossing via API/MCP or postMessage. Iniolu's core is only the public social events list. Applies to Iniolu, PlanMyTravel, and all products.
- **Backlog ownership**: every product has a named owner responsible for adding strategic-direction backlog items; zero-backlog is a gap, not a success.
- AIOps head: `EMP-AIOPS-000` owns and maintains this repo; audit findings are routed to the respective product owners through the PO council backlog.

## Update rule

1. Branch from `develop`: `feature/<slug>` (never commit to protected `develop`/`release`/`main`).
2. Edit the canonical files in this directory; if the root shim target changes, update the shim too.
3. Run `npm test` (includes `test/agenticInstructions.test.js`) and the firm gates.
4. Promote via the 5-stage PR pipeline: feature → develop → release → main.

> Never edit a shim as a substitute for updating the canonical file.
