# Tasks

## T1 Domain model, synthetic data, matching rules
Design strict TS domain types, synthetic Swedish listings and applicants in src/data, and pure eligibility plus scoring logic with full node:test coverage.

Files: tsconfig.json, src/domain.ts, src/rules.ts, src/data/listings.ts, src/data/applicants.ts, test/domain.test.ts, test/rules.test.ts

Acceptance:
- root tsconfig.json sets strict, ES2022, module and moduleResolution NodeNext, outDir build; `tsc -p tsconfig.json` passes and every relative import ends in .js
- tests are compiled and run as `node --test build/test/*.test.js` (Node 22 strip-types acceptable if available); tests never read files from disk
- src/data modules export at least 3 listings and 8 applicants with only synthetic Swedish names and addresses; no real organization is named and the [EMPLOYER] token never appears in code or docs
- hard gates (householdSizeMax, income floor with the guarantor rule) return eligible=false with Swedish blockers before any scoring is applied
- Applicant exposes contactEmail and contactPhone; missingDetails returns missingFieldsSv for each empty required contact field
- scoreApplicant returns 0-100 with deterministic Swedish reasons and identical output for identical input; all weights and tie-breaker constants are exported from src/rules.ts; advanced multi-listing tie-breaker scenarios are explicitly out of scope
- tsc and node --test pass

## T2 Pluggable model step and Swedish drafts
Add the ApplicantModel interface with an exported confidence threshold gate and deterministic offline stub, plus pure template-based Swedish draft generation with no-override guards and typed errors.

Files: src/model.ts, src/draft.ts, test/model.test.ts, test/draft.test.ts

Acceptance:
- ApplicantModel is a plain TypeScript interface; the confidence threshold is an exported constant and the model step is invoked only when rules confidence is below it; a guard test proves no model output can flip a hard-ineligible pair or alter hard blockers
- the offline stub is deterministic: same input yields identical output across repeated and reordered calls, with no randomness, timers or network
- drafts for kinds invite, reject and more_info reference only listing and applicant fields from the provided records; unknown ids raise a typed DraftError, and tests assert it via instanceof
- every draft result sets requiresSignOff=true and includes a disclaimerSv stating it is an unsent draft
- compiled with tsc; node --test build/test/*.test.js passes

## T3 Hand-written MCP stdio JSON-RPC server
Implement a minimal stdio JSON-RPC 2.0 server with a pure exported request processor and pure handlers for match_applicant, check_eligibility, draft_reply and rank_list, tested directly and via a scripted in-memory session.

Files: src/mcp/handlers.ts, src/mcp/server.ts, test/mcp.handlers.test.ts, test/mcp.server.test.ts

Acceptance:
- handlers.ts exports a pure tool-handler and a pure processRequest(method, params) with NO readline/process side effects on import; handler tests call it directly without spawning a process
- tools/list returns all four tools with input descriptions; tools/call dispatches to the same logic as the direct handlers, asserted by comparing outputs
- JSON-RPC compliance asserted: id and version echo, correct error codes for parse error (-32700), invalid request (-32600), unknown method (-32601) and invalid params (-32602); unknown ids in draft_reply surface the typed DraftError as a param error
- server.ts is a thin stdio loop using only node:readline and node:process, no npm packages; the scripted initialize, tools/list, tools/call sequence runs in memory through processRequest
- every relative import (including src/mcp and tests) ends in .js; tsc and node --test build/test/*.test.js pass

## T4 Skill, eval set, README
Write the skill with rules-first escalation instructions, build the Swedish eval set cross-checked against the documented rules, and finish the README with honest limits.

Files: skills/uthyrning-match/SKILL.md, src/evalSet.ts, src/eval.ts, test/eval.test.ts, README.md

Acceptance:
- SKILL.md has frontmatter name and description and instructs: check_eligibility first, escalate needsHumanReview cases to a human, treat drafts as unsent, never invent applicant facts; no real organization is named and the [EMPLOYER] token never appears
- evalSet.ts holds hand-checked expected eligibility labels and expected ranking order for every synthetic listing; a test re-derives the labels through the real rules pipeline so drift between the snapshot and the documented rules fails loudly
- eval.ts computes eligibility accuracy and top-1 ranking accuracy by running the real rules-plus-stub pipeline; full-order agreement is optional and deferred, dropped if time is short
- test/eval.test.ts asserts the metrics at named threshold constants (1.0 on the small deterministic synthetic set) plus the guard that the model step only activates below the exported threshold and never flips hard ineligibility
- README.md documents goal, scope, architecture, data model, MCP tools, skill, eval, honest limits and the later-with-real-stack section; no CLI and no extra docs beyond README.md; tsc and node --test build/test/*.test.js pass
