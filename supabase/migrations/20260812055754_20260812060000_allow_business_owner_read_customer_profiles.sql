/*
# Allow business owners to read customer profiles for their appointments

## Why
The existing profiles SELECT policy (`profiles_select_own_or_admin`) only
allows `auth.uid() = id`. When a business owner fetches appointments with a
join to `profiles` (e.g. `customer:profiles(full_name, email, phone)`), the
joined profile row is filtered out by RLS because the customer's `id` does not
match the business owner's `auth.uid()`. This caused the dashboard to display
"Unknown" for every customer name.

## What this migration does
Adds a second SELECT policy on `profiles` that allows a business owner to read
a profile if that profile belongs to a user who has at least one appointment
with a business owned by the authenticated user. This is strictly read-only
and scoped — the owner cannot read arbitrary profiles, only those of customers
who have booked with their business.

## Security
- New SELECT-only policy on `profiles`, scoped to `authenticated`.
- Predicate: the profile's `id` must appear as `customer_id` on an appointment
  whose `business_id` is owned by `auth.uid()`.
- No INSERT/UPDATE/DELETE changes — existing policies remain unchanged.
- Does not weaken any existing policy; this is additive.
*/

DROP POLICY IF EXISTS "profiles_select_business_owner_customiers" ON public.profiles;

CREATE POLICY "profiles_select_business_owner_customiers"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.businesses b ON b.id = a.business_id
      WHERE a.customer_id = profiles.id
        AND b.owner_id = auth.uid()
    )
  );
