---
trigger: always_on
description: MD-000 directive 7220704893 — researched industry best practices for subagent/digital-employee context management, adapted to the Chakra 25-worker pool. Well-thought-out design pattern.
---

# Subagent Context Management — Design Pattern (MD-000 7220704893)

## 1. Research basis (industry best practices, 2026)
Sources reviewed: LangChain "Context Engineering for Agents" (write / select / compress / isolate),
"Context management in agent harnesses" (Arize), Mastra "Context engineering for AI agents"
(subagents get a clean window and return a condensed summary), Deep Agents docs (delegate
output-heavy work to keep the main context clean; restrict subagent nesting),
and arXiv 2610.20959 (bounded working memory via compaction; single-level delegation hierarchy).

Consensus pattern:
- **Write / select / compress / isolate** the context — never dump everything into one window.
- **Subagent isolation**: each worker gets its OWN clean context for a focused task and returns a
  *condensed result*, not a transcript.
- **Compaction**: replace a growing history with a bounded working-memory summary.
- **Single-level delegation**: subagents do not spawn subagents (avoids context explosion).
- **Durable state outside the window**: version-controlled ledgers/checkpoints are source of truth.

## 2. What Chakra ALREADY does well (keep)
- `agentic/rules/context_engineering.md`: 5-tier hierarchy (identity → task → retrieved facts →
  working memory → long-term), minimum-sufficient context, "read last 40 lines of MEMORY.md".
  This already implements write/select/compress/isolate at the instruction level.
- **Isolation**: 25 workers each have a distinct stream/domain/task (`concurrentWorkerPool.js`),
  so each has a naturally scoped task context — no shared global transcript.
- **Compaction**: `modelLoadBalancer.recordConversationTurn` stores a *summary* (`output_preview`,
  140 chars), not the full reply — a lightweight compaction already in place.
- **Durable checkpoints**: worker pool + head coordinator persist atomic checkpoints; a crash
  resumes from the last snapshot. `MEMORY.md` + NoSQL ledgers are version-controlled truth.

## 3. Gaps to adopt (well-thought-out, incremental)
1. **Per-worker bounded context ledger** — give each worker a compact `context.json` with:
   `{worker_id, role, current_goal, recent_decisions[], open_blockers[], last_summary}` capped
   (e.g. 20 decisions / 8 KB). Injected at dispatch, replaced (not appended) on compaction.
2. **Explicit compaction event** — when a worker's conversation turns exceed a threshold,
   summarise into `last_summary` and truncate `recent_decisions`. Trigger is deterministic
   (count/bytes), not model judgement.
3. **Condensed subagent return contract** — a worker's deliverable back to the coordinator is a
   structured result `{status, proof, artifacts[], open_questions[]}`, never a raw log. Already
   partly true (task_summary); formalise it.
4. **Single-level delegation guard** — employees may not dispatch to sub-sub-agents; all 25 report
   to EMP-AI-000/EMP-COO-006. Document as invariant (matches our org tree).
5. **Context budget telemetry** — expose per-worker context bytes/turn count in the cockpit so
   compaction is observable (parallel to the new execution log).

## 4. Design principles (non-negotiable)
- Minimum sufficient context; never load all rules/docs by default (AGENTS.md first, then by need).
- Working memory is compacted summaries; durable truth is the version-controlled ledger.
- Compaction is deterministic and lossless-for-decisions (keep decisions + blockers + proof refs).
- No worker context may bypass Dharma zero-trust scope (`authorizeMcpInvocation`).
- English default; zero dummy data in any context snapshot.

## 6. DEV/UAT two-layer validation (MD-000 directive, issue #203)
Both layers MUST run on DEV (:30081) and UAT (:30082) for every platform; neither alone is sufficient:
- **Layer 1 — deterministic**: `tools/simulate-functional-test.mjs` (API/contract/semantic checks; DEV 9/9, UAT 9/9).
- **Layer 2 — real user/browser**: `tools/persona-ui-browser-review.mjs` (headless Edge CDP; real DOM, console errors, images, landmarks across all 13 routes).
- **Capture findings**: any discrepancy between DEV and UAT, or any UI/UX finding, becomes a task to the owning employee via the PO council backlog — never silently waived. PROD is strictly excluded from functional/browser tests.
- Proven value: two-layer review caught UAT iniolu missing `<h1>` while DEV passed (UAT image drift) — invisible to deterministic gates alone.

## 5. Status
Research + design COMPLETE. Items 1–5 are proposed as backlog (BL-ai-001 in aiops/data/productBacklog.json
covers the ChakraAI sub-divisions; a dedicated BL for the pool context ledger is tracked). Adoption
follows full SDLC with UAT==PROD proof — no fabricated completion.
