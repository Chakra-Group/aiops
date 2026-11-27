# Token‑Usage Mindfulness Policy

**Purpose**: Ensure all AI workers operate within strict token budgets to preserve quota, keep prompts concise, and maintain high‑throughput autonomous execution.

## Core Rules
1. **Maximum Prompt Size**: 800 tokens per worker interaction (≈ 500 words). Any generated content exceeding this limit must be summarised before being fed back to the model.
2. **Compression Requirement**: All artefacts, logs, and reports must be compressed to ≤ 500 tokens when stored or transmitted.
3. **Automatic Back‑off**: On reaching a rate‑limit (HTTP 429 or `RESOURCE_EXHAUSTED`), the system must:
   - Perform exponential back‑off with jitter (10‑25 %).
   - Cascade to the next fallback model in the hierarchy: `gemini‑3.8‑flash` → `gemini‑3.8‑flash‑lite` → `gemini‑3.8‑pro` → `groq/llama‑3.3` → deterministic local model.
4. **Logging Limits**: Worker logs must not exceed 200 lines; each line ≤ 80 tokens.
5. **Monitoring**: The `/api/v1/workforce/token_audit` endpoint runs every 5 minutes, emitting a JSON summary. Any worker with an average prompt > 750 tokens triggers a **Token‑Budget Warning** in the Command Center.
6. **Escalation**: If three consecutive warnings occur for the same worker, the system automatically **pauses** that worker and notifies the Unblocking Authority.
7. **Documentation**: All prompts, summaries, and fallback actions are recorded in `data/worker_logs/<worker_id>.json` for audit.

## Enforcement
- The **Unblocking Authority Council** (Karyadarshi, Sutradhara, Chanakya, Rakshaka) reviews any token‑budget violations and can grant temporary exceptions with a documented justification.
- No human‑initiated action is required unless a **Critical Alert** is raised.

*Effective immediately across all 12 Chakra Groups products and the ChakraAgents workforce.*