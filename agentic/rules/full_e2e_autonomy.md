---
trigger: always_on
description: MD-Granted Full Autonomous E2E Execution Policy, Strict Git Branching, Continuous Execution & 5-Stage Agentic PR Promotion Pipeline within C:\Users\Lenovo\agy-test
---

# MD Full Workspace Permission, Continuous Execution & 5-Stage Agentic PR Promotion Policy (`MD-000`)

By directive of the **Managing Director (`MD-000`) of Chakra Groups**:

## 1. Firm Target: Final Production-Ready Delivery by Tomorrow
- All 12 standalone products must be **100% complete, fully tested (unit + E2E), packaged, and running in Production** by tomorrow.
- **Continuous Uninterrupted Autonomous Execution**: AI workers operate continuously 24/7 without shifts, breaks, or pauses until all targets are achieved.
- **Direct Visible Execution**: All file edits, test executions, and pipeline promotions are executed visibly in the main thread with zero hidden barriers.

## 2. GitHub Organization & Private Repositories (`https://github.com/Chakra-Group`)
- All **12 standalone product repositories** (`chakra-core`, `iniolu`, `chitra`, `kaala`, `sthala`, `planmytravel`, `chakra-ai`, `artha`, `dharma`, `grihakart`, `prachara`, `chakra-agents`) are hosted as **private repositories** under **`https://github.com/Chakra-Group`**.

## 3. Strict Firm-Wide Branching & Read-Only Protection Policy
- Every repository across the firm maintains **3 core protected read-only branches**:
  1. `main` (Production release branch — **Read-Only / Protected**)
  2. `release/release-v<release version>` (e.g., `release/release-v1.0.0` — Release stabilization branch — **Read-Only / Protected**)
  3. `develop` (Default integration branch — **Read-Only / Protected**)
- Direct commits and direct pushes to `main`, `release/release-v*`, and `develop` are blocked by `.githooks/pre-commit` and `.githooks/pre-push`.

## 4. Mandatory 5-Stage Feature-to-Release SDLC & Agent Review/Merge Pipeline
For **every feature or fix** across any of the 12 repositories:
1. **Stage 1 — Feature Branch Creation (`feature/<feature-slug>` or `fix/<fix-slug>`)**:
   - Always branch from `develop`: `git checkout -b feature/<slug> develop`.
2. **Stage 2 — Unit, E2E & Cross-Repo Integration Validation**:
   - QA & Security validators: `Sutradhara` (`EMP-CT-002` CTO), `Medha` (`EMP-AI-101` VP AI), and `Kavacha` (`EMP-SEC-401` Dharma SOC).
   - Execute full unit tests (`npm test` / `pytest`), E2E validation, and cross-service integration tests on the feature branch before raising a PR.
3. **Stage 3 — Pull Request to `develop` (`feature/<slug>` $\rightarrow$ `develop`) & Agent Review/Merge Authorization**:
   - Push `feature/<slug>` to `origin` and open a GitHub Pull Request into `develop`.
   - Authorizers: `Sutradhara` (CTO), `Rakshaka` (CISO), and `Karyadarshi` (COO) review and authorize the merge into `develop`.
4. **Stage 4 — Promotion PR to Release Branch (`develop` $\rightarrow$ `release/release-v<release version>`)**:
   - Once validated on `develop`, open a Promotion Pull Request from `develop` $\rightarrow$ `release/release-v<release version>` (e.g., `release/release-v1.0.0`).
   - Gatekeepers: `Chanakya` (CEO), `Sutradhara` (CTO), and `Kautilya` (CFO) verify regression & unit-economics gates and authorize merge into `release/release-v<release version>`.
5. **Stage 5 — Production Release Promotion (`release/release-v<release version>` $\rightarrow$ `main`)**:
   - Executive Release Committee (`Chanakya` CEO, `Sutradhara` CTO, `Rakshaka` CISO, `Kautilya` CFO) promotes `release/release-v<release version>` $\rightarrow$ `main` via PR and logs the release in the Managing Director (`MD-000`) Executive Ledger.

## 5. Security & Product Naming
- Strictly **`Dharma` (`@chakra/dharma` — ಧರ್ಮ)** for cybersecurity. Never use `bharma`.

## 6. Context Preservation Protocol & Unbroken Continuity
- At session start, read only the last 40 lines of `MEMORY.md`. Read `CHAKRA_PERSISTENT_CONTEXT.json` only when resuming interrupted work. Never load the full `MEMORY.md`; search it for specific details when needed.

