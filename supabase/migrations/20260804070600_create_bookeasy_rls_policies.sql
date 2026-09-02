/*
# BookEasy AI — Row Level Security Policies

## Overview
This migration enables RLS on all 9 core tables and creates ownership-based
access policies. BookEasy AI has a sign-in screen, so all policies are scoped
to the `authenticated` role using `auth.uid()` for ownership checks.

## RLS Strategy by Role

### Customer
- Read/update own profile
- Read approved businesses and their active services (public browsing)
- Read/create/update/delete own appointments
- Read/create own reviews
- Read own notifications

### Business Owner
- Read/update own profile
- Full CRUD on own businesses
- Full CRUD on staff, services, working_hours, appointments, notifications
  for businesses they own
- Read own subscriptions
- Read reviews for their businesses

### Staff
- Read/update own profile
- Read the business they belong to (via staff link)
- Read services and working_hours for their assigned business
- Read/update appointments assigned to them
- Read notifications addressed to them

### Super Admin
- Full access to all tables (platform-level management)

## Policy Pattern
Each table gets 4 separate policies (SELECT, INSERT, UPDATE, DELETE).
Ownership is verified via auth.uid() directly or through EXISTS subqueries
that check the user's relationship to a business.

## Important Notes
- RLS is enabled but policies use ownership predicates, never USING(true)
- Super admin access is granted via a helper function checking the user's role
- Staff access is scoped through the staff table's user_id link
*/

-- ============================================================
-- HELPER: is_super_admin
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- ============================================================
-- 1. PROFILES — RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own profile; super admins can read all
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_super_admin());

-- INSERT: handled by trigger on auth.users; allow self-insert
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: users can update their own profile; super admins can update any
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_super_admin())
  WITH CHECK (auth.uid() = id OR public.is_super_admin());

-- DELETE: only super admins can delete profiles
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ============================================================
-- 2. BUSINESSES — RLS
-- ============================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- SELECT: approved businesses are public to all authenticated users;
-- owners see their own (any status); super admins see all
DROP POLICY IF EXISTS "businesses_select_visible" ON public.businesses;
CREATE POLICY "businesses_select_visible"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR owner_id = auth.uid()
    OR status = 'approved'
  );

-- INSERT: any authenticated user can create a business (they become owner)
DROP POLICY IF EXISTS "businesses_insert_own" ON public.businesses;
CREATE POLICY "businesses_insert_own"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: owner or super admin
DROP POLICY IF EXISTS "businesses_update_own_or_admin" ON public.businesses;
CREATE POLICY "businesses_update_own_or_admin"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_super_admin());

-- DELETE: owner or super admin
DROP POLICY IF EXISTS "businesses_delete_own_or_admin" ON public.businesses;
CREATE POLICY "businesses_delete_own_or_admin"
  ON public.businesses FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin());

-- ============================================================
-- 3. STAFF — RLS
-- ============================================================

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- SELECT: business owner, the staff member themselves, or super admin
DROP POLICY IF EXISTS "staff_select_allowed" ON public.staff;
CREATE POLICY "staff_select_allowed"
  ON public.staff FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = staff.business_id AND b.owner_id = auth.uid()
    )
  );

-- INSERT: business owner or super admin
DROP POLICY IF EXISTS "staff_insert_owner_or_admin" ON public.staff;
CREATE POLICY "staff_insert_owner_or_admin"
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- UPDATE: business owner or super admin
DROP POLICY IF EXISTS "staff_update_owner_or_admin" ON public.staff;
CREATE POLICY "staff_update_owner_or_admin"
  ON public.staff FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = staff.business_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = staff.business_id AND b.owner_id = auth.uid()
    )
  );

-- DELETE: business owner or super admin
DROP POLICY IF EXISTS "staff_delete_owner_or_admin" ON public.staff;
CREATE POLICY "staff_delete_owner_or_admin"
  ON public.staff FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = staff.business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 4. SERVICES — RLS
-- ============================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- SELECT: active services on approved businesses are public;
-- business owner sees all their services; super admin sees all
DROP POLICY IF EXISTS "services_select_visible" ON public.services;
CREATE POLICY "services_select_visible"
  ON public.services FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = services.business_id AND b.owner_id = auth.uid()
    )
    OR (
      active = true
      AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = services.business_id AND b.status = 'approved'
      )
    )
  );

-- INSERT: business owner or super admin
DROP POLICY IF EXISTS "services_insert_owner_or_admin" ON public.services;
CREATE POLICY "services_insert_owner_or_admin"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- UPDATE: business owner or super admin
DROP POLICY IF EXISTS "services_update_owner_or_admin" ON public.services;
CREATE POLICY "services_update_owner_or_admin"
  ON public.services FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = services.business_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = services.business_id AND b.owner_id = auth.uid()
    )
  );

-- DELETE: business owner or super admin
DROP POLICY IF EXISTS "services_delete_owner_or_admin" ON public.services;
CREATE POLICY "services_delete_owner_or_admin"
  ON public.services FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = services.business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 5. WORKING HOURS — RLS
-- ============================================================

ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;

-- SELECT: business owner, staff member (own hours), or super admin
DROP POLICY IF EXISTS "working_hours_select_allowed" ON public.working_hours;
CREATE POLICY "working_hours_select_allowed"
  ON public.working_hours FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = working_hours.staff_id AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.businesses b ON b.id = s.business_id
      WHERE s.id = working_hours.staff_id AND b.owner_id = auth.uid()
    )
  );

-- INSERT: business owner or super admin
DROP POLICY IF EXISTS "working_hours_insert_owner_or_admin" ON public.working_hours;
CREATE POLICY "working_hours_insert_owner_or_admin"
  ON public.working_hours FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.businesses b ON b.id = s.business_id
      WHERE s.id = staff_id AND b.owner_id = auth.uid()
    )
  );

-- UPDATE: business owner or super admin
DROP POLICY IF EXISTS "working_hours_update_owner_or_admin" ON public.working_hours;
CREATE POLICY "working_hours_update_owner_or_admin"
  ON public.working_hours FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.businesses b ON b.id = s.business_id
      WHERE s.id = working_hours.staff_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.businesses b ON b.id = s.business_id
      WHERE s.id = working_hours.staff_id AND b.owner_id = auth.uid()
    )
  );

-- DELETE: business owner or super admin
DROP POLICY IF EXISTS "working_hours_delete_owner_or_admin" ON public.working_hours;
CREATE POLICY "working_hours_delete_owner_or_admin"
  ON public.working_hours FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.staff s
      JOIN public.businesses b ON b.id = s.business_id
      WHERE s.id = working_hours.staff_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 6. APPOINTMENTS — RLS
-- ============================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- SELECT: customer (own appointments), business owner, assigned staff, super admin
DROP POLICY IF EXISTS "appointments_select_allowed" ON public.appointments;
CREATE POLICY "appointments_select_allowed"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = appointments.business_id AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = appointments.staff_id AND s.user_id = auth.uid()
    )
  );

-- INSERT: customers create their own appointments; business owners can create
-- appointments for their business; super admin can create any
DROP POLICY IF EXISTS "appointments_insert_allowed" ON public.appointments;
CREATE POLICY "appointments_insert_allowed"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.owner_id = auth.uid()
    )
  );

-- UPDATE: customer (own appointments), business owner, assigned staff, super admin
DROP POLICY IF EXISTS "appointments_update_allowed" ON public.appointments;
CREATE POLICY "appointments_update_allowed"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = appointments.business_id AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = appointments.staff_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = appointments.business_id AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = appointments.staff_id AND s.user_id = auth.uid()
    )
  );

-- DELETE: customer (own appointments), business owner, super admin
DROP POLICY IF EXISTS "appointments_delete_allowed" ON public.appointments;
CREATE POLICY "appointments_delete_allowed"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = appointments.business_id AND b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 7. NOTIFICATIONS — RLS
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: user reads their own notifications; super admin reads all
DROP POLICY IF EXISTS "notifications_select_own_or_admin" ON public.notifications;
CREATE POLICY "notifications_select_own_or_admin"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

-- INSERT: business owner can create notifications for their business users;
-- super admin can create any; users can create for themselves
DROP POLICY IF EXISTS "notifications_insert_allowed" ON public.notifications;
CREATE POLICY "notifications_insert_allowed"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR (
      business_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
    )
  );

-- UPDATE: user can mark their own notifications as read; super admin can update any
DROP POLICY IF EXISTS "notifications_update_own_or_admin" ON public.notifications;
CREATE POLICY "notifications_update_own_or_admin"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

-- DELETE: user can delete their own notifications; super admin can delete any
DROP POLICY IF EXISTS "notifications_delete_own_or_admin" ON public.notifications;
CREATE POLICY "notifications_delete_own_or_admin"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

-- ============================================================
-- 8. SUBSCRIPTIONS — RLS
-- ============================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: business owner sees their own; super admin sees all
DROP POLICY IF EXISTS "subscriptions_select_owner_or_admin" ON public.subscriptions;
CREATE POLICY "subscriptions_select_owner_or_admin"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = subscriptions.business_id AND b.owner_id = auth.uid()
    )
  );

-- INSERT: super admin only (subscriptions are managed by the platform)
DROP POLICY IF EXISTS "subscriptions_insert_admin_only" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_admin_only"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- UPDATE: super admin only
DROP POLICY IF EXISTS "subscriptions_update_admin_only" ON public.subscriptions;
CREATE POLICY "subscriptions_update_admin_only"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- DELETE: super admin only
DROP POLICY IF EXISTS "subscriptions_delete_admin_only" ON public.subscriptions;
CREATE POLICY "subscriptions_delete_admin_only"
  ON public.subscriptions FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ============================================================
-- 9. REVIEWS — RLS
-- ============================================================

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- SELECT: reviews on approved businesses are public;
-- business owner sees reviews for their business;
-- customer sees their own reviews; super admin sees all
DROP POLICY IF EXISTS "reviews_select_visible" ON public.reviews;
CREATE POLICY "reviews_select_visible"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = reviews.business_id AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = reviews.business_id AND b.status = 'approved'
    )
  );

-- INSERT: customers can create reviews for businesses; super admin can create any
DROP POLICY IF EXISTS "reviews_insert_customer_or_admin" ON public.reviews;
CREATE POLICY "reviews_insert_customer_or_admin"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR customer_id = auth.uid()
  );

-- UPDATE: customers can update their own reviews; super admin can update any
DROP POLICY IF EXISTS "reviews_update_own_or_admin" ON public.reviews;
CREATE POLICY "reviews_update_own_or_admin"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR customer_id = auth.uid()
  )
  WITH CHECK (
    public.is_super_admin()
    OR customer_id = auth.uid()
  );

-- DELETE: customers can delete their own reviews; super admin can delete any
DROP POLICY IF EXISTS "reviews_delete_own_or_admin" ON public.reviews;
CREATE POLICY "reviews_delete_own_or_admin"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR customer_id = auth.uid()
  );
