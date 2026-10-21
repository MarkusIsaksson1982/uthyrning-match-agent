# Automated code review (beam-free, free model)

- [must] package.json: Extra root file and npm metadata; spec permits only tsconfig.json and README.md at root. → Remove package.json and invoke tsc and node directly as specified.
- [must] docs/SPEC.md: Extra documentation beyond README.md violates the stated non-goal. → Remove docs/ or move required content into README.md only.
- [nit] README.md: README says extra docs are allowed under docs/, contradicting no-extra-docs non-goal. → State that README.md is the only documentation file.

## Honest limits
- Synthetic data only; ranking is heuristic, not policy.
- Queue points are fixed per record, not live.
- Offline stub proves seam, not model quality.
- No audit store or persistence in MCP server.

Must-fix round: applied by deepseek-v4.1-flash-free
