-- ==============================================================================
-- AshokaSports Live — Fix Matches RLS, Lookup FKs & Realtime Publication
-- Ashoka Institute of Technology and Management (AITM), Varanasi • Session 2026-27
--
-- INSTRUCTIONS FOR SUPABASE SQL EDITOR:
-- Paste this script into Supabase Dashboard -> SQL Editor and click Run.
-- Safe and idempotent: preserves all existing data while fixing permissions
-- and enabling real-time broadcasting for fixtures created by Super Admin.
-- ==============================================================================

-- 1. Upgrade Role Helper Functions to match either user_id OR authenticated email
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE approval_status = 'approved'
      AND role = 'super_admin'
      AND (
        user_id = auth.uid()
        OR (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE approval_status = 'approved'
      AND role IN ('super_admin', 'admin')
      AND (
        user_id = auth.uid()
        OR (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_scorer_or_above()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE approval_status = 'approved'
      AND role IN ('super_admin', 'admin', 'scorer')
      AND (
        user_id = auth.uid()
        OR (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_scorer_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_scorer_or_above();
$$;

-- 2. Matches Table RLS Policies (Public Broadcast + Approved Official Writes)
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view matches" ON public.matches;
CREATE POLICY "Public can view matches"
  ON public.matches FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authorized scorers and admins can insert matches" ON public.matches;
CREATE POLICY "Authorized scorers and admins can insert matches"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_scorer_or_above());

DROP POLICY IF EXISTS "Scorers can update unlocked matches; Admins can update all" ON public.matches;
CREATE POLICY "Scorers can update unlocked matches; Admins can update all"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_above()
    OR (public.is_scorer_or_above() AND is_locked = false)
  )
  WITH CHECK (
    public.is_admin_or_above()
    OR (public.is_scorer_or_above() AND is_locked = false)
  );

DROP POLICY IF EXISTS "Super admins can delete matches" ON public.matches;
CREATE POLICY "Super admins can delete matches"
  ON public.matches FOR DELETE
  TO authenticated
  USING (public.is_admin_or_above());

-- 3. Sports, Departments & Audit Logs Policies
DROP POLICY IF EXISTS "Public can view departments" ON public.departments;
CREATE POLICY "Public can view departments" ON public.departments FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view sports" ON public.sports;
CREATE POLICY "Public can view sports" ON public.sports FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Super admins manage sports" ON public.sports;
CREATE POLICY "Super admins manage sports"
  ON public.sports FOR ALL
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS "Scorers and Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Scorers and Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_scorer_or_above());

DROP POLICY IF EXISTS "Only Super Admins can inspect audit logs" ON public.audit_logs;
CREATE POLICY "Only Super Admins can inspect audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_or_above());

-- 4. Ensure Realtime Publication & REPLICA IDENTITY FULL for live portal sync
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['matches', 'sports', 'departments', 'points_table', 'podium_results', 'user_roles'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    WHEN undefined_object THEN
      NULL;
    END;
  END LOOP;
END $$;

ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.points_table REPLICA IDENTITY FULL;
ALTER TABLE public.departments REPLICA IDENTITY FULL;
ALTER TABLE public.podium_results REPLICA IDENTITY FULL;
