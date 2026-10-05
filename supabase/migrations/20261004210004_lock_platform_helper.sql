-- The platform ships public.rls_auto_enable(), an event-trigger helper that turns RLS on
-- for newly created tables. It can't do anything when called directly (event-trigger
-- functions error outside DDL events), but the security advisor rightly points out that
-- API roles shouldn't be able to execute a SECURITY DEFINER function at all.
revoke execute on function public.rls_auto_enable () from public, anon, authenticated;
