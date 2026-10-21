---
name: acceptance-evidence-harness
description: >-
  Aggregates policy, MCP, and stream results into one go/no-go evidence bundle
  with executable proof. Applies before completing an AI feature when those
  claims need a single acceptance bundle, including unresolved checks and
  residual risk.
---

# Acceptance Evidence Harness

## When to use (and when not)

Use this skill before declaring an AI feature complete when policy, MCP, and stream claims must be accepted together. Use it when existing test selections and results are scattered, when unresolved criteria need executable fixtures, or when a reviewer needs one decision with residual risk.

Do not use it:

- To choose which tests to run. `test-target-selector-with-codex` selects; this skill consumes its selection and results.
- To finish stalled tasks. `task-finisher-with-grok-v1-5` finishes tasks; this skill leaves a reusable harness and evidence.
- To verify only that services or processes are up. `truth-first` covers system state; this skill verifies product behavior with runnable checks.
- To run an adversarial multi-agent review. `santa-method` does that; this skill captures deterministic evidence.
- To certify claims that cannot be executed. Such claims stay `unverified` and cannot support GO.

## Inputs

- Acceptance criteria, demo scope, and the exact repo state (commit or branch).
- Existing test selection and raw results from `test-target-selector-with-codex` or the repo.
- Verification commands, environment, and an artifact directory.
- Policy source and precedence table from `cross-agent-policy-compiler`.
- MCP capability map, typed schemas, permission matrix, and allow/deny/malformed prompts from `mcp-tool-boundary-designer`.
- Stream state machines, replay fixtures, and prior run output from `nextjs-toolcall-stream-architect`.
- Named owner, approval records, and any waivers.
- Known limitations and required exclusions.

## Steps

1. **Restate acceptance criteria.** Convert every claim into an observable check with a domain (`policy`, `mcp`, `stream`), expected result, and failure signal. **Gate:** no vague criterion remains.
2. **Ingest, do not reselect.** Take the existing selection and results as given, and record their provenance. If selection is missing, add only minimal checks for unresolved criteria and label the gap. **Gate:** suite source and raw results are traceable.
3. **Map coverage.** Tie each check to a policy rule, an MCP allow/deny/malformed case, or a stream state. **Gate:** every required criterion has a check or an explicit `unverified` status.
4. **Generate missing proof.** Write executable fixtures, commands, and expected artifacts for unresolved criteria; use synthetic data and mocked side effects. **Gate:** each new fixture runs and its failure mode is testable.
5. **Gate irreversible actions.** Identify writes, charges, messages, deletes, and production calls. Require a named human approver before any such action; otherwise dry-run or mock it. **Gate:** approval is recorded, or the action is excluded and marked `unverified`.
6. **Run the smallest honest set.** Execute only the checks needed for the criteria in a test or sandbox environment. Capture stdout, stderr, exit code, duration, and artifact paths. **Gate:** results come from commands, not inference; stop on unexpected side effects.
7. **Classify every check.** Use `passed` only when the expected result is observed and the command succeeds; use `failed` on mismatch; use `skipped` when not run; use `unverified` when no executable proof exists. **Gate:** no `skipped` or `unverified` check appears under `passed`.
8. **Apply the decision rule.** Return `GO` only when all required criteria pass, required approvals exist, and no required check is unverified. Otherwise return `NO-GO`; record owner-approved waivers explicitly. **Gate:** the rule is applied verbatim.
9. **Emit one bundle.** Fill the output contract with raw results, exact commands, artifact paths, and residual risk. **Gate:** every bundle claim matches an artifact or raw output.
10. **Hand back regression inputs.** Offer new fixtures to the owning skill and record whether they were accepted. **Gate:** acceptance or gap is recorded; do not edit another skill's contracts silently.

## Output contract

```yaml
bundle: acceptance-evidence
decision: GO | NO-GO
feature: <name>
scope: <commit, branch, environment>
generated: <ISO-8601 timestamp>
owner: <accountable person or team>
suite_selection: <source of selected tests>
criteria:
  - id: <AC-1>
    claim: <observable behavior>
    domain: policy | mcp | stream
    check: <test or fixture id>
    command: <exact command>
    expected: <observable result>
    actual: <observed result>
    exit_code: <integer or n/a>
    status: passed | failed | skipped | unverified
    artifact: <path>
passed_checks: [<ids>]
failed_checks: [<ids>]
skipped_checks: [<ids>]
unverified_checks: [<ids>]
approvals:
  - action: <gated action>
    approver: <named human>
    status: approved | not_requested | denied
artifacts:
  - <path>
residual_risk: >-
  <honest statement of what the evidence does not prove>
decision_reason: <why GO or NO-GO>
```

## Guardrails

- Never invent a command, exit code, artifact, or result. Quote observed output.
- Never promote a skipped or unverified check to passed. Missing evidence means `NO-GO` for required scope.
- Respect the precedence table from `cross-agent-policy-compiler`. Policy conflicts remain `NO-GO` until resolved.
- Do not run irreversible actions without explicit named human approval. Default to dry-run, mocks, and test credentials.
- Use synthetic test data. Do not place secrets, tokens, or personal data in the bundle; reference environment variable names.
- Keep `a property manager` redacted in artifacts and examples.
- Do not weaken checks, alter fixtures to pass, or change product code to reach GO unless the scope change is authorized and recorded.
- Do not reselect the suite to hide failures.
- Treat a GO as scoped to the recorded commit, environment, and criteria; it is not a general release approval.
- Stop and report if a check mutates state unexpectedly or requires broader permissions.

## Works with

- `cross-agent-policy-compiler` supplies policy source, precedence, and adapter constraints. This skill cites rule IDs in policy criteria and treats unresolved adapter conflicts as `NO-GO`; it does not edit the policy.
- `mcp-tool-boundary-designer` supplies the capability map, schemas, permission matrix, and test prompts. This skill runs allow, deny, and malformed-input checks and records denied writes; it does not design tool boundaries.
- `nextjs-toolcall-stream-architect` supplies state machines, tool registry, and replay fixtures. This skill replays partial streams, tool failures, cancellation, and timeouts; new fixtures feed back as regression inputs.

## Agent notes

Use one source at `.agents/skills/acceptance-evidence-harness/` and mirror or symlink it to `.claude/skills/acceptance-evidence-harness/`. Keep `SKILL.md` lean; put long fixtures or logs in `references/` or `assets/` only when needed.

- **Cursor.** Install at `.agents/skills/acceptance-evidence-harness/`, `.cursor/skills/acceptance-evidence-harness/`, or `~/.cursor/skills/acceptance-evidence-harness/`; Cursor also loads `.claude/skills` and `.codex/skills`. Invoke with `/acceptance-evidence-harness`, run checks from the terminal, and attach the bundle to the task summary. Keep always-on `.cursor/rules/*.mdc` narrow and pointed at `AGENTS.md`; do not copy this procedure into every rule.
- **Claude Code.** Install at `.claude/skills/acceptance-evidence-harness/SKILL.md` or `~/.claude/skills/acceptance-evidence-harness/SKILL.md`; invoke automatically by description or as `/acceptance-evidence-harness`. Put durable project guidance in `CLAUDE.md`. Use subagents only for independent verification of the bundle, not to produce its evidence.
- **Codex.** Install at `.agents/skills/acceptance-evidence-harness/SKILL.md` or `~/.agents/skills/acceptance-evidence-harness/SKILL.md`; invoke implicitly, with `$acceptance-evidence-harness`, or through `/skills`. Execute commands, save artifacts, and report exact exit codes. Point `AGENTS.md` to the skill.

## Example

An illustrative Next.js property assistant adds `create_felanmalan` to a streaming route. Existing selection covers the route and MCP schema. The harness ingests both, adds a malformed-input fixture and a dropped-stream replay, and uses:

```ts
const malformedInput = {
  caseId: "AC-2",
  input: { description: "leak in unit 12" },
  expect: { denied: true, reason: "validation_error" },
};
```

Command: `npm run test:acceptance -- --case felanmalan`. The malformed-input check exits 1, so the bundle marks it `failed`; the live-write check has no approval and is `unverified`; the decision is `NO-GO`. No production write is attempted. Repo label: `a property manager/property-assistant`.
