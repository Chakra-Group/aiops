# Skill: Image Digest Parity Verifier (deterministic, Python)

Verifies that the container image digest of a workload is IDENTICAL across two
environments (UAT vs PROD) — the hard gate for SHIPPED_VERIFIED. Uses `kubectl`
only; no fabrication. Exit 0 = parity, exit 1 = mismatch or error.

Run: `python3 aiops/skills/digest-parity/verify.py --deploy <name> --uat <ns> --prod <ns>`
