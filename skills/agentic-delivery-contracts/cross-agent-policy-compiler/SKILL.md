---
name: cross-agent-policy-compiler
description: Produces portable AGENTS.md, Cursor rule files, and Claude Code adapter notes from one repository policy source so Cursor, Claude Code, and Codex follow consistent rules. Use when a repo needs consistent cross-agent rules or when agent behavior drifts between tools.
---

# Cross-Agent Policy Compiler

## When to use (and when not)

Use this skill when:

- A repository has rules spread across prompt files, editor rules, and agent-specific instructions.
- Cursor, Claude Code, and Codex behave differently on the same repository task.
- A policy owner needs one durable source of truth with explicit precedence.
- Agent adapters must be generated, reviewed, and tested against conflicting instructions.

Do not use this skill when:

- The task is only to audit existing instruction layers.
- The task is to configure Claude Code hooks or settings.
- The task is to manage session memory or long-running conversation state.
- The task is to choose which tests to run.
- The repository has no identifiable policy owner and no existing rules. Ask for an owner before compiling.

## Inputs

Collect and confirm:

- Existing instruction files, including `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/*.mdc`, and any legacy prompt files.
- Documented verification commands from the repository, such as lint, typecheck, test, and build scripts.
- Security, privacy, data-handling, and deployment constraints already stated by the repository or its owners.
- Known forbidden actions, approval requirements, and irreversible operations.
- Named policy owner, reviewers, and any exception process.
- Target installation paths for Cursor, Claude Code, and Codex.

Do not infer missing constraints. Record missing inputs as open questions.

## Steps

1. Inventory every existing rule and instruction file. Record its path, scope, owner if stated, and whether it is always-on or conditional.
   Verification gate: produce a complete inventory table; search the repository for instruction filenames and rule frontmatter before proceeding.

2. Extract non-negotiable constraints and forbidden actions. Separate hard requirements from preferences, defaults, and examples.
   Verification gate: every extracted item cites its source path and line or section; uncited items are removed or marked unknown.

3. Build a precedence model. The policy source is the record. Owner decisions are time-boxed amendments with an owner, scope, reason, and expiry; they override the source only for that period. Generated adapters, repository defaults, and individual preferences follow the recorded policy.
   Verification gate: every precedence row has a scope and an owner; conflicting rows are listed rather than silently merged.

4. Write one tool-agnostic policy source, recommended at `docs/agent-policy.md`. Include constraints, forbidden actions, precedence, exceptions, approval gates, and verification expectations. Keep tool paths out of the policy body.
   Verification gate: policy contains no Cursor-, Claude-, or Codex-specific syntax except clearly marked adapter references.

5. Generate the three adapters:
   - `AGENTS.md`: durable repository instructions, a precedence summary, and a pointer to this skill and the policy source.
   - `.cursor/rules/*.mdc`: narrow, scoped rules with `description`, `globs`, and `alwaysApply`; link back to `AGENTS.md` and the policy source instead of duplicating all policy text.
   - `CLAUDE.md` plus Claude adapter notes: project guidance and adapter notes.
   Verification gate: every generated adapter maps to at least one policy section, and no adapter introduces a new unowned rule.

6. Preserve explicit exceptions. Require an owner, scope, reason, and expiry or review date for each exception.
   Verification gate: reject exceptions without an owner or expiry; expired exceptions are flagged for human review.

7. Test each adapter against conflict and absence scenarios in all three tools. Use the same prompts or checks for each tool and record observed behavior, not expected behavior.
   Verification gate: every checklist row has an observed result or is marked skipped with a reason.

8. Deliver the policy source, adapters, precedence table, and test evidence. List unresolved conflicts and missing inputs.
   Verification gate: no claim of cross-agent consistency without recorded adapter observations.

## Output contract

Produce a Policy Bundle with these sections: sources, non-negotiable constraints, forbidden actions, precedence, exceptions, generated adapters, conflict test checklist, verification, open questions, and residual risk.

## Guardrails

- Do not invent constraints, owners, incidents, tool behavior, or test results.
- Do not silently resolve conflicting rules. Surface the conflict and require a human decision.
- Obtain explicit human approval before overwriting existing instruction files, deleting rules, broadening always-on rules, or changing verification commands.
- Treat policy publication and adapter rollout as reversible file changes, but stop before any irreversible action such as deleting repository history or changing production access.
- Never copy secrets, tokens, or credentials from configuration files into policy or adapters.
- Do not add hooks, settings, test-selection logic, or session memory to this skill.
- Mark untested adapters as unverified; do not claim behavior was observed across tools without recorded evidence.
- Keep tool-specific details in the Agent notes section and generated adapters, not in the policy body. Treat platform-loading behavior as an assumption to verify, not as a fact.

## Works with

- `mcp-tool-boundary-designer`: this skill supplies permission constraints, approval gates, and forbidden actions that the MCP capability map must enforce.
- `nextjs-toolcall-stream-architect`: this skill supplies streaming safety, cancellation, and secret-handling rules that the route handler and client reducer must follow.
- `acceptance-evidence-harness`: the produced constraints and conflict checklist become acceptance checks; the harness records passed, failed, skipped, and unverified results in its go/no-go bundle.

## Agent notes

### Cursor

- Use the project skill location; verify which project locations the platform loads.
- Invoke it with `/cross-agent-policy-compiler` or rely on description matching.
- Keep always-on guidance in narrow `.cursor/rules/*.mdc` files with `description`, `globs`, and `alwaysApply`; link `AGENTS.md` rather than duplicating it.

### Claude Code

- Mirror or symlink the project skill location to `.claude/skills/cross-agent-policy-compiler/` only after verifying platform loading.
- Invoke it automatically by description or with `/cross-agent-policy-compiler`.
- Store project guidance in `CLAUDE.md`; keep hooks and settings out of this skill and in `.claude/settings.json` when needed.

### Codex

- Use the project skill location.
- Invoke it implicitly or with `$cross-agent-policy-compiler` or `/skills`.
- Put durable repository instructions in `AGENTS.md` and have it point to this skill and the policy source.

## Example

Example scenario: a property-management Next.js repo with booking approval, generated adapters, and conflict checks.
