/*
# Prevent overlapping staff appointments

## Purpose
The booking screen checks existing appointments before showing slots, but two
customers could still select the same slot at nearly the same time. This adds
a database-level guard so the appointments table remains correct under
concurrent bookings.

## Changes
- Enables the existing `btree_gist` extension when needed for UUID equality
  in a GiST exclusion constraint.
- Adds a constraint on `appointments` preventing overlapping time ranges for
  the same staff member.
- Cancelled and no-show appointments do not block future bookings.

## Security and integrity
- This does not change RLS or grant any new permissions.
- Existing appointments are preserved.
- The constraint applies to customer bookings and owner rescheduling alike.
*/

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_staff_no_overlap;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_staff_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (staff_id IS NOT NULL AND status IN ('pending', 'confirmed', 'rescheduled'));
