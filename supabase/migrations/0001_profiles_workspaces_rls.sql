-- 0001_profiles_workspaces_rls.sql
-- Task 3: authentication and workspace tenancy.
--
-- Implements PAL_ARCHITECTURE.md §40–§43:
--   profiles, workspaces, workspace_members with explicit RLS policies.
--   Authorization path: auth.user → workspace_members → workspace_id → resource.
--
-- Security notes:
--   * Every workspace-owned table gets RLS enabled with explicit,
--     per-operation policies (no "repeat similar policies" placeholders).
--   * Helper functions are SECURITY DEFINER with pinned search_path so RLS
--     membership checks do not recurse into workspace_members policies.

-- ---------------------------------------------------------------------------
-- gen_random_uuid() is provided by pgcrypto; enabled by default on modern
-- Supabase projects. Enable explicitly for determinism.
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT/DELETE policies: profiles are created exclusively by the
-- handle_new_user trigger (SECURITY DEFINER). Deleting a profile means
-- deleting the auth user (cascade).

-- ---------------------------------------------------------------------------
-- workspaces — tenant root. Not itself workspace-scoped: membership defines
-- visibility, ownership defines administration.
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- workspace_members — the membership/role table every tenant-scoped table
-- will authorize through.
-- ---------------------------------------------------------------------------
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Membership helpers — SECURITY DEFINER so policies on workspace_members do
-- not recurse. search_path is pinned to public (function hijack defense).
-- MUST BE CREATED BEFORE RLS POLICIES THAT USE THEM.
-- ---------------------------------------------------------------------------
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace
      and m.user_id = auth.uid()
      and m.role = any (allowed_roles)
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- NOW enable RLS and create policies for workspaces and workspace_members
-- ---------------------------------------------------------------------------
alter table public.workspaces enable row level security;

create policy "workspace members can read their workspaces"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

create policy "authenticated users can create workspaces"
  on public.workspaces for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "workspace owners can update their workspaces"
  on public.workspaces for update
  to authenticated
  using (public.has_workspace_role(id, array['owner']::text[]))
  with check (public.has_workspace_role(id, array['owner']::text[]));

create policy "workspace owners can delete their workspaces"
  on public.workspaces for delete
  to authenticated
  using (public.has_workspace_role(id, array['owner']::text[]));

alter table public.workspace_members enable row level security;

create policy "workspace members can read memberships"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "users can bootstrap their own membership on a new workspace"
  on public.workspace_members for insert
  to authenticated
  with check (
    -- Case 1: creator takes ownership of a workspace that has no members yet.
    (
      user_id = auth.uid()
      and role = 'owner'
      and not exists (
        select 1 from public.workspace_members m
        where m.workspace_id = workspace_members.workspace_id
      )
    )
    -- Case 2: owners and admins add members to their workspace.
    or public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
  );

create policy "workspace owners and admins can update memberships"
  on public.workspace_members for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::text[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::text[]));

create policy "workspace owners and admins can remove members, members can leave"
  on public.workspace_members for delete
  to authenticated
  using (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::text[])
    or user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- handle_new_user — on signup, atomically create the profile, a personal
-- workspace, and the owner membership. Runs as definer because auth.users
-- inserts happen outside any user session.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  workspace_id uuid;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, display_name)
  values (new.id, display_name);

  insert into public.workspaces (name, created_by)
  values (display_name || '''s Workspace', new.id)
  returning id into workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
