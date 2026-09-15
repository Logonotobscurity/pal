# wwhisper — PAL

**PAL — Meaning-to-Action Intelligence.** Voice-first agentic layer that
converts African code-switched speech into structured business meaning and
safe, reviewable workflows.

> Speak naturally. PAL understands the meaning, builds the work, and asks
> before it acts.

Built for the Sahara CodeSwitch Africa challenge.

## Source of truth

- `AGENTS.md` — permanent engineering rules
- `docs/PAL_ARCHITECTURE.md` — architecture specification (v2.0)
- `docs/PAL_DOMAIN_MODEL.md`, `docs/PAL_EXECUTION_PLAN.md`,
  `docs/PAL_BENCHMARK.md`, `docs/PAL_SECURITY.md`

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
Zod · Vitest · ESLint. Supabase arrives with the tenancy task; Sahara with
the voice task.

## Commands

```bash
npm install        # install dependencies
npm run dev        # develop
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest run
```

## Safety invariant

Agents propose. Policy decides. Owner approves. Executor acts. Verifier
confirms. No LLM may directly execute an external side effect.
