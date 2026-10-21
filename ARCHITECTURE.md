# Architecture

This is a small Next.js App Router demo for a property manager.

## Runtime model

- Server-rendered dashboard and case detail pages.
- Domain logic is isolated behind `DomainModule`.
- Rental data uses the existing `src/` rules, model and draft modules.
- Fault-report data is a synthetic stub for demonstrating the seam.

## Domain seam

- `getDomainModule(env)` reads `DEMO_DOMAIN`.
- Pages and read APIs are force-dynamic so the domain can change at runtime.
- UI components import only generic domain types.

## Review workflow

- Reviews are stored in an in-memory `globalThis` singleton.
- The store resets on process restart and is not multi-user safe.
- Review records are local demo state only.

## Decision limits

- Rental matching is a heuristic, not tenancy-law policy.
- The model can add reasons and mark model-assisted results only.
- Hard rules are never overridden by the model.
- Drafts are always unsent and require handler sign-off.
- Disclaimer and sign-off requirements are fixed.

## Data limits

- All rental and fault-report data is synthetic demo data.
- No external services, databases or network calls are used.
- No autonomous sending or external actions occur.

## Verification

- `tsc -p .`
- `npm test`
- `npm run typecheck:web`
- `npm run test:web`
- `npm run build:web`
