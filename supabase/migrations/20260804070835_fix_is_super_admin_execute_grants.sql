/*
# Fix is_super_admin Execute Grants

## Overview
The `is_super_admin()` SECURITY DEFINER function was still callable via the
REST API because PostgreSQL grants EXECUTE to PUBLIC by default. Revoking
from `anon` and `authenticated` individually was not sufficient.

## Fix
- Revoke EXECUTE from PUBLIC (covers anon, authenticated, and any other role)
- The function remains usable from RLS policy evaluation because policies
  execute with the table owner's privileges, not the calling role's
*/

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
