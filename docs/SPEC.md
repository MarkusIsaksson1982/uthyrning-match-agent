# uthyrning-match-agent — applicant-matching agent for the uthyrning flow (MCP + skills)

README-ready spec for an offline, rules-first portfolio demo, built tonight task by task. Each task must compile and pass its own tests before the next starts.

## Goal
A demo of an AI-first rental workflow: an MCP server an agent can use to rank applicant households against a vacant listing at a fastighetsförvaltare (a property manager), check eligibility, flag missing details and draft Swedish replies — deterministic guards first, a pluggable LLM step second, human sign-off for anything uncertain. All data is synthetic; no real tenants, listings or organizations appear anywhere.

## Scope
- Strict TypeScript (ES2022, module NodeNext) domain model: listings, applicants, matching, eligibility.
- Deterministic rules-first matcher with documented, exported weights; hard rules (household size, income floor with optional guarantor) always win over any score.
- Pluggable `ApplicantModel` interface (the LLM step) with a deterministic offline stub; the model may only contribute when rules are unsure and can never flip a hard ineligibility. The confidence threshold is an exported constant.
- Hand-written minimal MCP stdio JSON-RPC 2.0 server (initialize, tools/list, tools/call) with a pure request processor and pure tool handlers tests can call directly.
- `skills/uthyrning-match/SKILL.md` with frontmatter telling an agent to stay rules-first, treat drafts as unsent, and escalate uncertain cases to a human.
- A small Swedish eval on the synthetic set: eligibility accuracy and top-1 ranking agreement.

## Non-goals
- No real applicant, listing or tenancy data; synthetic Swedish examples only.
- No network, no npm packages, no API keys, no real LLM calls.
- No claim of Swedish tenancy-law or fair-allocation correctness; scoring heuristics are documented, not policy or legal advice.
- No database, persistence or UI. No CLI (cut for this scaffold).
- No extra docs beyond README.md.

## Build, typecheck and test (offline scaffold)
- Exactly one root config file is permitted: `tsconfig.json` (README.md is the only other root file). All modules live under src/, test/, skills/ or docs/.
- `tsconfig.json`: `strict: true`, `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `rootDir: "."`, `outDir: "build"`, `include: ["src","test"]` so tests compile too. Every relative import — including tests and MCP files — MUST end in `.js` (e.g. `import { x } from "../src/triage.js"`).
- Node 20 cannot execute `.ts` tests directly. Default flow: build with `tsc -p tsconfig.json`, then run `node --test build/test/*.test.js`. (If the host runs Node 22+, type-stripping is an acceptable alternative, but the compiled-JS path is the required default and must be what the task claims to pass.)
- Node 20 built-ins only (node:test, node:assert/strict, node:readline, node:process). NO npm packages, NO network, NO real APIs/keys. `tsc` is the only assumed tool.
- Tests are `test/*.test.ts` using node:test; tests NEVER read files from disk. Synthetic data lives in `src/data/*.ts` modules imported by tests.
- No real organization is ever named in code or docs; say `fastighetsförvaltare` / a property manager. The employer is redacted as a property manager and that token is never written into code or docs.

## Architecture
- `src/domain.ts` — strict types (Listing, Applicant, MatchResult, EligibilityResult, DraftResult) and a typed `DraftError`.
- `src/rules.ts` — pure eligibility gates, scoring (0-100) and missing-details detection; ALL weights and tie-breaker constants exported.
- `src/model.ts` — `ApplicantModel` interface, an exported confidence threshold constant, and a deterministic offline stub.
- `src/draft.ts` — pure Swedish reply templates (invite / reject / more_info), always returned as unsent drafts; unknown ids throw a typed `DraftError`.
- `src/data/listings.ts`, `src/data/applicants.ts` — synthetic Swedish records imported by tests (tests never read disk).
- `src/mcp/handlers.ts` — pure JSON-RPC tool handlers plus an exported pure `processRequest` (no readline/process side effects on import). `src/mcp/server.ts` — thin stdio loop wiring `processRequest` to node:readline + node:process, zero deps.
- `src/evalSet.ts` (hand-checked expected results per listing) + `src/eval.ts` (metrics).

## Data model
- `Listing`: id, synthetic address, areaKvm, rooms, floor, monthlyRentSek, availableFrom (ISO date), householdSizeMax, incomeRequirementSek (household, monthly), guarantorAllowed.
- `Applicant`: id, synthetic displayName, householdAdults, householdChildren, monthlyIncomeSek, employmentStatus (anstalld | student | pensionar | other), queuePoints, hasGuarantor, contactEmail, contactPhone, contactComplete, note.
- Contact fields are explicit: `contactEmail` and `contactPhone` may be empty strings; `contactComplete` is a derived/recorded flag. `missingDetails` reports `missingFieldsSv` for each empty required contact field (`contactEmail`, `contactPhone`).
- `MatchResult`: listingId, applicantId, eligible, score (0-100), reasonsSv[], blockersSv[] (hard fails), missingFieldsSv[], source (rules | model-assisted), needsHumanReview.
- Hard gates: household size <= householdSizeMax; household income >= incomeRequirementSek, or hasGuarantor && guarantorAllowed. Score: queuePoints share against the listing pool, capped at 100, documented deductions for missing contact details, explicit deterministic tie-breakers (income headroom, then applicant id). Advanced multi-listing tie-breaker scenarios are out of scope for this scaffold.

## MCP tools
1. `match_applicant` — input `{ listingId, applicantId }` → `{ result: MatchResult }`. Unknown ids yield a JSON-RPC param error.
2. `check_eligibility` — input `{ listingId, applicantId }` → `{ eligible, blockersSv, missingFieldsSv }`.
3. `draft_reply` — input `{ listingId, applicantId, kind }` with kind in (`invite` | `reject` | `more_info`) → `{ draftSv, requiresSignOff: true, disclaimerSv }`. Templates use only provided records; the tool never sends anything; unknown ids throw/return a typed `DraftError` surfaced as a param error.
4. `rank_list` — input `{ listingId }` → `{ ranked: [{ applicantId, score, eligible, needsHumanReview }], order: score_desc }`.

Server methods: initialize, tools/list, tools/call; proper JSON-RPC 2.0 envelope, id echo, and error codes for parse (-32700), invalid request (-32600), unknown method (-32601) and invalid params (-32602). `src/mcp/handlers.ts` exports a pure `processRequest(method, params)` with NO readline/process side effects at import time so scripted in-memory tests can call it directly; only `server.ts` touches stdio.

## Skill
`skills/uthyrning-match/SKILL.md` — frontmatter `name` + `description`, then instructions for an agent: run check_eligibility before ranking or drafting; never draft for an ineligible pair without stating the blockers; present draft_reply output as an unsent draft requiring human sign-off; never invent applicant facts — request missing details via more_info; escalate every needsHumanReview case to a human before acting.

## Eval
`src/evalSet.ts` fixes, for each synthetic listing, expected eligibility per applicant and the expected ranking order, derived once from the documented rules and checked by hand. A separate assertion re-derives labels through the real pipeline so drift between the snapshot and the rules fails loudly instead of hiding. `src/eval.ts` computes eligibility accuracy and top-1 ranking accuracy by running the real rules+stub pipeline; full-order agreement is a deferred/optional extra, dropped if time is short. node:test asserts the metrics at named threshold constants (1.0 on the small deterministic set) plus guard assertions: the stub runs only below the exported confidence threshold and never flips a hard blocker.

## Honest limits
- Synthetic data at small scale; the ranking is a documented heuristic, not a vetted allocation policy; the metric set is tiny and deterministic, not a benchmark.
- Real queue points come from external queues; here they are fixed per synthetic record.
- The stub is deterministic on purpose: it proves the seam, not model quality.
- No audit store yet in the MCP server (a later version logs human sign-off decisions per call).
- No multi-language drafts; Swedish only. No CLI.

## Later with the real stack
Next.js internal view for coordinators, Supabase-backed listings and applications, a Cloudflare-hosted typed API facade with auth, a real LLM behind the same `ApplicantModel` interface plus a trace/eval harness, property-system integration for queue points, and a per-decision audit log of human sign-off.

## Build constraints (recap for scaffold builders)
A single root `tsconfig.json` is permitted (strict, ES2022, module + moduleResolution NodeNext, outDir build); every relative import ends in .js. Build with `tsc -p tsconfig.json`, run tests with `node --test build/test/*.test.js` (Node 22 type-stripping acceptable if available). Node 20 built-ins only; no npm, no network. Files only under src/, test/, skills/, docs/, plus README.md and tsconfig.json at root. Tests use test/*.test.ts and never read files from disk — synthetic data lives in src/data/*.ts. No real organization is ever named in code or docs; say fastighetsförvaltare, and never write the a property manager token into code or docs.
