# Automated review of the web front end (beam-free, free model)

- [should] ARCHITECTURE.md: Architecture and README amendments are not in the provided snapshot, so documented limits and commands cannot be verified. → Include ARCHITECTURE.md and README.md in review evidence before judging doc honesty.
- [should] web/components/ReviewControls.tsx: Props expose many aliases and runtime resolution, obscuring the intended review contract. → Reduce props to caseId, decision and currentReview, removing alias fallbacks.
- [nit] web/components/ReviewControls.tsx: Recommendation options render raw enum values instead of Swedish labels. → Map each recommendation to its Swedish label in option text.
- [nit] web/components/DraftProposal.tsx: Overlapping optional props and DraftLike loosen the component around Decision. → Accept only decision and render its fixed draft fields.
- [nit] web/components/DecisionTable.tsx: Subtitle sits outside the detail anchor, so only the title is clickable. → Include subtitle in the anchor or add an accessible full-row link.
- [should] web/test/*: Test files are not in the snapshot, so meaningfulness and coverage cannot be verified. → Inspect tests separately or require meaningful assertions in CI.

## Strengths
- UI imports only generic domain types and getDomainModule.
- Async params, force-dynamic routes and typed 404 handling are correct.
- Shared validateReviewInput is used by route, action and store.
- Rental adapter passes MatchResult.source through instead of hard-coding.
- Drafts stay unsent with fixed sign-off and disclaimer.

## Honest limits
- In-memory review store resets on restart and is demo-only.
- Fault-report module is synthetic and does not prove real triage.
- Tests and docs were not included in the provided snapshot.

Must-fix round: none needed
