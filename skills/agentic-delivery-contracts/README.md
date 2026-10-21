# agentic-delivery-contracts: draft skill bundle (NOT published)

Four portable skills that turn repo policy, MCP tool boundaries, streaming tool calls, and acceptance evidence into linked contracts, so Cursor, Claude Code, and Codex ship AI features with fewer surprises.

Drafted 2026-10-19. Status: draft v0.2, cross-reviewed by several models; not yet used in production.

| skill | type | purpose |
|---|---|---|
| [cross-agent-policy-compiler](cross-agent-policy-compiler/SKILL.md) | general | Produce portable AGENTS.md, Cursor rules, and Claude Code instructions from one repo policy source. |
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
- Codex + Cursor: copy each folder to `.agents/skills/<name>/` in the project.
- Claude Code: copy or symlink the same folders to `.claude/skills/<name>/` in the project.
- Cursor also reads `.cursor/skills/` and `.claude/skills/`; always-on project rules stay in `.cursor/rules/*.mdc` / `AGENTS.md`.


## Demonstration in a showcase repo
In the Next.js + MCP property-management demo, produce repo rules, expose felanmälan and uthyrning tools through a least-privilege MCP server, build a streaming assistant that calls them, then run the acceptance harness to aggregate allowed reads, gated writes, malformed input, and a dropped stream into one go/no-go evidence bundle. Show the three agent adapters, the .agents/skills mirror, and the captured evidence bundle.
