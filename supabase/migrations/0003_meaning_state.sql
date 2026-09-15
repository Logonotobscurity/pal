-- 0003_meaning_state.sql
-- PAL Semantic Agent: MeaningState persistence
--
-- Implements PAL_ARCHITECTURE.md §12, §19: SpeechEvent → MeaningState transformation
--
-- Security: all tables are workspace-scoped and RLS-protected.

-- ---------------------------------------------------------------------------
-- meaning_states — structured semantic representation of speech
-- ---------------------------------------------------------------------------
create table public.meaning_states (
  id uuid primary key default gen_random_uuid(),
  meaning_id text not null unique check (length(trim(meaning_id)) between 1 and 255),
  speech_event_id text not null check (length(trim(speech_event_id)) between 1 and 255),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  
  -- intent
  intent_type text not null check (intent_type in ('payment_reminder', 'send_message', 'customer_lookup', 'invoice_status', 'other')),
  intent_summary text not null check (length(trim(intent_summary)) between 1 and 500),
  intent_confidence numeric not null check (intent_confidence >= 0 and intent_confidence <= 1),
  
  -- extracted structured data
  entities jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '[]'::jsonb,
  temporal_relations jsonb not null default '[]'::jsonb,
  ambiguities jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  
  -- confidence tracking
  overall_confidence numeric not null check (overall_confidence >= 0 and overall_confidence <= 1),
  field_confidence jsonb not null default '{}'::jsonb,
  
  -- context sufficiency
  context_sufficiency text not null check (context_sufficiency in ('sufficient', 'insufficient', 'conflicting')),
  
  -- model metadata
  model_provider text not null check (length(trim(model_provider)) between 1 and 100),
  model_name text not null check (length(trim(model_name)) between 1 and 100),
  model_version text not null check (length(trim(model_version)) between 1 and 50),
  
  created_at timestamptz not null default now()
);

create index meaning_states_workspace_id_idx on public.meaning_states (workspace_id);
create index meaning_states_speech_event_id_idx on public.meaning_states (speech_event_id);
create index meaning_states_intent_type_idx on public.meaning_states (intent_type);
create index meaning_states_context_sufficiency_idx on public.meaning_states (context_sufficiency) where context_sufficiency in ('insufficient', 'conflicting');
create index meaning_states_created_at_idx on public.meaning_states (created_at desc);

alter table public.meaning_states enable row level security;

create policy "workspace members can read meaning states"
  on public.meaning_states for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "workspace members can create meaning states"
  on public.meaning_states for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

-- MeaningStates are immutable after creation. No UPDATE or DELETE policies.

-- ---------------------------------------------------------------------------
-- Grant table access to authenticated users (RLS enforces boundaries)
-- ---------------------------------------------------------------------------
grant select, insert on public.meaning_states to authenticated;
