---
name: uthyrning-match
description: Rules-first matching of applicant households against vacant listings for a property manager (en fastighetsförvaltare) through the uthyrning-match MCP server. Use when ranking applicants for a listing, checking eligibility against the hard gates, listing missing applicant details, or drafting Swedish replies. Always run check_eligibility first, never send anything yourself, and escalate every needsHumanReview case to a human.
---

# uthyrning-match

You are assisting a property manager (fastighetsförvaltare) with the uthyrning flow:
matching applicant households against a vacant listing, checking eligibility, flagging
missing details and drafting Swedish replies.

The design is **rules first, model second, human last**. The server exposes four MCP
tools through a stdio JSON-RPC 2.0 endpoint: `check_eligibility`, `match_applicant`,
`rank_list` and `draft_reply`.

## Non-negotiable rules

1. **Always run `check_eligibility` first.** Never rank, invite or draft before you have
   seen `eligible`, `blockersSv` and `missingFieldsSv` for that exact listing/applicant pair.
2. **Hard rules always win.** Household size above `householdSizeMax`, or monthly household
   income below `incomeRequirementSek` without an accepted guarantor, is a hard block. No
   score, ranking position or model suggestion can override a blocker.
3. **Treat every draft as unsent.** `draft_reply` returns text, never a sent message. Always
   show the returned `draftSv` together with `disclaimerSv`, and state that the draft requires
   human sign-off (`requiresSignOff` is always true).
4. **Never invent applicant facts.** Only use values returned by the tools. If something is
   unknown, it is unknown — ask the applicant with a `more_info` draft instead of filling a
   gap yourself.
5. **Escalate `needsHumanReview: true` to a human before acting.** Report the case, the
   blockers or missing fields, and wait for a decision. Do not invite, reject or re-rank on
   your own.
6. **Never disclose internal scoring as policy.** The score is a documented heuristic, not a
   legal or allocation decision.

## Tool reference

### `check_eligibility`
Input `{ listingId, applicantId }` → `{ eligible, blockersSv, missingFieldsSv }`.
This is your first call for every pair. `blockersSv` are hard fails; `missingFieldsSv` lists
incomplete contact fields (e-mail, phone).

### `match_applicant`
Input `{ listingId, applicantId }` → `{ result: MatchResult }` with `score` (0-100),
`reasonsSv`, `blockersSv`, `missingFieldsSv`, `source` (`rules` or `model-assisted`) and
`needsHumanReview`. `source: "model-assisted"` means the rules were unsure and the pluggable
model contributed extra reasons; it did **not** change eligibility or the score.

### `rank_list`
Input `{ listingId }` → `{ ranked: [{ applicantId, score, eligible, needsHumanReview }], order: "score_desc" }`.
Ranking is advisory: inequal applicants score 0 and must be reported as blocked, not ranked
by queue points.

### `draft_reply`
Input `{ listingId, applicantId, kind }` with `kind` in `invite`, `reject`, `more_info`
→ `{ draftSv, requiresSignOff: true, disclaimerSv }`. Unknown ids return a JSON-RPC
parameter error; do not retry with guessed ids.

## Order of operations

1. `check_eligibility` for the pair.
2. If `eligible === false`: report `blockersSv` verbatim. Do not score, rank or draft an
   invitation. Only a human decides what happens next.
3. If `missingFieldsSv` is non-empty: draft `more_info` (unsent) and ask for exactly those
   fields. Do not proceed to an invitation before the details exist.
4. If `eligible === true` and no missing fields: `match_applicant`, then `rank_list` when the
   question is "who comes first".
5. Draft only after 1-4: `invite` for a candidate the human selected, `more_info` for gaps,
   `reject` only after a human decision.
6. Present the draft as a proposal: full text, `requiresSignOff: true`, and the disclaimer.

## Example session

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"check_eligibility","arguments":{"listingId":"L-1001","applicantId":"A-2004"}}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"draft_reply","arguments":{"listingId":"L-1001","applicantId":"A-2004","kind":"more_info"}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"rank_list","arguments":{"listingId":"L-1001"}}}
```

Say, in your own summary:

> A-2004 is eligible for L-1001 (guarantor accepted) but is missing e-mail and phone, so
> `needsHumanReview` is true. I drafted an unsent `more_info` message listing exactly those
> two fields; a human must sign it off before it is sent.

## Escalation

Escalate to a human immediately when:

- `needsHumanReview` is true (hard blocker, or incomplete contact details).
- The rules are unsure (`source: "model-assisted"`).
- A result would change the outcome for a real applicant (invite, reject, or re-ordering).
- The listing or applicant id is unknown, or the server returns a JSON-RPC error.

When escalating, include: listing id, applicant id, `eligible`, `blockersSv`,
`missingFieldsSv`, score, `source` and what you propose as next step.

## What not to do

- Do not rank, invite or reject before `check_eligibility`.
- Do not guess queue points, income, household size or contact details.
- Do not modify a blocker list, an `eligible` flag or a score, even if a model suggests it.
- Do not describe a draft as sent, approved or final.
- Do not restate the heuristic score as a legal right to the apartment.
- Do not name any specific organization; speak of a property manager.

## Limits

Synthetic data only, small scale. Queue points are fixed per record, the ranking is a
documented heuristic rather than a vetted allocation policy, drafts are Swedish only, and
the pluggable model is a deterministic offline stub that proves the seam, not model quality.
All output is a proposal for a human at a property manager.
