---
trigger: always_on
description: Canonical MCP Exposure Policy — every product with an API layer must expose a real MCP surface used by digital workers.
---

# MCP Exposure Policy (MD-000 directive)

## Rule
**Every product line that has an API layer must expose a real MCP surface.** A "real" MCP
surface means a working MCP server that implements at least:

- `initialize`
- `tools/list` — derived from **live product API routes**, never invented
- `tools/call` — forwards to the product's own API, returns honest results/errors

A plain array of `mcp_tools_assigned` strings is **not** MCP. It is a label only and is
prohibited as a substitute for a real server. The workforce's `authorizeMcpInvocation()`
gate must sit in front of every employee-scoped tool call.

## Current estate (verified 2026-11-25)
| Product | API layer | Real MCP server |
|---|---|---|
| chakra-agents (:8095, 64 routes) | yes | `bin/chakra-agents-mcp.mjs` (47 tools) |
| chakra-core | yes | `bin/chakra-dev-mcp.mjs` |
| chakra-cloud, artha, chakra-ai, chakra-hr, chakra-krishi, chakra-naama, chakra-peetha, chakra-samiti, chakra-vahan, chitra, dharma, grihakart, iniolu, kaala, planmytravel, prachara, sthala | yes | generated thin adapters (see registry) |

## Digital-worker usage
1. Discover a product's tools with `tools/list`.
2. Check scope with `GET /api/v1/workforce/data-sovereignty/scope?employee_id=<id>` or the
   `agents_data_scope` MCP tool.
3. Call through the MCP server. Mutating calls are logged to the product DB ledger via
   `recordProductDataUpdate`.
4. Never bypass the MCP surface to reach a product API when a tool exists for it.

## MD-MCP-009 — MCP-first cross-fleet SDLC review & feedback (MD-000 directive)
SDLC review findings, counter-review challenges, PO feedback, task dispatch, scope checks
and status reads **must travel through the MCP surface**, not direct product REST calls,
whenever an MCP tool exists for the operation. This applies to every fleet/environment
(`DEV :30081`, `UAT :30082`, `PROD :30083`) and to every SDLC stage:

- **Gate identity is explicit.** Workforce operator tools (`agents_dispatch_task`,
  `agents_enqueue_head_task`, `agents_po_council_propose`, `agents_po_council_claim`,
  `agents_po_council_complete`, `agents_unblock`, `agents_prioritize_tasks`,
  `agents_record_md_decision`, `agents_propose_product_line`, `agents_evaluate_integration`,
  `agents_record_cost`) are gated on the **caller** `operator_id`, which must be one of
  `EMP-AI-000`, `EMP-COO-006`, `EMP-GOV-007`. Any `employee_id` in those payloads is DATA
  (the subject worker), never the caller.
- **Product-data writes** (`agents_record_product_data_update`) are gated on the acting
  `employee_id` owning the specific product tool named in `mcp_tool`.
- **Tool schemas are the contract.** MCP params must match the live REST route payloads
  exactly; a `?` suffix marks an optional param. Silently dropping a field is a platform bug.
- **Review feedback routing.** `scripts/submit-audit-feedback.mjs` uses
  `scripts/mcp-client.mjs` (`initialize` → `tools/list` → `tools/call`) so all PO feedback
  is submitted through MCP, with the operator gate recorded in the delivery ledger.
- **Direct REST is permitted only** for bootstrap/discovery of a fleet whose MCP endpoint is
  not yet deployed, or for a route with no MCP tool. In those cases log the reason in the
  relevant MD ledger and open a platform ticket to add the MCP tool.

Enforcement: a review or feedback artifact that contains a direct product REST call where an
MCP tool existed is rejected at the stage gate. Owners: product Head (EMP-*), reviewed by
Sutradhara (CTO) and Rakshaka (CISO).

## Deployment
MCP servers are packaged into their product's immutable image and available in DEV, UAT
and PROD. `UAT` and `PROD` must share the exact same image digest. Each environment exposes
its own MCP endpoint so a worker never queries a different environment's code by accident.
