# Skill: Per-Product Backlog Sync (deterministic)

MD-000 directive 7221123071: every product must have a named owner and a visible
backlog aligned to its strategic direction (charter growth vector). Zero-backlog
is a gap, not a success. This skill audits each product's backlog and reports
which products have a responsible owner and pending items.

Run: `python3 aiops/skills/backlog-sync/audit.py`
Outputs JSON per product: owner, backlog_count, status. Non-zero exit if any
product has no owner or zero backlog. Read-only; never fabricates items.
