#!/usr/bin/env python3
"""Audit per-product backlog ownership + item count. Read-only, truthful."""
import json
import os
import sys

# Product -> responsible backlog owner (PO emp id), from PRODUCT_OWNERS_ROSTER.
OWNERS = {
    "chakra-core": "EMP-CT-002", "iniolu": "EMP-INI-201", "chitra": "EMP-DES-102",
    "kaala": "EMP-GEO-103", "sthala": "EMP-GEO-103", "planmytravel": "EMP-PMT-202",
    "chakra-ai": "EMP-AI-101", "artha": "EMP-FIN-003", "dharma": "EMP-SEC-004",
    "grihakart": "EMP-GK-204", "prachara": "EMP-CMO-005", "chakra-agents": "EMP-COO-006",
    "chakra-cloud": "EMP-CT-002", "chakra-samiti": "EMP-MULTI-205", "chakra-vahan": "EMP-VAHAN-207",
    "chakra-krishi": "EMP-COO-006", "chakra-hr": "EMP-COO-006",
    "chakra-naama": "EMP-CT-002", "chakra-peetha": "EMP-GK-204", "chakra-build": "EMP-CT-002",
}

# Backlog source: workspace product uat/prioritized-backlog.json if present.
WS = os.environ.get("CHAKRA_WORKSPACE", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))


def backlog_count(product):
    path = os.path.join(WS, product, "uat", "prioritized-backlog.json")
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return len(data)
        if isinstance(data, dict):
            for k in ("backlog", "items", "tasks", "prioritized"):
                if isinstance(data.get(k), list):
                    return len(data[k])
        return 0
    except Exception:
        return 0


def main():
    rows, gaps = [], 0
    for product, owner in OWNERS.items():
        count = backlog_count(product)
        ok = bool(owner) and count > 0
        if not ok:
            gaps += 1
        rows.append({"product": product, "owner": owner, "backlog_count": count,
                     "status": "OK" if ok else "NO_BACKLOG_OR_OWNER"})
    print(json.dumps(rows, indent=1))
    print(f"BACKLOG_AUDIT gaps={gaps} total={len(rows)}")
    return 1 if gaps else 0


if __name__ == "__main__":
    sys.exit(main())
