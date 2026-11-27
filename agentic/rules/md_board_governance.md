---
trigger: always_on
description: Binding MD board-member governance — veto power, internal hierarchy, homegrown/open-source-only, MD approval for commercial integrations and new product lines
---

# MD Board Governance Policy (Canonical — `MD-000`)

By directive of the board member (`MD-000`), who holds **veto power** over all firm-wide decisions:

1. **Digital-workforce-owned company.** The firm is run by its digital workforce. `MD-000` supplies
   final direction for company growth and may veto any decision.
2. **Internal hierarchy only.** Wherever a conglomerate requires a decision-making hierarchy, that
   hierarchy exists **inside Chakra Groups** (`MD-000` → C-Suite → VP/Director → GM → Specialist).
   No external party is authorised to make firm decisions.
3. **Homegrown / open source only.** Every capability must be homegrown or open source.
   Commercial integrations are **prohibited** unless `MD-000` gives explicit written approval.
   - Enforcement: `src/mdBoardGovernancePolicy.js` → `evaluateTechnologyIntegration()`.
   - Decisions recorded via `POST /api/v1/governance/md-decision` with `approved_by: 'MD-000'`.
   - Unknown commercial vendors must return `MD_APPROVAL_REQUIRED` and must not be adopted.
   - Existing model-provider API integrations are `PENDING_MD_REVIEW`; they remain operational
     until `MD-000` decides, and the open-source fallback (`local-slm/deterministic-rule-engine`
     and self-hosted OSS Llama) is the default migration target.
4. **New product lines.** Decision makers have full freedom to originate a new product line when
   they can evidence a **>= 100% growth opportunity**, but **creation requires `MD-000` approval
   before any repository, team, or deployment is created**.
   - Enforcement: `proposeNewProductLine()` → `PENDING_MD_APPROVAL` / `MD_APPROVED`.
   - A proposal below 100% growth is `REJECTED_GROWTH_THRESHOLD_NOT_MET`.
   - The old 18-product portfolio stays frozen until a board-approved addition is recorded.
5. **Zero dummy data — absolutely, under any cause.** No dummy, sample, placeholder, synthetic or
   hardcoded data may exist in **PROD**, and none is permitted in DEV/UAT either. Every rendered
   value must come from a live source or verifiable configuration. Static KPIs, fake timestamps,
   invented certificates, fabricated briefings and canned "COMPLETED" work orders are forbidden.
   Work is `QUEUED_FOR_EXECUTION` until a worker actually reports completion. An empty honest state
   (`hotspots: []` with `empty_reason`) is always preferable to invented content.

## Approval record format

```json
{
  "decision_type": "COMMERCIAL_INTEGRATION | NEW_PRODUCT_LINE | PAID_THIRD_PARTY_SERVICE | EXTERNAL_DATA_SOURCE",
  "reference": "<vendor/product or product_slug>",
  "approved_by": "MD-000",
  "approved": true,
  "rationale": "<board rationale>",
  "approval_token": "<value of MD_BOARD_APPROVAL_TOKEN when configured>",
  "expires_at": "<optional ISO timestamp>"
}
```

`approved: false` registers an `MD_VETOED` decision and is final unless `MD-000` reverses it.
