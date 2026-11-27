-- Mirror Supabase's default privileges: the platform grants broad table
-- privileges to anon/authenticated/service_role and relies on RLS as the ONLY
-- gate. Kaswise migrations do not create these grants, so a stub environment
-- must add them or RLS can never be exercised realistically.
--
-- Applied AFTER the migrations, then the RPC's anon lockdown is re-applied
-- (the blanket grants would otherwise hand EXECUTE back to anon).

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

-- Values a real Supabase project ships by default; needed by the fixtures and
-- by auth.uid(), which the RPC calls on every invocation (USAGE on the schema
-- plus EXECUTE on the routine — a table-only grant is not enough).
grant usage on schema auth, storage to anon, authenticated, service_role;
grant all on all tables in schema auth to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
grant all on all routines in schema auth to anon, authenticated, service_role;

-- Restore the lockdown the migration intends: only authenticated may call it.
revoke all on function public.create_transaction_entry_v2(uuid, text, text, uuid, jsonb) from public, anon;
grant execute on function public.create_transaction_entry_v2(uuid, text, text, uuid, jsonb) to authenticated;
