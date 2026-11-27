---
trigger: always_on
description: Canonical fleet-wide immutable image build & rollout guardrail — prevents wrong-Dockerfile / crash-on-boot rollouts across every product.
---

# Fleet Image Build & Rollout Guardrail (MD-000 directive)

## MD-BUILD-010 — verify the image BEFORE it touches UAT or PROD

A wrong build command once produced a `chakra-agents` image whose `CMD` pointed at
`/app/bin/chakra-agents-server.mjs` while the files were laid out for
`/srv/chakra-agents`. Rollout crashed PROD with `MODULE_NOT_FOUND`. This rule makes
that class of failure structurally impossible across the whole fleet.

## 1. One canonical build invocation per product (no guessing)
The build command is a **declared fact** in `scripts/product-build-manifest.json`.
Never infer the Dockerfile from the repo root. Example:
- `chakra-agents`: `docker build -f chakra-agents/Dockerfile.workspace -t <repo>:<tag> <WORKSPACE_ROOT>`
  (must be built from the **workspace root**, not the product dir — sibling repos are
  `COPY`d in, and CodeGraph's glibc binary needs the bookworm base).
Every other product declares its own `context`, `dockerfile`, `working_dir`, `cmd`,
`health_path` and `port` in the same manifest. A product missing from the manifest
fails the gate — no silent defaults.

## 2. Mandatory pre-rollout image verification (`scripts/verify-product-image.mjs`)
Before any `kubectl set image`, run the verifier against the **exact image tag/digest**
that will be deployed. It checks, and fails closed if any is false:
1. **Layout** — image `Config.WorkingDir` and `Config.Cmd` resolve to a real entrypoint
   file inside the image (`<WorkingDir>/<Cmd script>` exists).
2. **Fixes present** — any declared `required_markers` (e.g. `createMcpClient`,
   `authorizeWorkforceOperatorInvocation`) exist in the image source.
3. **Boot smoke** — start the image on an ephemeral host port with a temp data dir and
   poll `health_path` until HTTP 200 (or timeout). A container that cannot boot never
   reaches a cluster.
4. **Version provenance** — image was built from a clean checkout of the intended
   commit (no untracked files baked in). Build from a detached worktree, not a dirty tree.

Verifier exit code 0 is the **only** permission to roll out. Any failure => stop,
do not patch the statefulset.

## 3. Rollout with parity and rollback
1. Patch `UAT` and `PROD` to the **same tag**, which must resolve to the **same digest**.
2. `kubectl rollout status` must complete for both (do not treat `set image` as success).
3. Compare `.status.containerStatuses[*].imageID` in UAT and PROD — **must be identical**
   (`UAT == PROD` immutable-image parity). Mismatch => roll back both immediately.
4. If any pod CrashLoopBackOffs or readiness fails, `kubectl set image` back to the last
   verified-good tag **before** investigating. Restore service first, diagnose second.

## 4. Evidence ledger
Every rollout records: image tag + digest, verifier output, rollout status, digest parity,
and the pre-rollout tag used for rollback. `QUEUED`/`set image issued` is not `DEPLOYED`.

## Enforcement
This gate is required for the `UAT -> PROD` stage in every product's 5-stage SDLC.
A rollout artifact without a passing verifier report is rejected. Owners: product Head
(EMP-*), reviewed by Sutradhara (CTO) and Rakshaka (CISO).
