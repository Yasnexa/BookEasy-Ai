/*
# Fix Security Advisor Warnings

## Overview
Addresses three security advisor findings from the initial schema:

1. **auto_update_updated_at search_path mutable** — The trigger function
   did not have a fixed `search_path`, making it vulnerable to search-path
   hijacking. Fixed by adding `SET search_path = public`.

2. **is_super_admin callable by anon** — The SECURITY DEFINER helper function
   `is_super_admin()` was executable by the `anon` role via the REST API.
   Since this function is only used internally by RLS policies (not called
   directly by the client), EXECUTE is revoked from `anon` and
   `authenticated`. It remains callable from within policy evaluation
   because policies run with table-owner privileges.

3. **is_super_admin callable by authenticated** — Same fix as above.

## Changes
- Re-create `auto_update_updated_at` with `SET search_path = public`
- Revoke EXECUTE on `is_super_admin()` from `anon` and `authenticated`
*/

-- ============================================================
-- 1. Fix auto_update_updated_at search_path
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Lock down is_super_admin — revoke direct API execution
-- ============================================================
-- The function must stay SECURITY DEFINER so it can read profiles
-- bypassing RLS (otherwise RLS on profiles would cause recursion).
-- But it should never be called directly via REST; only from policies.

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM authenticated;
