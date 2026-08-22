/*
# Create BookEasy AI Core Schema — Tables, Enums, Indexes, Triggers

## Overview
This migration creates the complete database schema for BookEasy AI, an
AI-powered appointment booking and business management platform for salons,
barbers, and beauty businesses.

## New Tables
1. **profiles** — extends Supabase auth.users with role and display info
2. **businesses** — a business (salon, barbershop, etc.) owned by a user
3. **staff** — staff members linked to a business and optionally a user account
4. **services** — bookable services offered by a business
5. **working_hours** — per-staff weekly working schedule
6. **appointments** — booking connecting customer, business, service, staff
7. **notifications** — user-specific or system notifications
8. **subscriptions** — business subscription plan and billing status
9. **reviews** — customer reviews for businesses

## Enums
- user_role: customer, business_owner, staff, super_admin
- appointment_status: pending, confirmed, rescheduled, cancelled, completed, no_show
- business_status: pending, approved, suspended, deactivated
- subscription_plan: free, starter, pro, enterprise
- subscription_status: active, trialing, past_due, canceled
- notification_type: booking, reminder, cancellation, system, review

## Indexes
- Foreign key columns indexed for query performance
- Unique constraints on business slug, staff email per business

## Triggers
- auto_update_updated_at: automatically sets updated_at on row modification

## Security
- RLS will be enabled in the next migration (create_bookeasy_rls_policies)
- This migration creates tables only; no policies yet
*/

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'business_owner', 'staff', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE business_status AS ENUM ('pending', 'approved', 'suspended', 'deactivated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('booking', 'reminder', 'cancellation', 'system', 'review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL UNIQUE,
  full_name   text NOT NULL,
  phone       text,
  role        user_role NOT NULL DEFAULT 'customer',
  avatar_url  text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- 2. BUSINESSES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.businesses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  slug                text NOT NULL UNIQUE,
  description         text,
  category            text NOT NULL,
  address             text NOT NULL,
  city                text NOT NULL,
  phone               text NOT NULL,
  email               text,
  logo_url            text,
  cover_url           text,
  status              business_status NOT NULL DEFAULT 'pending',
  rating              numeric(2,1) NOT NULL DEFAULT 0.0,
  review_count        integer NOT NULL DEFAULT 0,
  subscription_plan   subscription_plan NOT NULL DEFAULT 'free',
  subscription_status subscription_status NOT NULL DEFAULT 'trialing',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);

DROP TRIGGER IF EXISTS trg_businesses_updated ON public.businesses;
CREATE TRIGGER trg_businesses_updated
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- 3. STAFF
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name   text NOT NULL,
  email       text NOT NULL,
  phone       text,
  role_title  text NOT NULL DEFAULT 'Staff',
  bio         text,
  avatar_url  text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_business ON public.staff(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON public.staff(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_business_email ON public.staff(business_id, email);

DROP TRIGGER IF EXISTS trg_staff_updated ON public.staff;
CREATE TRIGGER trg_staff_updated
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- 4. SERVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price            numeric(10,2) NOT NULL CHECK (price >= 0),
  category         text,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_business ON public.services(business_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(active);

DROP TRIGGER IF EXISTS trg_services_updated ON public.services;
CREATE TRIGGER trg_services_updated
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- 5. WORKING HOURS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.working_hours (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  day_of_week  integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  is_working   boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_working_hours_staff ON public.working_hours(staff_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_working_hours_staff_day ON public.working_hours(staff_id, day_of_week);

DROP TRIGGER IF EXISTS trg_working_hours_updated ON public.working_hours;
CREATE TRIGGER trg_working_hours_updated
  BEFORE UPDATE ON public.working_hours
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- 6. APPOINTMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.appointments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id        uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  staff_id          uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  customer_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time        timestamptz NOT NULL,
  end_time          timestamptz NOT NULL,
  duration_minutes  integer NOT NULL CHECK (duration_minutes > 0),
  price             numeric(10,2) NOT NULL CHECK (price >= 0),
  status            appointment_status NOT NULL DEFAULT 'pending',
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_business ON public.appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON public.appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);

DROP TRIGGER IF EXISTS trg_appointments_updated ON public.appointments;
CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id  uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  type         notification_type NOT NULL DEFAULT 'system',
  title        text NOT NULL,
  message      text NOT NULL,
  read         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

DROP TRIGGER IF EXISTS trg_notifications_updated ON public.notifications;
CREATE TRIGGER trg_notifications_updated
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- 8. SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan                 subscription_plan NOT NULL DEFAULT 'free',
  status               subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end   timestamptz,
  amount               numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON public.subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- 9. REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  rating          integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_business ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_appointment ON public.reviews(appointment_id);

DROP TRIGGER IF EXISTS trg_reviews_updated ON public.reviews;
CREATE TRIGGER trg_reviews_updated
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();
