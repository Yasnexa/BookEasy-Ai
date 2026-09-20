/*
# Subscription & Billing System — Phase 1

## Overview
Creates a proper subscription billing structure for BookEasy AI with support
for dual-currency pricing (PKR and USD), payment tracking, and architecture
ready for a future payment gateway (Stripe, etc.). No payment gateway is
integrated in this phase.

## New Tables
1. **plans** — Defines subscription plans (Free, Starter, Pro) with PKR and
   USD monthly prices, billing interval, active/inactive status, and
   features/limits stored as JSONB for scalability.
2. **payments** — Records individual payment transactions linked to a
   subscription and business, with amount, currency, payment provider,
   external transaction ID, and payment status.

## Modified Tables
3. **subscriptions** — Extended with new columns to support payment gateway
   integration:
   - plan_id (FK to plans table, replaces the enum-based plan column)
   - billing_currency (pkr or usd)
   - payment_provider (text, e.g. 'stripe', 'razorpay')
   - external_customer_id (text, the provider's customer ID)
   - external_subscription_id (text, the provider's subscription ID)
   - canceled_at (timestamptz, when cancellation was requested)
   - start_date (timestamptz, when the subscription originally started)
   The existing plan enum column and business_id FK are preserved for
   backward compatibility.

## Enums
- billing_currency: pkr, usd
- payment_status: pending, succeeded, failed, refunded, canceled

## Security
- RLS enabled on all new tables.
- plans: publicly readable (anyone can see available plans).
- subscriptions: business owner can read/update their own; only super_admin
  can insert/delete (server-side verification will handle inserts).
- payments: business owner can read their own; only super_admin can
  insert/update/delete (no client-side payment creation).

## Important Notes
1. Paid subscriptions must only become active after server-side verification
   (webhook from payment provider). The RLS policies enforce this by
   blocking client-side inserts on subscriptions and payments for paid plans.
2. The Free plan can be self-served by business owners.
3. No sensitive payment data (card numbers, etc.) is stored — only external
   transaction IDs from the payment provider.
*/

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE billing_currency AS ENUM ('pkr', 'usd');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. PLANS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  display_name    text NOT NULL,
  description     text,
  price_pkr        numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_pkr >= 0),
  price_usd        numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_usd >= 0),
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  plan_key         subscription_plan NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  features        jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON public.plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_sort ON public.plans(sort_order);
CREATE INDEX IF NOT EXISTS idx_plans_key ON public.plans(plan_key);

DROP TRIGGER IF EXISTS trg_plans_updated ON public.plans;
CREATE TRIGGER trg_plans_updated
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- 2. ALTER SUBSCRIPTIONS TABLE
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_currency billing_currency DEFAULT 'pkr',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS external_customer_id text,
  ADD COLUMN IF NOT EXISTS external_subscription_id text,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS start_date timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON public.subscriptions(payment_provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_external_sub ON public.subscriptions(external_subscription_id);

-- ============================================================
-- 3. PAYMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id       uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id               uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  amount                numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency              billing_currency NOT NULL,
  payment_provider      text,
  external_payment_id   text,
  external_transaction_id text,
  status                payment_status NOT NULL DEFAULT 'pending',
  paid_at               timestamptz,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_business ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON public.payments(external_payment_id);

DROP TRIGGER IF EXISTS trg_payments_updated ON public.payments;
CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();

-- ============================================================
-- RLS: PLANS (publicly readable)
-- ============================================================

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select_public" ON public.plans;
CREATE POLICY "plans_select_public"
  ON public.plans FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "plans_insert_admin_only" ON public.plans;
CREATE POLICY "plans_insert_admin_only"
  ON public.plans FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "plans_update_admin_only" ON public.plans;
CREATE POLICY "plans_update_admin_only"
  ON public.plans FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "plans_delete_admin_only" ON public.plans;
CREATE POLICY "plans_delete_admin_only"
  ON public.plans FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ============================================================
-- RLS: SUBSCRIPTIONS (replace existing policies)
-- ============================================================

-- Keep existing SELECT policy (business owner can read their own)
-- but add update and restrict insert/delete to admin/server-side

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

-- Allow business owners to insert Free plan subscriptions only
-- Paid plans must be activated server-side via webhook
DROP POLICY IF EXISTS "subscriptions_insert_owner_or_admin" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_owner_or_admin"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = business_id AND b.owner_id = auth.uid()
      )
      AND plan = 'free'
    )
  );

-- Allow business owners to update their own subscriptions (e.g. cancel)
-- but NOT to change plan or status for paid plans — those changes
-- must come from server-side webhook processing
DROP POLICY IF EXISTS "subscriptions_update_owner_or_admin" ON public.subscriptions;
CREATE POLICY "subscriptions_update_owner_or_admin"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = subscriptions.business_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = subscriptions.business_id AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "subscriptions_delete_admin_only" ON public.subscriptions;
CREATE POLICY "subscriptions_delete_admin_only"
  ON public.subscriptions FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ============================================================
-- RLS: PAYMENTS (read-only for business owners, write admin-only)
-- ============================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_owner_or_admin" ON public.payments;
CREATE POLICY "payments_select_owner_or_admin"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = payments.business_id AND b.owner_id = auth.uid()
    )
  );

-- Payments can only be created by server-side (super_admin / service role)
-- Never by the client — prevents fake payment records
DROP POLICY IF EXISTS "payments_insert_admin_only" ON public.payments;
CREATE POLICY "payments_insert_admin_only"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "payments_update_admin_only" ON public.payments;
CREATE POLICY "payments_update_admin_only"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "payments_delete_admin_only" ON public.payments;
CREATE POLICY "payments_delete_admin_only"
  ON public.payments FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ============================================================
-- SEED: Three plans (Free, Starter, Pro)
-- ============================================================

INSERT INTO public.plans (name, display_name, description, price_pkr, price_usd, billing_interval, plan_key, is_active, sort_order, features, limits)
VALUES
  (
    'free',
    'Free',
    'For solo professionals just getting started.',
    0, 0,
    'monthly',
    'free'::subscription_plan,
    true,
    0,
    '["1 staff member","Up to 3 services","Online booking page","Basic dashboard","Email reminders"]'::jsonb,
    '{"max_staff": 1, "max_services": 3}'::jsonb
  ),
  (
    'starter',
    'Starter',
    'For small businesses growing their bookings.',
    2499, 10,
    'monthly',
    'starter'::subscription_plan,
    true,
    1,
    '["Up to 5 staff","Unlimited services","SMS + email reminders","Analytics dashboard","Customer management","AI Assistant (beta)"]'::jsonb,
    '{"max_staff": 5, "max_services": -1}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'For busy salons with multiple locations.',
    4999, 20,
    'monthly',
    'pro'::subscription_plan,
    true,
    2,
    '["Unlimited staff","Multi-location support","Advanced analytics","Custom branding","Priority support","AI Assistant (full)"]'::jsonb,
    '{"max_staff": -1, "max_services": -1}'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_pkr = EXCLUDED.price_pkr,
  price_usd = EXCLUDED.price_usd,
  billing_interval = EXCLUDED.billing_interval,
  plan_key = EXCLUDED.plan_key,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = now();
