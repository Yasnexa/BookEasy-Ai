/*
# Fix handle_new_user Execute Grants

## Overview
The `handle_new_user()` SECURITY DEFINER trigger function was callable via
the REST API by anon and authenticated roles. This function should only
fire as a trigger on auth.users INSERT, never be called directly.

## Fix
- Revoke EXECUTE from PUBLIC (covers all roles)
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
