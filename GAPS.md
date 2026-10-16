# PAL — Open Gaps

**Last reviewed:** 2026-10-16  
**Source of truth for what exists:** `docs/PAL_IMPLEMENTATION_STATUS.md`  
**Architecture target:** `docs/PAL_ARCHITECTURE.md`

This file tracks remaining gaps so documentation and code stay aligned. Update it when a gap is closed or a new one appears.

---

## P1 — High priority (blocks fuller challenge readiness)

| Gap | Location / notes | Status |
|-----|------------------|--------|
| Real executors (WhatsApp, email, SMS, etc.) | `src/services/execution/executors/` — messaging webhook for `message.send` when `MESSAGING_WEBHOOK_URL` is set; email webhook when `channel=email` + `EMAIL_WEBHOOK_URL` is set; other capabilities still mock | Partial |
| Command / voice frontend fully connected | `/command` public demo now calls `/api/demo/pipeline` for live semantic+workflow (PR #6); mic UI still not fully wired | Partial |
| Benchmark run artifacts | Harness in `scripts/benchmark/`; sample run recorder added (PR #6); no completed measured results published | Partial |
| Observability (structured logs + error tracking) | Not present | Open |
| Supabase Realtime broadcast for live transcripts | Architecture §8 | Open |

## Later / architecture targets

| Gap | Notes |
|-----|-------|
| Research intelligence plane | No search / claim / evidence graph agents |
| React Flow workspace UI | Schema exists; no visual editor |
| Activity / audit feed UI | Deferred |
| `agents/` top-level package layout | Logic lives under `services/` + `providers/` |

## Documentation / hygiene (quick)

| Item | Status |
|------|--------|
| LICENSE file | Added (MIT) |
| README license placeholder | Updated |
| Benchmark status consistency | README already notes pending results; keep aligned with implementation status |

## Guidance

- Prefer one issue-sized task per change (see `AGENTS.md`).
- Do not implement the Research plane or React Flow workspace without an explicit task.
- When a gap listed here is closed, update both this file and `docs/PAL_IMPLEMENTATION_STATUS.md` in the same PR.
