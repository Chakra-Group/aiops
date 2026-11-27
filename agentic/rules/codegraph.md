---
trigger: always_on
description: Canonical CodeGraph policy — all digital workers query the shared local CodeGraph index before reading code file-by-file.
---

# CodeGraph Code-Intelligence Policy (MD-000 directive)

## What is installed
- Engine: **CodeGraph** (`@colbymchenry/codegraph` v1.6.4), **MIT license**, 100% local (SQLite graph, no API keys, no cloud).
- It satisfies the homegrown/open-source-only policy (`rules/md_board_governance.md`). No commercial-integration approval needed.
- All 19 Chakra product repos are indexed at `<repo>/.codegraph/codegraph.db`.

## How workers use it
**Code-understanding rule:** Before exploring code with grep/glob/read, a digital worker MUST query CodeGraph first through chakra-agents:

- MCP tools: `codegraph_workspace_status`, `codegraph_search`, `codegraph_explore`, `codegraph_node`, `codegraph_callers`, `codegraph_callees`, `codegraph_impact`, `codegraph_files`, `codegraph_index_status`.
- REST: `GET /api/v1/codegraph/<command>?projectPath=<repo>&query|symbol=<...>`.
- All calls are confined to the Chakra workspace by `src/codeGraphService.js` (Dharma zero-trust). An unindexed project returns an explicit `NOT_INDEXED` — never a fabricated answer.

## Keeping graphs fresh across environments and branches
- **Local/dev:** CodeGraph's file watcher auto-syncs on every source change (debounced). Verify with `codegraph status <path>`.
- **Branch changes:** after `git checkout`/`git pull`, CodeGraph reconciles on the next MCP call (connect-time catch-up). Force a rebuild with `codegraph index <path>` if needed.
- **DEV/UAT/PROD images:** each image is built from its own branch (`develop` / `release` / `main`) and must run `codegraph init <repo> -y` at build time so the shipped graph matches the shipped source. UAT and PROD share one immutable image digest. Do not ship a stale graph.

## Version pin
Version is pinned in `chakra-agents` (`1.6.4`). Any upgrade must be verified in DEV first, then promoted with UAT==PROD parity.
