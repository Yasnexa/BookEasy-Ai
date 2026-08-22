/*
# Allow customers to read working_hours for approved businesses

## Purpose
Customers need to see available time slots when booking. Slot generation
requires reading staff working hours. Previously only the business owner
and the staff member themselves could read working_hours, so customers
could not see any availability.

## Changes
- Adds a SELECT policy on `working_hours` for authenticated users when the
  staff member belongs to an approved business.
- This is read-only — no INSERT/UPDATE/DELETE grants are added.
- Existing owner/staff/admin policies remain unchanged.

## Security
- Only working hours for staff in **approved** businesses are exposed.
- No write access is granted to customers.
- The policy is scoped to `TO authenticated` so anonymous access is still
  blocked.
*/

DROP POLICY IF EXISTS "working_hours_select_for_approved_business" ON public.working_hours;

CREATE POLICY "working_hours_select_for_approved_business"
ON public.working_hours FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM staff s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.id = working_hours.staff_id
      AND b.status = 'approved'
  )
);
