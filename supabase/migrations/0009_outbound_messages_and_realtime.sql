-- 0009_outbound_messages_and_realtime.sql
-- Native executor target table + realtime for transcripts.

create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  recipient_id text not null,
  body text not null,
  channel text not null default 'native',
  status text not null default 'recorded',
  created_at timestamptz not null default now()
);

create index outbound_messages_workspace_id_idx on public.outbound_messages (workspace_id);

alter table public.outbound_messages enable row level security;

create policy "workspace members can read outbound messages"
  on public.outbound_messages for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "workspace members can insert outbound messages"
  on public.outbound_messages for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

grant select, insert on public.outbound_messages to authenticated;

-- Enable realtime on voice_sessions for partial transcript updates.
-- Clients subscribe to the table or use the broadcast helper in src/lib/realtime/transcripts.ts.
alter publication supabase_realtime add table public.voice_sessions;
