/*
# Contact Form Submissions Table

## Overview
Creates a table to store contact form submissions from the public Contact Us page.
An edge function will insert rows here using the service role key — the anon
client cannot write directly, preventing spam/abuse.

## New Table
- **contact_submissions** — stores name, email, subject, message, and status
  (new, read, replied, archived) for each contact form submission.

## Security
- RLS enabled.
- No anon/authenticated INSERT/UPDATE/DELETE — only the service role (edge
  function) can write. SELECT restricted to super_admin for dashboard viewing.
*/

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  subject     text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON public.contact_submissions(created_at);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_submissions_select_admin" ON public.contact_submissions;
CREATE POLICY "contact_submissions_select_admin"
  ON public.contact_submissions FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "contact_submissions_update_admin" ON public.contact_submissions;
CREATE POLICY "contact_submissions_update_admin"
  ON public.contact_submissions FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "contact_submissions_delete_admin" ON public.contact_submissions;
CREATE POLICY "contact_submissions_delete_admin"
  ON public.contact_submissions FOR DELETE
  TO authenticated
  USING (public.is_super_admin());
