# AGENTS.md — wwhisper (PAL)

Persistent instructions for all coding agents (Codex, Copilot, Claude, ZCode, etc.) working in this repository.

## Project

wwhisper implements **PAL** (see `docs/PAL_ARCHITECTURE.md` — the source of truth for design).

## Read first

Before implementing anything:

1. `docs/PAL_ARCHITECTURE.md` — system design and boundaries
2. `docs/PAL_DOMAIN_MODEL.md` — schemas, state machines, invariants
3. `docs/PAL_EXECUTION_PLAN.md` — current phase and task breakdown
4. `docs/PAL_AGENT_ASSISTANCE.md` — verification gate, environment limits, working agreement

If docs and code disagree, flag it and fix the doc or the code — never silently work around it.

## Working rules

- **Tasks are issue-sized.** Pick one task from `PAL_EXECUTION_PLAN.md`, implement it fully, stop. Don't batch phases.
- **Follow the architecture.** If a change requires deviating from `PAL_ARCHITECTURE.md`, stop and propose the doc change first.
- **Domain changes go through the domain model.** New fields, states, or transitions must be added to `PAL_DOMAIN_MODEL.md` in the same change.
- **Security rules are hard constraints.** See `docs/PAL_SECURITY.md`. No exceptions for convenience or tests without explicit approval.
- **Path-specific rules**: follow additional instructions in `.github/instructions/` applicable to the files you touch.

## Code standards

- Keep changes minimal and reviewable; no drive-by refactors.
- New behavior gets tests; bug fixes get a regression test.
- Run the full test suite before declaring done; report failures honestly.
- Match existing style; do not introduce new dependencies without stating why.

## Definition of done (per task)

- [ ] Implementation matches `PAL_DOMAIN_MODEL.md`
- [ ] Tests added/updated and passing
- [ ] Relevant doc updated in the same change
- [ ] No security-rule violations (`PAL_SECURITY.md`)
