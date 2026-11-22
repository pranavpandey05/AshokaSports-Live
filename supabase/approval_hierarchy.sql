-- ==============================================================================
-- AshokaSports Live — 3-Tier Approval Authentication Hierarchy & RLS Policies
-- Ashoka Institute of Technology and Management (AITM), Varanasi
-- Session 2026-27 • Super Admin -> Admin -> Ground Volunteer Scorer
--
-- INSTRUCTIONS FOR SUPABASE SQL EDITOR:
-- Run this script in your Supabase SQL Editor. It upgrades user_roles with
-- approval workflows, helper functions, and granular role-scoped RLS policies.
-- ==============================================================================

-- 1. Upgrade user_roles table with approval fields
DO $$
BEGIN
  -- Add full_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN full_name TEXT;
  END IF;

  -- Add approval_status column ('pending' | 'approved' | 'rejected')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';
  END IF;

  -- Add approved_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add approved_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Constraints on user_roles
DO $$
BEGIN
  ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS chk_user_roles_status;
  ALTER TABLE public.user_roles ADD CONSTRAINT chk_user_roles_status
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Security Helper Functions (SECURITY DEFINER with fixed search_path)

-- 3.1 is_super_admin: Approved super_admin only
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND approval_status = 'approved'
  );
$$;

-- 3.2 is_admin_or_above: Approved super_admin or approved admin
CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND approval_status = 'approved'
  );
$$;

-- 3.3 is_scorer_or_above: Approved super_admin, approved admin, or approved scorer
CREATE OR REPLACE FUNCTION public.is_scorer_or_above()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'scorer')
      AND approval_status = 'approved'
  );
$$;

-- 3.4 is_scorer_or_admin: backwards-compatible alias for is_scorer_or_above
CREATE OR REPLACE FUNCTION public.is_scorer_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_scorer_or_above();
$$;

-- 4. RLS Policies on user_roles Table

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4.1 SELECT Policies:
-- Users can view their own role; Super Admins can view all; Admins can view all Scorers and their own role.
DROP POLICY IF EXISTS "View user roles policy" ON public.user_roles;
CREATE POLICY "View user roles policy"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR (public.is_admin_or_above() AND role = 'scorer')
  );

-- 4.2 INSERT Policies:
-- Any authenticated user can submit an initial access request with role in ('admin', 'scorer') and status = 'pending'.
-- Super Admins can insert any approved/pending role directly.
DROP POLICY IF EXISTS "Users can request access or super admin can insert" ON public.user_roles;
CREATE POLICY "Users can request access or super admin can insert"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      user_id = auth.uid()
      AND role IN ('admin', 'scorer')
      AND approval_status = 'pending'
    )
  );

-- 4.3 UPDATE Policies:
-- Super Admin can approve/reject/modify ALL user_roles (Admins & Scorers).
-- Admin can approve/reject/modify ONLY rows where role = 'scorer'.
DROP POLICY IF EXISTS "Super admins and admins can update user roles" ON public.user_roles;
CREATE POLICY "Super admins and admins can update user roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin_or_above() AND role = 'scorer')
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_admin_or_above() AND role = 'scorer')
  );

-- 4.4 DELETE Policies:
-- Super Admin can delete any role.
-- Admin can delete ONLY scorer roles.
DROP POLICY IF EXISTS "Super admins and admins can delete user roles" ON public.user_roles;
CREATE POLICY "Super admins and admins can delete user roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin_or_above() AND role = 'scorer')
  );

-- 5. Updated Tournament Governance Policies for Approved Admins & Super Admins

-- 5.1 Matches: Admins & Super Admins have full management; Scorers update unlocked matches
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

-- 5.2 Lineups & Stats: Lock-Protected
DROP POLICY IF EXISTS "Scorers can manage lineups for unlocked matches" ON public.match_lineups;
CREATE POLICY "Scorers can manage lineups for unlocked matches"
  ON public.match_lineups FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_above()
    OR (public.is_scorer_or_above() AND public.is_match_unlocked(match_id))
  )
  WITH CHECK (
    public.is_admin_or_above()
    OR (public.is_scorer_or_above() AND public.is_match_unlocked(match_id))
  );

DROP POLICY IF EXISTS "Scorers can manage stats for unlocked matches" ON public.match_player_stats;
CREATE POLICY "Scorers can manage stats for unlocked matches"
  ON public.match_player_stats FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_above()
    OR (public.is_scorer_or_above() AND public.is_match_unlocked(match_id))
  )
  WITH CHECK (
    public.is_admin_or_above()
    OR (public.is_scorer_or_above() AND public.is_match_unlocked(match_id))
  );

-- 5.3 Sports & Podium: Admins & Super Admins can manage
DROP POLICY IF EXISTS "Super admins manage sports" ON public.sports;
CREATE POLICY "Super admins manage sports"
  ON public.sports FOR ALL
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS "Super admins manage podium results" ON public.podium_results;
CREATE POLICY "Super admins manage podium results"
  ON public.podium_results FOR ALL
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS "Super admins manage tournament groups" ON public.tournament_groups;
CREATE POLICY "Super admins manage tournament groups"
  ON public.tournament_groups FOR ALL
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS "Super admins manage records" ON public.records;
CREATE POLICY "Super admins manage records"
  ON public.records FOR ALL
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- 5.4 Audit Logs
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
