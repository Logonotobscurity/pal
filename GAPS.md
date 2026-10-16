# PAL — Open Gaps

**Last reviewed:** 2026-10-16  
**Source of truth for what exists:** `docs/PAL_IMPLEMENTATION_STATUS.md`  
**Architecture target:** `docs/PAL_ARCHITECTURE.md`

This file tracks remaining gaps so documentation and code stay aligned. Update it when a gap is closed or a new one appears.

---

## P1 — High priority (blocks fuller challenge readiness)

| Gap | Location / notes | Status |
|-----|------------------|--------|
| Real executors (WhatsApp, email, SMS, etc.) | Webhook paths scaffolded; native Supabase `outbound_messages` executor added for `message.send` | Partial |
| Command / voice frontend fully connected | Mic button + live demo endpoint + transcript listener component added | Partial |
| Benchmark run artifacts | Sample run recorder added; no completed measured results published | Partial |
| Observability (structured logs + error tracking) | Structured logger used by ExecutionService; no external sink yet | Partial |
| Supabase Realtime broadcast for live transcripts | Broadcast helper + VoiceDbService wiring + client listener + migration | Partial |

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
| Real LLM key path | Documented in `docs/REAL_LLM_AND_EXECUTION.md` |
| Benchmark status consistency | Keep aligned with implementation status |

## Guidance

- Prefer one issue-sized task per change (see `AGENTS.md`).
- Do not implement the Research plane or React Flow workspace without an explicit task.
- When a gap listed here is closed, update both this file and `docs/PAL_IMPLEMENTATION_STATUS.md` in the same PR.
