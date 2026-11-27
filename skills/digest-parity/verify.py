#!/usr/bin/env python3
"""Deterministically verify a workload's image digest parity across two namespaces."""
import argparse
import json
import subprocess
import sys


def digest(namespace, deployment):
    out = subprocess.check_output([
        "kubectl", "get", "deployment", deployment, "-n", namespace,
        "-o", "jsonpath={.spec.template.spec.containers[0].image}",
    ], text=True)
    # Resolve running pods' actual imageID for the selected color/app.
    pods = subprocess.check_output([
        "kubectl", "get", "pods", "-n", namespace,
        "-l", f"app={deployment}",
        "-o", "jsonpath={.items[*].status.containerStatuses[0].imageID}",
    ], text=True).split()
    return {"declared": out.strip(), "running_ids": sorted(set(pods))}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--deploy", required=True)
    p.add_argument("--uat", default="chakra-uat")
    p.add_argument("--prod", default="chakra-prod")
    a = p.parse_args()
    try:
        u, prod = digest(a.uat, a.deploy), digest(a.prod, a.deploy)
    except Exception as e:
        print(json.dumps({"status": "ERROR", "error": str(e)}))
        return 1
    ok = bool(u["running_ids"]) and u["running_ids"] == prod["running_ids"]
    print(json.dumps({"status": "PARITY" if ok else "MISMATCH", "uat": u, "prod": prod}))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
