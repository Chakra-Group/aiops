---
trigger: always_on
description: MD-000 release, provenance, MCP functional, quota and context directives for all product lines.
---

# Active Release & Quality Directives (MD-000)

## 1. Artifact truth
- Build ONE immutable image **from `release/release-v1.0.0`**.
- Latest stable dependencies in all languages (Node `26` base; glibc workspace
  image where sibling repos/CodeGraph native binary are required).
- `scripts/chakra-smoke-built-image.mjs` (MD-BUILD-013) must return `SMOKE_OK`
  before any deployment — the exact image must boot and answer `/health`.

## 2. Binding rollout order
1. Build from `release`. 2. Boot-smoke. 3. Deploy UAT, verify healthy, turn down
old image. 4. **Only then** run functional/UI tests. 5. Promote the SAME digest
to PROD, verify healthy + sanity. 6. **Only then** merge `release -> main`.
No `SHIPPED_VERIFIED` without UAT==PROD parity and rollout proof.
Stateless Deployments: blue/green (`scripts/chakra-blue-green-rollout.mjs`,
MD-BUILD-011). StatefulSets with RWO PVCs: RollingUpdate retaining volumes.
`scripts/chakra-verify-release-provenance.mjs` (MD-BUILD-012) proves built ==
traffic-serving UAT == PROD, bound to the release commit.

## 3. Functional + MCP gates
- `tools/simulate-functional-test.mjs` covers portal REST on DEV/UAT, never PROD.
  It does NOT test MCP. `scripts/chakra-functional-mcp-test.mjs` must also pass
  (initialize, tools/list, tools/call, scope gate) for every release.
- >90% automated functional coverage + virtual manual persona UI pass, honestly
  recorded in `uat/feedback.json`. No invented evidence to force a gate.
- `done-done-gate.mjs` G1–G15 green before promotion.

## 4. Quota + context
- `scripts/chakra-quota-aware-fallback.mjs`: block rate-limited models until
  reset, rotate LEAST-USED across the full free pool, WAIT when all blocked.
- `scripts/chakra-sync-free-models.mjs` refreshes provider catalogs; pool built
  by `scripts/chakra-build-free-model-registry.mjs`.
- `context_engineering.md`: progressive disclosure, CodeGraph-first retrieval,
  stable-prefix caching, least tokens per verified outcome.

## 5. Naming convention
All Chakra ops tools use `chakra-<skillname>.mjs` and matching
`test/chakra-<skillname>.test.js`, version-controlled in the owning repo.
