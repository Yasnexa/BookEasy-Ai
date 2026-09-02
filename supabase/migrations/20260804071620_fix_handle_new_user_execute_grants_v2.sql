/*
# Fix handle_new_user Execute Grants (per-role)

## Overview
The previous REVOKE FROM PUBLIC did not remove per-role grants that
PostgreSQL's default grant assigns to anon and authenticated individually.
This migration revokes EXECUTE from each role explicitly.

## Fix
- Revoke EXECUTE on handle_new_user() from anon, authenticated, and PUBLIC
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
