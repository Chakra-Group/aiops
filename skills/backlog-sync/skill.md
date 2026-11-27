# Skill: Per-Product Backlog Sync (deterministic)

MD-000 directive 7221123071: every product must have a named owner and a visible
backlog aligned to its strategic direction (charter growth vector). Zero-backlog
is a gap, not a success. This skill audits each product's backlog and reports
which products have a responsible owner and pending items.

Run: `python3 aiops/skills/backlog-sync/audit.py` (audits the live workspace)
Run: `node aiops/skills/backlog-sync/report.mjs` (reports the canonical backlog registry)

The canonical registry `aiops/data/productBacklog.json` is seeded from each
product's charter growth vector (MD-000 7221123071). Every product has a named
owner (PO) and >=1 strategic backlog item; items flow into the PO council.
Outputs per-product owner + item count. Non-zero exit if any product has no
owner or zero backlog. Read-only; never fabricates items.
