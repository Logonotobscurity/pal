-- 0002_voice_ingestion.sql
-- PAL voice ingestion pipeline: sessions, events, and provenance.
--
-- Implements PAL_ARCHITECTURE.md §11, §40, PAL_DOMAIN_MODEL.md SpeechEvent.
--
-- Security: all tables are workspace-scoped and RLS-protected.

-- ---------------------------------------------------------------------------
-- voice_sessions — the live transcription session container
-- ---------------------------------------------------------------------------
create table public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique check (length(trim(session_id)) between 1 and 255),
  trace_id text not null check (length(trim(trace_id)) between 1 and 255),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  
  provider text not null check (provider in ('sahara', 'assemblyai', 'whisper', 'other')),
  provider_version text not null check (length(trim(provider_version)) between 1 and 50),
  
  state text not null check (state in ('ready', 'streaming', 'committed', 'error')),
  
  last_sequence int not null default -1 check (last_sequence >= -1),
  partial_transcript text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  
  -- Index for session lookup
  constraint voice_sessions_workspace_session_idx unique (workspace_id, session_id)
);

create index voice_sessions_workspace_id_idx on public.voice_sessions (workspace_id);
create index voice_sessions_trace_id_idx on public.voice_sessions (trace_id);
create index voice_sessions_expires_at_idx on public.voice_sessions (expires_at) where state in ('ready', 'streaming');

alter table public.voice_sessions enable row level security;

create policy "workspace members can read voice sessions"
  on public.voice_sessions for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "workspace members can create voice sessions"
  on public.voice_sessions for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can update their voice sessions"
  on public.voice_sessions for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- speech_events — immutable committed transcripts with full provenance
-- ---------------------------------------------------------------------------
create table public.speech_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique check (length(trim(event_id)) between 1 and 255),
  trace_id text not null check (length(trim(trace_id)) between 1 and 255),
  session_id text not null check (length(trim(session_id)) between 1 and 255),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  
  provider text not null check (provider in ('sahara', 'assemblyai', 'whisper', 'other')),
  provider_version text not null check (length(trim(provider_version)) between 1 and 50),
  
  -- transcript payload
  transcript_text text not null check (length(trim(transcript_text)) between 1 and 20000),
  transcript_segments jsonb not null check (jsonb_array_length(transcript_segments) >= 1),
  
  -- language detection
  language_spans jsonb not null default '[]'::jsonb,
  
  -- code-switching metadata
  code_switch_detected boolean not null default false,
  code_switch_count int not null default 0 check (code_switch_count >= 0),
  code_switch_density numeric check (code_switch_density is null or (code_switch_density >= 0 and code_switch_density <= 1)),
  code_switch_pairs jsonb not null default '[]'::jsonb,
  
  -- timing
  started_at timestamptz not null,
  ended_at timestamptz not null check (ended_at >= started_at),
  
  -- provenance chain
  provenance jsonb not null default '[]'::jsonb,
  
  created_at timestamptz not null default now()
);

create index speech_events_workspace_id_idx on public.speech_events (workspace_id);
create index speech_events_trace_id_idx on public.speech_events (trace_id);
create index speech_events_session_id_idx on public.speech_events (session_id);
create index speech_events_created_at_idx on public.speech_events (created_at desc);

alter table public.speech_events enable row level security;

create policy "workspace members can read speech events"
  on public.speech_events for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "workspace members can create speech events"
  on public.speech_events for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

-- Speech events are immutable after creation. No UPDATE or DELETE policies.

-- ---------------------------------------------------------------------------
-- Trigger: auto-update voice_sessions.updated_at
-- ---------------------------------------------------------------------------
create or replace function public.update_voice_session_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger voice_sessions_updated_at
  before update on public.voice_sessions
  for each row execute function public.update_voice_session_timestamp();

-- ---------------------------------------------------------------------------
-- Grant table access to authenticated users (RLS enforces boundaries)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.voice_sessions to authenticated;
grant select, insert on public.speech_events to authenticated;
