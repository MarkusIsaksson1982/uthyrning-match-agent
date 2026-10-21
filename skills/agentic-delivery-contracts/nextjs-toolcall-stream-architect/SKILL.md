---
name: nextjs-toolcall-stream-architect
description: Builds typed Next.js streaming route handlers that call LLM tools with shared Zod schemas, cancellation, timeouts, a server-only MCP tool registry, and replay fixtures. Applies when adding chat, streaming UI, or LLM tool calling to a TypeScript Next.js app.
---

# Next.js Tool-Call Stream Architect

Build a streaming tool-calling flow whose server route, client reducer, MCP registry, and failure states share one typed contract.

## When to use (and when not)

Use this skill when:

- A Next.js app needs a chat or assistant surface that streams model output and tool events.
- Tool calls must be typed, validated, cancellable, and gated by approval.
- A route handler and client reducer need one shared event contract.
- Partial streams, disconnects, timeouts, and tool failures need replayable fixtures.

Do not use this skill when:

- The task is auditing existing App Router performance.
- The task is prompt-template or model-instruction design.
- The task is prompt-injection scanning.
- The task is designing MCP permissions and schemas from scratch; use `mcp-tool-boundary-designer` first.
- The task is compiling cross-agent repository policy; use `cross-agent-policy-compiler`.

## Inputs

Collect these before writing code. Mark missing items as blocked rather than inventing them.

- Target route path, client entry point, and runtime constraints already used by the repo.
- Existing message types, provider interfaces, streaming utilities, and test commands.
- MCP tool contracts: names, argument schemas, result schemas, scopes, and approval rules.
- Repository policy constraints, forbidden actions, and required verification commands.
- Timeout, retry, cancellation, and approval UX requirements.
- Secret names and server-only modules, but never secret values.
- Existing replay fixtures and the package manager command for focused tests.

## Steps

1. Inventory the target route, chat components, schemas, server-only modules, and verification commands. Gate: list every file to create or change, and every unresolved input.

2. Define the message, tool-call, and error state machines before implementation. Include terminal states, legal transitions, and which events are idempotent. Gate: every incoming event has exactly one documented transition or an explicit rejection path.

3. Create shared runtime schemas (Zod if the repo already uses it; otherwise the repo's existing validator, or mark the step blocked) for the request, stream events, tool arguments, tool results, and error codes. Infer TypeScript types from these schemas in one shared module. Gate: valid and invalid samples parse as expected before wiring the route.

4. Implement a server-only tool registry that maps registered tool names to schemas and handlers. Reject unknown tools by default and keep MCP credentials out of client code. Gate: a client-side import check or build check confirms the registry cannot enter the browser bundle.

5. Implement the route handler to validate the request, open a typed stream, and emit only schema-valid events. Bind an `AbortController` to `request.signal` and a configured deadline. Gate: tests cover success, invalid input, timeout, client abort, and cleanup.

6. Enforce the MCP permission matrix and approval gate before any write tool executes. Return an explicit `approval_required` state when confirmation is missing, denied, or expired. Gate: denied and expired approvals never reach the tool handler, and the audit fields are populated.

7. Implement the client stream reducer against the shared event schemas. Handle partial chunks, duplicate events, disconnects, and terminal errors without corrupting prior state. Gate: replaying malformed and out-of-order events produces a defined terminal state, not an unhandled branch.

8. Add replay fixtures for a normal stream, a partial or dropped stream, a malformed event, a denied tool call, and a tool failure. Give each fixture an expected final state. Gate: every fixture is asserted by a focused test.

9. Run the focused replay tests and the project build with the repository's commands. Capture exact commands, exit codes, and skipped checks. Gate: no verification claim is made without captured output.

10. Complete the output contract and hand the fixtures, commands, and results to `acceptance-evidence-harness`. Gate: every contract field is filled or explicitly marked unverified.

## Output contract

```markdown
# nextjs-toolcall-stream: delivery record

## Scope
- Route: <path>
- Client entry: <path>
- Runtime constraint: <repo-provided constraint>

## State machines
- Message states: <states and terminal states>
- Tool-call states: <states and approval gate>
- Error states: <codes and recovery paths>

## Files
| Path | Purpose | Status |
| --- | --- | --- |
| <path> | <purpose> | <created/changed/blocked> |

## Verification
- `<command>` -> exit `<code>`; <observed result>
- Fixtures replayed: <fixture names>
- Cancellation evidence: <test or observation>
- Timeout evidence: <test or observation>

## Approval and policy
- Write tools gated: <tool names or "none">
- Policy source: <path or "not provided">
- Approval behavior: <allowed/denied/expired handling>

## Residual risk
- <risk, unhandled state, or "none observed">
```

## Guardrails

- Keep provider keys, MCP credentials, and privileged clients server-only. Never place secret values in client code, fixtures, logs, or the output contract.
- Validate every request, tool argument, tool result, and stream event. Deny unregistered tools by default.
- Require explicit human approval before irreversible writes. This skill may implement an approval gate; it must not bypass or weaken one.
- Never fabricate tool contracts, runtime results, or test outcomes. Mark missing inputs and unverified behavior as blocked.
- Always close streams and release resources on abort, timeout, or failure. Do not leave work running after a terminal state.
- Avoid logging message content or tool payloads by default unless the repository policy explicitly permits it.
- Respect existing package manager, test commands, and policy precedence. Do not add dependencies unless the inputs authorize them.
- Surface policy conflicts instead of silently choosing a rule.

## Works with

- `cross-agent-policy-compiler`: consume its policy source, precedence table, and adapter constraints; report violations in the delivery record.
- `mcp-tool-boundary-designer`: consume its tool schemas, permission matrix, approval gates, and audit fields; do not invent tool contracts.
- `acceptance-evidence-harness`: hand off replay fixtures, focused test commands, captured exit codes, and residual risks so they can be aggregated into one go/no-go bundle.

## Agent notes

- Cursor: use the project skill location; invoke by description or `/nextjs-toolcall-stream-architect`.
- Claude Code: mirror or symlink `.agents/skills/nextjs-toolcall-stream-architect/` to `.claude/skills/nextjs-toolcall-stream-architect/`; invoke by description or `/nextjs-toolcall-stream-architect`.
- Codex: keep the skill under `.agents/skills/nextjs-toolcall-stream-architect/`; invoke implicitly, via `$nextjs-toolcall-stream-architect`, or through `/skills`.

## Example

An illustrative property-management assistant adds a route handler and chat panel. The route accepts typed messages, validates a `ChatEvent` union, and is expected to abort on client disconnect or a configured deadline. The `uthyrning` read tool streams normally; the `felanmälan` write tool returns `approval_required` until the user confirms.

In the illustrative replay, the reducer receives `tool-call`, then the fixture drops the stream mid-call. The expected reducer outcome is `error{code:"aborted"}`, preserving the last valid messages and offering retry. Verification is recorded only after focused replay tests and the build are run; commands, captured outputs, fixtures, and approval behavior belong in the delivery record.
