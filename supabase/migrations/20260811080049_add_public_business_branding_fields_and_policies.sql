/*
# Public business branding and tenant website access

1. New Columns
- `businesses.primary_color` stores the owner's primary brand color.
- `businesses.secondary_color` stores the owner's supporting brand color.
- `businesses.accent_color` stores the owner's accent color.
- Existing businesses receive accessible neutral defaults.

2. Public Website Read Access
- Approved businesses are readable by anonymous and authenticated visitors.
- Active services, active staff, and working hours for approved businesses are
  readable by anonymous and authenticated visitors.
- No insert, update, or delete permissions are added for anonymous visitors.

3. Security
- Existing owner and administrator policies remain unchanged.
- Public policies are SELECT-only and limited to approved businesses.
- Appointment, customer, profile, staff-management, and service-management
  write policies are not changed.

4. Important Notes
- This migration is additive and preserves all existing business profile fields.
- The public website uses the existing slug, logo_url, and cover_url fields.
*/

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS secondary_color text NOT NULL DEFAULT '#f8fafc',
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#c59d5f';

DROP POLICY IF EXISTS "businesses_select_public_approved" ON public.businesses;
CREATE POLICY "businesses_select_public_approved"
  ON public.businesses FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS "services_select_public_approved" ON public.services;
CREATE POLICY "services_select_public_approved"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = services.business_id AND b.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "staff_select_public_approved" ON public.staff;
CREATE POLICY "staff_select_public_approved"
  ON public.staff FOR SELECT
  TO anon, authenticated
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = staff.business_id AND b.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "working_hours_select_public_approved" ON public.working_hours;
CREATE POLICY "working_hours_select_public_approved"
  ON public.working_hours FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff s
      JOIN public.businesses b ON b.id = s.business_id
      WHERE s.id = working_hours.staff_id
        AND s.active = true
        AND b.status = 'approved'
    )
  );