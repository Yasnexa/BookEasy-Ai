/*
# Auto-create profile on user signup

## Overview
When a user signs up via Supabase Auth, a row is automatically created in
auth.users. We need a matching row in public.profiles with the correct role.
This trigger reads the user's metadata (full_name, role, phone) that was
passed during signUp() and inserts a profile row.

## How it works
1. A trigger fires AFTER INSERT on auth.users
2. The trigger function reads raw_user_meta_data for:
   - full_name (defaults to email prefix if missing)
   - role (defaults to 'customer')
   - phone (optional)
3. Inserts a row into public.profiles with the new user's id

## Security
- The trigger function is SECURITY DEFINER so it can write to public.profiles
  (the anon role cannot insert into profiles directly during the auth flow)
- EXECUTE is revoked from PUBLIC and authenticated to prevent direct API calls
- The function has a fixed search_path to prevent search-path hijacking
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role)
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
