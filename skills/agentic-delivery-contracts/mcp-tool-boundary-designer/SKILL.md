---
name: mcp-tool-boundary-designer
description: Designs least-privilege MCP tools for internal property, ERP, CRM, or Supabase APIs. Use when exposing internal APIs to agents through MCP, especially when read and write actions need typed schemas, scopes, approval gates, idempotency, audit fields, and failure tests.
---

# MCP Tool Boundary Designer

Turn an internal API surface into a small, typed, auditable MCP tool boundary. Produce contracts before implementation; prove denial paths as well as success paths.

## When to use (and when not)

Use this skill when:
- Exposing an internal property, ERP, CRM, or Supabase API to agents through MCP.
- A read tool needs scoped access, bounded pagination, and predictable errors.
- A write tool needs typed input, idempotency, an approval gate, and audit evidence.
- An existing MCP server has tools that are too broad, untested, or missing ownership.

Do not use this skill for:
- Installing, screening, or trusting third-party MCP packages.
- Connecting to an external marketplace; this skill builds internal servers.
- Configuring Claude Code hooks or settings; use `hooks-settings-for-claude-code`.
- Streaming runtime implementation; hand contracts to `nextjs-toolcall-stream-architect`.
- Final go/no-go evidence aggregation; hand results to `acceptance-evidence-harness`.

## Inputs

Gather these before designing:
- Internal API routes, tables, or RPCs in scope, with sample requests and responses.
- Business capabilities and a named owner for each capability.
- Authentication model, existing scopes/roles, and tenant or property boundaries.
- Write actions, side effects, and which actions are irreversible.
- Approval policy and named human approver(s).
- Current MCP server code, if any, and its tool registry location.
- Existing tests, fixtures, sandbox access, and repository typecheck/lint commands.

Mark missing inputs as `UNVERIFIED` in the contract. Do not infer scopes, owners, endpoints, or side effects.

## Steps

1. Inventory every API action; classify read/write, assign a capability, and assign the capability owner. Gate: no action lacks classification or owner; unknowns are `UNVERIFIED`.
2. Expose only the minimum capabilities; reject raw SQL, broad admin, bulk export, and secret-reading tools unless explicitly required. Gate: record exposed and intentionally denied capabilities.
3. Define one tool per action or cohesive capability with `verb_noun` names and typed schemas in shared TypeScript under `src/mcp`; reject free-form objects and `any`. Gate: schemas compile, reject unknown fields, and encode tenant/property IDs explicitly.
4. Build a permission matrix: tool, capability, read/write, scopes, approval mode, owner. Gate: each tool has one scope set and one approval mode; no scope is broader than required.
5. Gate writes and irreversible actions with a preview/dry run, a named human approver, and approval bound to the exact payload. Gate: the deny path is tested; no self-approval or payload reuse.
6. Require idempotency for mutations, cursor pagination with a maximum page size for lists, and a closed error contract. Gate: replay and pagination tests exist; errors expose codes, not stack traces or secrets.
7. Audit every allow, deny, and failure with timestamp, request ID, actor, agent/client, tool, capability, scopes, input digest, approval ID/approver, outcome, error code, latency, and target IDs. Gate: sensitive values are redacted or hashed.
8. Write test prompts per tool: allowed, denied, malformed, and cross-tool escalation where relevant. Gate: every tool appears in required categories; expected behavior is explicit.
9. Document a minimal skeleton: server-only registry, auth mapping, schema validation, approval check, audit write, handler, and error mapper. Gate: no client secrets; it matches the permission matrix.
10. Review the contract with the capability owner before implementation; implement under `src/mcp` only after review. Gate: owner review is recorded; writes also need sign-off from a named human approver.
11. Run schema, permission, malformed-input, deny, idempotency, pagination, and audit tests on sandbox or fixtures; never run write tests against production. Gate: capture commands, outputs, exit codes, and skipped tests; no pass without an exit code.
12. Hand the verified contract, prompts, and evidence downstream; record unresolved risks and rejected actions. Gate: contract is complete; every `UNVERIFIED` item has an owner or blocking note.

## Output contract

```markdown
# MCP Tool Boundary Contract: <capability>

## Scope and status
- API: <routes/tables/RPCs>; environment: <sandbox|production>
- Owners: <capability owners>; approvers: <named human approvers>
- Status: <draft|reviewed|approved>; unverified: <items or "none">

## Capability map
| Tool | Capability | R/W | Scopes | Approval | Owner |
| --- | --- | --- | --- | --- | --- |
| <verb_noun> | <capability> | <read/write> | <scope set> | <none/human> | <owner> |

## Tool schemas
### <tool_name>
- Input/output: <file and exported TypeScript types>
- Required IDs: <tenant/property/record IDs>
- Limits: <page size, timeouts>
- Side effects: <none or exact effects>

## Permission matrix
| Tool | Scope | Tenant boundary | Allowed | Denied | Approval |
| --- | --- | --- | --- | --- | --- |
| <tool> | <scope> | <rule> | <roles> | <roles> | <mode> |

## Approval gates
- Writes/irreversible: <list>
- Preview/dry run: <required behavior>
- Binding: <payload hash or equivalent>
- Denied behavior: <expected response>

## Idempotency, pagination, and errors
- Idempotency: <key, replay behavior>
- Pagination: <cursor, max page size, ordering>
- Error codes: <validation|unauthorized|conflict|not_found|rate_limited|upstream|retryable>

## Audit fields
- <field>: <source and redaction rule>
- Required: timestamp, request ID, actor, agent/client, tool, capability, scopes, input digest, approval ID/approver, outcome, error code, latency, target IDs.

## Test prompts
| Type | Prompt | Expected result |
| --- | --- | --- |
| allow | <prompt> | <tool call and result> |
| deny | <prompt> | <refusal and audit event> |
| malformed | <prompt> | <validation error> |
| escalation | <prompt> | <blocked transition> |

## Server skeleton
- Registry: <server-only path>; validation: <schema boundary>
- Approval check: <gate location>; audit write: <location>
- Handler: <internal API call>; errors: <mapper>

## Verification evidence
- Command: <command>; exit code: <code>
- Result: <passed|failed|skipped>; artifact: <path>

## Residual risk and sign-off
- Unresolved behavior: <...>
- Accepted risk: <...>
- Owner approval: <name/date>
- Human approver: <name/date>
```

## Guardrails

- Deny by default. Do not expose raw SQL, admin, bulk export, secret access, or unscoped record lookup.
- Require explicit human approval for writes, deletes, external communications, payments, permission changes, and any irreversible action. Never self-approve or fabricate an approval.
- Bind approvals to the exact payload and actor; reject expired, reused, or mismatched approvals.
- Do not invent API behavior, scopes, owners, or test results. Mark unknowns `UNVERIFIED` and stop before exposure if a write action lacks an approver.
- Keep secrets server-side. Do not place credentials in prompts, tool outputs, audit logs, or client bundles.
- Redact or hash personal and sensitive data in logs; avoid real customer data in test prompts.
- Run tests against sandbox services or fixtures. Do not perform production writes during boundary validation.
- Do not install or screen third-party MCP packages here.
- Report only evidence actually captured. A missing test is `skipped` or `unverified`, not a pass.

## Works with

- `cross-agent-policy-compiler`: consume its precedence and permission constraints. The MCP permission matrix must not exceed policy; feed boundary decisions back into the policy adapters.
- `nextjs-toolcall-stream-architect`: hand off typed tool contracts and the server-only registry. Streaming routes consume these contracts; they do not redefine scopes or approvals.
- `acceptance-evidence-harness`: pass the permission matrix, test prompts, expected results, and captured audit evidence. The harness aggregates them into the go/no-go bundle; this skill does not issue the final go/no-go.

## Agent notes

- Portable: `.agents/skills/mcp-tool-boundary-designer/SKILL.md`; mirror or symlink to `.claude/skills/` for Claude Code. Keep long API inventories, test matrices, and evidence in `references/`.
- Cursor: load from `.agents/skills/`; invoke `/mcp-tool-boundary-designer`; implement under `src/mcp`; put narrow always-on guidance in `.cursor/rules/*.mdc` and link `AGENTS.md`.
- Claude Code: use the mirrored copy; auto-invoked by description or `/mcp-tool-boundary-designer`; document approval prompt behavior in this skill; hooks and settings stay out of scope.
- Codex: store at `.agents/skills/mcp-tool-boundary-designer/`; invoke `$mcp-tool-boundary-designer` or `/skills`; record commands, exit codes, and results in `AGENTS.md`.

## Example

Example sketch for a Next.js property-management app exposing work orders. Reads stay separate from writes, and each capability has an owner:

```ts
// src/mcp/work-orders/contracts.ts
export type ListWorkOrdersInput = {
  propertyId: string;
  cursor?: string;
  limit: number; // 1..50
};

export const listWorkOrders = {
  name: "list_work_orders",
  capability: "work_order.read",
  scopes: ["property:read"],
  approval: "none",
  input: "ListWorkOrdersInput",
  output: "WorkOrderPage",
} as const;

export const createWorkOrder = {
  name: "create_work_order",
  capability: "work_order.write",
  scopes: ["work_order:write"],
  approval: "human",
  input: "CreateWorkOrderInput",
  output: "WorkOrder",
  idempotency: "required",
} as const;
```

Prompt checks: allow "List open work orders for property P-104"; deny "Create a work order without approval"; malformed "Create a work order for P-104" with no title. Record the expected tool call, refusal, validation error, and audit event for each.
