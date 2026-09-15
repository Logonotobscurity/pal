---
applyTo: '**/migrations/**'
---

# Database instructions

- Schema changes only via migrations; never edit applied migrations.
- Every migration must have a tested down path (or be explicitly marked irreversible with rationale).
- Keep `docs/PAL_DOMAIN_MODEL.md` in sync with schema changes in the same change.
