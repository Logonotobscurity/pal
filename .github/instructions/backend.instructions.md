---
applyTo: '**/src/**'
---

# Backend instructions

- Validate all external input at the boundary; internal layers trust typed domain objects only.
- Changes to schemas or state machines require updating `docs/PAL_DOMAIN_MODEL.md` in the same change.
- Obey `docs/PAL_SECURITY.md` without exception.
- New behavior ships with tests; bug fixes ship with a regression test.
