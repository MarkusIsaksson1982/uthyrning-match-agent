# uthyrning-match-agent

An offline, rules-first demo of an AI-assisted rental workflow: an MCP server that an
agent can use to rank applicant households against a vacant listing at a property manager
(en fastighetsförvaltare), check eligibility, flag missing details and draft Swedish
replies. Deterministic guards run first, a pluggable model step runs second, and anything
uncertain is escalated to a human. All data is synthetic; no real tenants, listings or
organizations appear anywhere.

## Goal

Show a safe seam between deterministic rules and an AI step for the uthyrning (rental)
flow. The agent gets four MCP tools; the hard rules (household size, income floor with the
optional guarantor) always win over any score or model suggestion, and every draft is an
unsent proposal that a human must sign off. The whole thing runs offline with Node 20
built-ins only.

## Scope

- Strict TypeScript (ES2022, `module`/`moduleResolution` NodeNext) domain model: listings,
  applicants, matching, eligibility, drafts.
- Deterministic rules-first matcher with documented, exported weights and explicit
  tie-breakers; hard gates always beat any score.
- A pluggable `ApplicantModel` interface (the AI seam) with a deterministic offline stub and
  an exported confidence threshold. The model may only contribute when the rules are unsure
  and can never flip a hard ineligibility.
- A hand-written minimal MCP stdio JSON-RPC 2.0 server (`initialize`, `tools/list`,
  `tools/call`) with a pure request processor and pure tool handlers that tests call directly.
- A skill that tells an agent how to use the MCP tools rules-first.
- A small Swedish eval on the synthetic set: eligibility accuracy and top-1 ranking accuracy.

### Non-goals

- No real applicant, listing or tenancy data; synthetic Swedish examples only.
- No network, no npm packages, no API keys, no real model calls.
- No claim of Swedish tenancy-law or fair-allocation correctness; the scoring is a
  documented heuristic, not policy or legal advice.
- No database, persistence or UI. No CLI.
- No extra docs beyond this README.

## Architecture

- `src/domain.ts` — strict types (`Listing`, `Applicant`, `MatchResult`, `EligibilityResult`,
  `DraftResult`, `DraftKind`, `MatchSource`) and a typed `DraftError`.
- `src/rules.ts` — pure eligibility gates, scoring (0-100), missing-details detection and the
  listing-local ranking comparator. All weights and tie-breaker constants are exported.
- `src/model.ts` — the `ApplicantModel` interface, the exported confidence threshold and the
  deterministic offline stub, plus the no-override guard around `applyModelAssist`.
- `src/draft.ts` — pure Swedish reply templates (`invite` / `reject` / `more_info`), always
  returned as frozen, unsent drafts; unknown ids throw a typed `DraftError`.
- `src/data/listings.ts`, `src/data/applicants.ts` — synthetic Swedish records imported by
  tests. Tests never read files from disk.
- `src/mcp/handlers.ts` — pure JSON-RPC tool handlers plus an exported pure `processRequest`.
  `src/mcp/server.ts` — a thin stdio loop over `node:readline` and `node:process`.
- `src/evalSet.ts` — hand-checked expected eligibility labels and ranking order per listing.
- `src/eval.ts` — runs the real rules-plus-stub pipeline and computes the metrics.

## Data model

- `Listing`: id, synthetic address, areaKvm, rooms, floor, monthlyRentSek, availableFrom
  (ISO date), householdSizeMax, incomeRequirementSek (household, monthly), guarantorAllowed.
- `Applicant`: id, synthetic displayName, householdAdults, householdChildren, monthlyIncomeSek,
  employmentStatus (`anstalld` | `student` | `pensionar` | `other`), queuePoints, hasGuarantor,
  contactEmail, contactPhone, contactComplete, note.
- Contact fields are explicit: `contactEmail` and `contactPhone` may be empty strings;
  `missingDetails` reports a Swedish label for each empty required contact field.
- `MatchResult`: listingId, applicantId, eligible, score (0-100), reasonsSv[], blockersSv[]
  (hard fails), missingFieldsSv[], source (`rules` | `model-assisted`), needsHumanReview.
- Hard gates: household size <= householdSizeMax; household income >= incomeRequirementSek, or
  `hasGuarantor && guarantorAllowed`. Score is the queue-point share against the listing pool,
  capped at 100, minus a documented deduction per missing contact field, with deterministic
  tie-breakers (income headroom, then applicant id). Multi-listing tie-breaker scenarios are
  out of scope.

## MCP tools

Hand-written stdio JSON-RPC 2.0 server. Methods: `initialize`, `tools/list`, `tools/call`,
with proper envelopes, id echo and error codes for parse (-32700), invalid request (-32600),
unknown method (-32601) and invalid params (-32602).

1. `match_applicant` — `{ listingId, applicantId }` → `{ result: MatchResult }`. Unknown ids
   yield a JSON-RPC param error.
2. `check_eligibility` — `{ listingId, applicantId }` → `{ eligible, blockersSv, missingFieldsSv }`.
3. `draft_reply` — `{ listingId, applicantId, kind }` with `kind` in `invite` | `reject` |
   `more_info` → `{ draftSv, requiresSignOff: true, disclaimerSv }`. The tool never sends
   anything; unknown ids surface a typed `DraftError` as a param error.
4. `rank_list` — `{ listingId }` → `{ ranked: [{ applicantId, score, eligible,
   needsHumanReview }], order: "score_desc" }`.

`src/mcp/handlers.ts` exports a pure `processRequest(method, params)` with no readline or
process side effects on import, so tests can script a full session in memory; only
`src/mcp/server.ts` touches stdio.

## Skill

`skills/uthyrning-match/SKILL.md` has frontmatter (`name` + `description`) and instructs an
agent to run `check_eligibility` first, keep hard rules ahead of any score, never draft for an
ineligible pair without stating the blockers, present every `draft_reply` result as an unsent
draft that needs human sign-off, never invent applicant facts (request missing details with a
`more_info` draft instead) and escalate every `needsHumanReview` case to a human before acting.
It never names a real organization and speaks only of a property manager.

## Eval

`src/evalSet.ts` fixes, for every synthetic listing, the expected eligibility label per
applicant and the expected ranking order, derived once from the documented rules and checked
by hand. A drift test re-derives both through the real pipeline so a mismatch between the
snapshot and the rules fails loudly instead of hiding. `src/eval.ts` runs the real
rules-plus-stub pipeline and computes eligibility accuracy and top-1 ranking accuracy;
full-order agreement is tracked as an optional extra. `test/eval.test.ts` asserts the metrics
at named threshold constants (1.0 on the small deterministic synthetic set) and adds guard
tests: the model step only activates below the exported confidence threshold, and it can never
flip a hard ineligibility or change a blocker, score or eligibility flag.

## Honest limits

- Synthetic data at small scale; the ranking is a documented heuristic, not a vetted
  allocation policy. The metric set is tiny and deterministic, not a benchmark.
- Real queue points come from external queues; here they are fixed per synthetic record.
- The model is a deterministic offline stub: it proves the seam, not model quality.
- No audit store yet in the MCP server; a later version would log human sign-off per call.
- Swedish drafts only. No CLI. No persistence or UI.

## Later with the real stack

A Next.js internal view for coordinators, Supabase-backed listings and applications, a
Cloudflare-hosted typed API facade with auth, a real model behind the same `ApplicantModel`
interface plus a trace/eval harness, property-system integration for queue points, and a
per-decision audit log of human sign-off.

## Build, typecheck and test (offline)

Node 20 built-ins only (`node:test`, `node:assert/strict`, `node:readline`, `node:process`);
no npm packages, no network. Every relative import ends in `.js`.

```
tsc -p tsconfig.json
node --test build/test/*.test.js
```

Tests are `test/*.test.ts` and never read files from disk — synthetic data lives in
`src/data/*.ts` and is imported directly.

## Status (generated)
- First prototype scaffold built 2026-10-18 for a job application. **Local only, not published.**
- Tasks: T1 passed, T2 passed, T3 passed, T4 passed
- `npm test`: 82 pass, 0 fail (tsc --strict + node --test).
- Written by free OpenCode models (deepseek-v4.1-flash-free, glm-5.3-flash-free, space-bunny-free) task by task; every task had to compile and pass its tests before it was committed; reviewed by another free model (docs/REVIEW.md).
- Synthetic data only; any LLM step is an offline stub.

## Web status (generated)
- Next.js 16 App Router + React 19 front end in `web/`, added 2026-10-19. **Local only, not published.**
- Gates: `npm test` (tsc --strict + node --test: 82 pass), `npm run typecheck:web` (strict), `npm run test:web` (Vitest + RTL: 40 pass), `npm run build:web` (ok).
- Domain module is swappable (`DEMO_DOMAIN=rental|fault-report`), see ARCHITECTURE.md.
- Written task by task by free OpenCode models (beam-free, deepseek-v4.1-flash-free); every step had to pass all gates before its commit; reviewed by another free model (docs/WEB_REVIEW.md).
