-- Fix: grant EXECUTE on is_super_admin() to authenticated so RLS policies
-- can call it. The function is SECURITY DEFINER and only checks the caller's
-- own profile role, so there is no information disclosure. EXECUTE stays
-- revoked from anon and PUBLIC to keep the function protected from
-- unauthenticated access.
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
