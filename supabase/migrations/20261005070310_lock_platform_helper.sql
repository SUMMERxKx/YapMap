-- The platform ships public.rls_auto_enable(), an event-trigger helper that turns RLS on
-- for newly created tables. It can't do anything when called directly (event-trigger
-- functions error outside DDL events), but the security advisor rightly points out that
-- API roles shouldn't be able to execute a SECURITY DEFINER function at all.
--
-- The function exists only on the hosted platform, not in a local `supabase start`
-- database, so the revoke runs only when the function is there. The hosted database
-- already ran this migration as a plain revoke; the guard changes nothing there.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable () from public, anon, authenticated;
  end if;
end
$$;
