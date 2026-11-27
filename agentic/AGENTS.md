# Chakra Groups Workspace Rules & Directory Overview

This workspace (`C:\Users\Lenovo\agy-test`) coordinates **12 standalone repositories** under **Chakra Groups** (*Vision: Enable sustainable life*), reporting to the **Managing Director (`MD-000`)** and governed by **Chakra CT (Corporate Technology Unit — `chakra-ct`)**.

---

## 🎯 Executive Target: Continuous Operation Until Full Product Owner Sign-Off
- **Firm-Wide Target**: Every product line runs in real production, passes 100% unit tests and all firm gates (`G1–G14`), and is confirmed by its Product Owner with *"we are good to go for real production"*. There is **no Monday/tomorrow cutoff**.
- **Continuous Uninterrupted Execution**: AI agent employees operate **continuously without shifts, breaks, or pauses** while open backlog or new Product Owner requirements remain.
- **Board Direction**: `MD-000` is a board member with **veto power** and gives final growth direction. All decision hierarchy is internal to Chakra Groups.
- **Technology Policy**: **Homegrown or open source only.** Commercial integrations require explicit `MD-000` approval. See `rules/md_board_governance.md`.
- **Zero Dummy Data**: Absolutely none in PROD under any cause (and none in DEV/UAT). Every UI value must come from a live or verifiable source.
- **Direct Visible Execution**: All file edits, test executions, and deployment actions must be executed visibly in the main thread with zero hidden barriers.

---

## 🏛️ Board Governance (Binding)
- `MD-000` holds veto power over all decisions. Decision-making hierarchy is **internal only** (`MD-000` → C-Suite → VP/Director → GM → Specialist).
- **Homegrown / open source only.** No commercial integration may be adopted without an explicit written `MD-000` approval record (`src/mdBoardGovernancePolicy.js`).
- Decision makers may propose a **new product line** on a >= 100% growth-opportunity case, but **no repository/team/deployment may be created before `MD-000` approves**.
- Full policy: `agentic/rules/md_board_governance.md`.
- **MCP Exposure (MD-000 directive)**: Every product with an API layer must expose a **real MCP server** (`initialize`, `tools/list`, `tools/call`) whose tools are derived from live product routes. Label-only `mcp_tools_assigned` strings are not MCP. `chakra-agents` exposes `bin/chakra-agents-mcp.mjs` (47 tools); `chakra-core` exposes `bin/chakra-dev-mcp.mjs`. All employee-scoped calls pass through `authorizeMcpInvocation()`. Full policy: `agentic/rules/mcp_exposure.md`.
- **Chakra Jnana (parent product line)**: All authoritative source-of-truth data products live under this parent line. Current child products: **kaala** (time, astronomy, liturgy, sages/monks/gurus) and **sthala** (place, geography, heritage, GI/native products). Any future truth-data product joins as a child (repo/team creation still requires `MD-000` approval). See `src/chakraJnana.js` and `GET /api/v1/product-lines/hierarchy`.
- **CodeGraph (shared code intelligence)**: MIT-licensed, 100%-local CodeGraph indexes all 19 repos. Every worker queries it first for code understanding via chakra-agents MCP tools (`codegraph_*`) or `GET /api/v1/codegraph/*`; calls are workspace-confined. See `agentic/rules/codegraph.md`.

---

## 🏢 Product Portfolio & Architecture (12 Standalone Repositories)

| # | Product Name | Directory | Package / Service | Port | Status & Scope |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | **ChakraCore** | `chakra-core/` | `@chakra/core` | `:8085` | **Chakra CT Control Plane**: Corporate Tech charter, Unified Design Tokens, Service Mesh Registry & MCP Governance. |
| **2** | **Iniolu** | `iniolu/` | `iniolu-backend` | `:8000` / `:3000` | **Core Cultural Discovery & Calendar**: Lightweight native event discovery & devotee calendar (**Prachara Anchor Client #1**). |
| **3** | **Chitra** | `chitra/` | `@chakra/chitra-core` | `:8087` | **Indic Design Studio**: Programmatic Poster-as-Code Engine, GrihaKart 3D ad cards & 9-Social export presets. |
| **4** | **Kaala** | `kaala/` | `@chakra/kaala` | `:8086` | **Astronomical Engine**: Open-source Drik Panchanga, Tithi/Nakshatra calculator, Muhurta finder & Temple festival predictor. |
| **5** | **Sthala** | `sthala/` | `@chakra/sthala` | `:8088` | **Geospatial Knowledge Graph**: Indic 3-tier heritage atlas, nearby verified stays (`getNearbyStaysForPlace`) & GI native products. |
| **6** | **PlanMyTravel** | `planmytravel/` | `@chakra/planmytravel` | `:8089` | **Cultural Tourism & B2B Radar**: Local guide marketplace, 15% B2B exchange, "Where to Sell Tomorrow" Radar & Chakra Aqua ₹1 RVM. |
| **7** | **ChakraAI** | `chakra-ai/` | `@chakra/ai` | `:8090` | **Chakra AI Labs**: Indic NLP, Vision 4K Studio & 360°/3D GLB generator, weighted deity classifier & crowd footfall AI. |
| **8** | **Artha** | `artha/` | `@chakra/artha` | `:8091` | **FinTech & Treasury**: B2B splits (15%/8%/5%/2%), Chakra Aqua 2-stage factory economics (`₹3.50` -> `₹2.25`), ₹1 RVM UPI rewards & 0%-fee Seva rail. |
| **9** | **Dharma** | `dharma/` | `@chakra/dharma` | `:8092` | **Zero-Trust Cybersecurity & SECaaS**: 10-category WAF attack simulator, AI prompt-injection guard, RVM anti-fraud & B2B SECaaS. *(Strictly Dharma, never bharma)*. |
| **10** | **GrihaKart** | `grihakart/` | `@chakra/grihakart` | `:8093` | **Handicrafts & Homemade Enabler**: Raw-Photo-to-4K/3D Studio, AI Selling Coach & 11-Indian-cart mediator (**Prachara Anchor Client #2**). |
| **11** | **Prachara** | `prachara/` | `@chakra/prachara` | `:8094` | **Autonomous Digital Marketing**: Multi-channel ad automation across 9 Indian social networks & 11 online shopping carts. |
| **12** | **ChakraAgents** | `chakra-agents/` | `@chakra/agents` | `:8095` | **Digital Workforce & SDLC**: 16 AI agent employees, 5 UAT customer personas, 4 cyber auditors, and Rancher K8s orchestration. |

---

## ☸️ Rancher Desktop Kubernetes 3-Environment Architecture

All 12 applications are deployed across 3 isolated namespaces in local Rancher Desktop Kubernetes:
1. **`chakra-dev` (Port `:30081`, `develop` branch)**: Development environment for real-time feature integration.
2. **`chakra-uat` (Port `:30082`, `release/release-v1.0.0` branch)**: Pre-production environment validated by **5 Customer Persona Agents (`CUST-UAT-001..005`)** and **4 Red-Team Cyber Auditor Agents (`CYBER-UAT-001..004`)**.
3. **`chakra-prod` (Port `:30083`, `main` branch)**: Production environment running the **MD-000 Executive Command Center** and live `/apps/<slug>` consoles for all 12 products.

---

## 🔒 Security & Code Integrity Rules
- **No `bharma`**: The cybersecurity product and all related variables, functions, and files are strictly named **`Dharma` (`@chakra/dharma` — ಧರ್ಮ)**.
- **Design System Tokens**: Unified palette: `#1A237E` (Royal Indigo), `#3949AB` (Secondary Royal), `#B71C1C` (Sacred Kumkuma), `#F59E0B` (Temple Gold), `#059669` (Prakruti Emerald), `#FFFDF9` (Warm Ivory).
- **Branch Protection**: `main`, `release/release-v*`, and `develop` are read-only protected branches on `https://github.com/Chakra-Group`. All changes flow through the 5-Stage Agentic SDLC.

---

## 🏆 Mandatory Firm-Wide Engineering Excellence Standards (All 17+ Product Lines)
Every product line and digital employee must adhere to:
1. **Six Sigma (`6σ` DMAIC / DMADV)**: Target `<= 3.4 DPMO` (`99.99966%` yield) enforced via `tools/done-done-gate.mjs` (`G1–G9`).
2. **DORA Elite & Google SRE Error Budgets**: 5-Stage Agentic SDLC, `<5%` change failure rate, `<60m` MTTR, and `99.9%` SLO error-budget protection (`observabilityAndFinops.js`).
3. **NIST SSDF & OWASP ASVS**: Automated secret scanning (`G3`), dangerous-pattern blocking (`G5`), dependency audit (`G6`), and Zero-Trust `Dharma IAM` (`:8092`).
4. **Honest End-Customer Persona Browser UI Review & Feedback Loop (`G8`)**: Every product maintains specialized customer personas in `uat/feedback.json` and runs **real browser automation UI reviews** (`tools/persona-ui-browser-review.mjs` via headless Edge CDP against `UAT :30082` / `DEV :30081`) so personas actually open the live UI, inspect rendered DOM/console errors/images, and turn honest friction into verified `fixRef` improvements before promotion.
5. **6-Eye Adversarial Counter-Review (`G11`)**: Because development is autonomous, every product requires 6 distinct reviewers (`builder_owner`, `domain_architect`, `security_challenger`, `fintech_sre_challenger`, `independent_counter_reviewer`, `customer_persona_advocate`) with at least 1 resolved counter-challenge in `review/SIX_EYE_REVIEW.json`.
6. **Zero Dummy Data, 100% Unit (Backend + Every Frontend) + >90% Functional Coverage, Cognitive Complexity < 15, Duplication < 10%, UAT=PROD Image Parity & Multi-Tenant `org_id` Readiness**: Zero dummy/placeholder data in `DEV`, `UAT`, or `PROD`; zero functional tests in `PROD`; every product line—including **every frontend (`iniolu-frontend`, `chitra/apps/web`, Command Center & product UI views)**—must maintain **100% unit test pass/coverage and >90% functional test coverage** (`G12_coverage_sla`) validated against **both `DEV` (`:30081`) and `UAT` (`:30082`)** (`tools/simulate-functional-test.mjs`), keep **function cognitive complexity strictly `< 15`** and **duplicate code `< 10%`** (`G13_duplication_sla`), run the **exact same immutable container image in `UAT` and `PROD`** (`DEV` may use `-dev`), and maintain `org_id` isolation for future enterprise replication.

---

## 🧠 Persistent Workforce Context & Session Crash Recovery Protocol
- **Context Preservation Rule**: At session start, read only the last 40 lines of `MEMORY.md`. Read `CHAKRA_PERSISTENT_CONTEXT.json` only when resuming interrupted work. Never load the full `MEMORY.md`; search it for specific details when needed.


---

## 🤖 Head Coordinator, FinOps & Model-Switching Operations (Single Source of Truth)
- All operational directives for `EMP-AI-000` (free-slot dispatch, continuous quality-first execution, `DEV/UAT` evaluation vs `PROD :30083`-only live ops, FinOps attribution, persona conversation history, and swarm model-switching/quota handling) are maintained in **one version-controlled file**: [`chakra-agents/docs/HEAD_COORDINATOR_OPERATIONS.md`](chakra-agents/docs/HEAD_COORDINATOR_OPERATIONS.md).
- Always read that canonical git-tracked document before modifying coordinator, watchdog, FinOps, or model-switching behavior. Never duplicate operational rules here.
