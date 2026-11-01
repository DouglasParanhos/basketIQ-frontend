# Principles

- Don't assume. Don't hide confusion. Surface tradeoffs.
- Minimum code that solves the problem. Nothing speculative.
- Touch only what you must. Clean up only your own mess.
- Define success criteria. Loop until verified.
- Be matter-of-fact. No flattery, no filler.
- I'm sometimes wrong. Challenge my assumptions.

Containers and Docker: use Docker Desktop on the Windows host (PowerShell or Git Bash). WSL is not used on this machine (it has no bash), so run commands inside containers or directly with Node and pnpm; do not assume WSL or Linux paths.

# Commits

- Before any commit, run `/simplify` in the repository the commit is for (Backend and Frontend are separate repositories). No exceptions, including small changes.
- Apply the fixes it finds, re-run the repository's checks, and only then commit.