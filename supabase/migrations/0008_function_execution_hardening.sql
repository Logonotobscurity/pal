-- 0008_function_execution_hardening.sql
-- Security hardening for Supabase-exposed functions.
--
-- Goals:
--   * Remove PostgREST/RPC execution for internal SECURITY DEFINER helpers that
--     are not intended to be called by browser clients.
--   * Keep authenticated access to workspace membership helpers because the
--     existing RLS policies invoke them.
--   * Pin the trigger function search_path to public.

-- Internal auth trigger: invoked by on_auth_user_created, not by clients.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

-- Internal maintenance helper: not part of the browser/API contract.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;

-- RLS helpers are intentionally callable by authenticated policy evaluation,
-- but anonymous RPC access is unnecessary.
revoke execute on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;

revoke execute on function public.has_workspace_role(uuid, text[]) from public, anon;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated, service_role;

-- Trigger function with explicit search_path to prevent search-path hijacking.
alter function public.update_voice_session_timestamp()
  set search_path = public;
