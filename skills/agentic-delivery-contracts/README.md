# agentic-delivery-contracts: draft skill bundle (NOT published)

Four portable skills that turn repo policy, MCP tool boundaries, streaming tool calls, and acceptance evidence into linked contracts, so Cursor, Claude Code, and Codex ship AI features with fewer surprises.

Drafted 2026-10-19 by free OpenCode models (analysis, proposal, review and revision by different models). Draft quality: needs Markus's review before any use or publication.

| skill | type | purpose |
|---|---|---|
| [cross-agent-policy-compiler](cross-agent-policy-compiler/SKILL.md) | general | Compile one repo policy source into portable AGENTS.md, Cursor rules, and Claude Code instructions. |
| [mcp-tool-boundary-designer](mcp-tool-boundary-designer/SKILL.md) | specific | Design least-privilege MCP tools for internal APIs with schemas, approvals, and failure tests. |
| [nextjs-toolcall-stream-architect](nextjs-toolcall-stream-architect/SKILL.md) | specific | Build typed Next.js streaming routes that call LLM tools safely and predictably. |
| [acceptance-evidence-harness](acceptance-evidence-harness/SKILL.md) | general | Aggregate policy, MCP, and stream results into a single go/no-go evidence bundle with executable proof. |

## When to use each
- **cross-agent-policy-compiler**: Use when a repo needs consistent rules across Cursor, Claude Code, and Codex, or agent behavior drifts between tools.
- **mcp-tool-boundary-designer**: Use when exposing an internal property, ERP, CRM, or Supabase API to agents through MCP.
- **nextjs-toolcall-stream-architect**: Use when adding chat, streaming UI, or LLM tool calling to a TypeScript Next.js app.
- **acceptance-evidence-harness**: Use before completing an AI feature when policy, MCP, and streaming claims need one go/no-go evidence bundle.

## Synergy
- **cross-agent-policy-compiler**: Its constraints govern MCP permissions, streaming contracts, and acceptable evidence for the harness.
- **mcp-tool-boundary-designer**: Exports tool contracts consumed by the streaming skill and permission checks enforced by policy.
- **nextjs-toolcall-stream-architect**: Consumes MCP tool contracts and emits runtime evidence the verification harness can replay.
- **acceptance-evidence-harness**: Aggregates policy compliance, MCP permission results, and stream-state evidence into one go/no-go bundle; its fixtures become regression inputs.

## Install (per agent)
- Codex + Cursor: copy each folder to `.agents/skills/<name>/` (project) or `~/.agents/skills/` (user).
- Claude Code: copy or symlink the same folders to `.claude/skills/<name>/` (project) or `~/.claude/skills/`.
- Cursor also reads `.cursor/skills/` and `.claude/skills/`; always-on project rules stay in `.cursor/rules/*.mdc` / `AGENTS.md`.

## Overlap check (nearest existing Agensi skills, token cosine; (M) = Markus's own)
- **cross-agent-policy-compiler**: agent-skill-regression-tester 0.142, instruction-layer-auditor 0.132, design-system-md-brand-quality-ui-via-design-md 0.132, test-target-selector-with-codex (M) 0.123. Model notes: hooks-settings-for-claude-code: No settings or hooks; compiles cross-agent policy adapters.; instruction-layer-auditor: Generates a new policy source instead of only auditing conflicts.; managing-long-coding-sessions-with-claude: No session memory; focuses durable repo rules.; test-target-selector-with-codex: Selects which tests to run; this skill compiles cross-agent policy and does not choose tests.
- **mcp-tool-boundary-designer**: hooks-settings-for-claude-code (M) 0.165, socratic-code-reviewer 0.138, making-complex-systems-agent-readable-with-grok (M) 0.127, cli-ux-doc-builder 0.119. Model notes: making-complex-systems-agent-readable-with-grok: Authors executable tool contracts, not documentation architecture.; getting-started-with-agensi-mcp: Builds internal servers; does not connect to Agensi.; skill-install-safety-gate: Designs first-party MCP boundaries, not third-party package screening.; hooks-settings-for-claude-code: Configures Claude Code hooks and settings, not least-privilege MCP tool boundaries.
- **nextjs-toolcall-stream-architect**: nextjs-app-router-audit 0.156, prompt-dataset-builder 0.123, frontend-dev-engine 0.122, token-optimizer 0.09. Model notes: nextjs-app-router-audit: Builds new streaming tool-calling flows instead of auditing router performance.; prompt-engineer: Focuses TypeScript runtime contracts, not prompt templates.; ai-prompt-injection-defense-shield-llm-jailbreak-security-auditor-code-review-agent: Addresses stream and tool state safety, not prompt injection scanning.
- **acceptance-evidence-harness**: test-target-selector-with-codex (M) 0.167, ai-agent-testing-evaluation-bundle 0.124, benchmarking-ai-agents-beyond-models 0.12, agent-skill-regression-tester 0.112. Model notes: test-target-selector-with-codex: Chooses which tests to run; this harness consumes those results and emits one go/no-go evidence bundle.; task-finisher-with-grok-v1-5: Creates reusable harnesses instead of finishing stalled tasks.; truth-first: Verifies product behavior with runnable checks, not only system state.; santa-method: No adversarial multi-agent loop; captures deterministic evidence.

## Demonstration in a showcase repo
In the Next.js + MCP property-management demo, compile repo rules, expose felanmälan and uthyrning tools through a least-privilege MCP server, build a streaming assistant that calls them, then run the acceptance harness to aggregate allowed reads, gated writes, malformed input, and a dropped stream into one go/no-go evidence bundle. Show the three agent adapters, the .agents/skills mirror, and the captured evidence bundle.
