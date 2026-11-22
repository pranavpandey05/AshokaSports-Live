-- ==============================================================================
-- AshokaSports Live — Row-Level Security (RLS) Policies
-- Ashoka Institute of Technology and Management (AITM), Varanasi
-- Session 2026-27 • Tamper-Proof Security for Official College Sports Meet
-- ==============================================================================

-- ==============================================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==============================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE podium_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. SECURITY HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ==============================================================================

-- Helper: Check if current authenticated user has 'super_admin' or 'admin' privileges
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
      AND role IN ('super_admin', 'admin')
  );
$$;

-- Helper: Check if current authenticated user is an authorized ground scorer or super admin
CREATE OR REPLACE FUNCTION public.is_scorer_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('scorer', 'super_admin', 'admin')
  );
$$;

-- Helper: Check if a match is unlocked
CREATE OR REPLACE FUNCTION public.is_match_unlocked(target_match_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = target_match_id
      AND is_locked = false
  );
$$;

-- ==============================================================================
-- 3. PUBLIC READ POLICIES (anon & authenticated)
-- ==============================================================================

-- 3.1 Departments: Public Read
DROP POLICY IF EXISTS "Public can view departments" ON departments;
CREATE POLICY "Public can view departments"
  ON departments FOR SELECT
  TO public
  USING (true);

-- 3.2 Sports: Public Read
DROP POLICY IF EXISTS "Public can view sports" ON sports;
CREATE POLICY "Public can view sports"
  ON sports FOR SELECT
  TO public
  USING (true);

-- 3.3 Tournament Groups: Public Read
DROP POLICY IF EXISTS "Public can view tournament groups" ON tournament_groups;
CREATE POLICY "Public can view tournament groups"
  ON tournament_groups FOR SELECT
  TO public
  USING (true);

-- 3.4 Players: Public Read (Name, Roll No, Dept only - no phone/email in schema)
DROP POLICY IF EXISTS "Public can view players" ON players;
CREATE POLICY "Public can view players"
  ON players FOR SELECT
  TO public
  USING (true);

-- 3.5 Matches: Public Read
DROP POLICY IF EXISTS "Public can view matches" ON matches;
CREATE POLICY "Public can view matches"
  ON matches FOR SELECT
  TO public
  USING (true);

-- 3.6 Match Lineups: Public Read
DROP POLICY IF EXISTS "Public can view match lineups" ON match_lineups;
CREATE POLICY "Public can view match lineups"
  ON match_lineups FOR SELECT
  TO public
  USING (true);

-- 3.7 Match Player Stats: Public Read
DROP POLICY IF EXISTS "Public can view match player stats" ON match_player_stats;
CREATE POLICY "Public can view match player stats"
  ON match_player_stats FOR SELECT
  TO public
  USING (true);

-- 3.8 Points Table: Public Read
DROP POLICY IF EXISTS "Public can view points table" ON points_table;
CREATE POLICY "Public can view points table"
  ON points_table FOR SELECT
  TO public
  USING (true);

-- 3.9 Podium Results: Public Read
DROP POLICY IF EXISTS "Public can view podium results" ON podium_results;
CREATE POLICY "Public can view podium results"
  ON podium_results FOR SELECT
  TO public
  USING (true);

-- 3.10 Records: Public Read
DROP POLICY IF EXISTS "Public can view records" ON records;
CREATE POLICY "Public can view records"
  ON records FOR SELECT
  TO public
  USING (true);

-- ==============================================================================
-- 4. MATCHES & LIVE SCORING WRITE POLICIES (Ground Volunteer & Super Admin)
-- ==============================================================================

-- 4.1 Matches Insert: Super Admin & Authorized Scorer
DROP POLICY IF EXISTS "Authorized scorers and admins can insert matches" ON matches;
CREATE POLICY "Authorized scorers and admins can insert matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_scorer_or_admin());

-- 4.2 Matches Update:
-- Super Admin can always update;
-- Ground Scorer can only update UNLOCKED matches (is_locked = false).
DROP POLICY IF EXISTS "Scorers can update unlocked matches; Admins can update all" ON matches;
CREATE POLICY "Scorers can update unlocked matches; Admins can update all"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_scorer_or_admin() AND is_locked = false)
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_scorer_or_admin() AND is_locked = false)
  );

-- 4.3 Matches Delete: Super Admin only
DROP POLICY IF EXISTS "Super admins can delete matches" ON matches;
CREATE POLICY "Super admins can delete matches"
  ON matches FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ==============================================================================
-- 5. MATCH LINEUPS & PLAYER STATS WRITE POLICIES
-- ==============================================================================

-- 5.1 Match Lineups: Insert & Update allowed only if match is unlocked (or super_admin)
DROP POLICY IF EXISTS "Scorers can manage lineups for unlocked matches" ON match_lineups;
CREATE POLICY "Scorers can manage lineups for unlocked matches"
  ON match_lineups FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_scorer_or_admin() AND public.is_match_unlocked(match_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_scorer_or_admin() AND public.is_match_unlocked(match_id))
  );

-- 5.2 Match Player Stats: Insert & Update allowed only if match is unlocked (or super_admin)
DROP POLICY IF EXISTS "Scorers can manage stats for unlocked matches" ON match_player_stats;
CREATE POLICY "Scorers can manage stats for unlocked matches"
  ON match_player_stats FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_scorer_or_admin() AND public.is_match_unlocked(match_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_scorer_or_admin() AND public.is_match_unlocked(match_id))
  );

-- 5.3 Points Table: Scorers and Admins can update league points
DROP POLICY IF EXISTS "Scorers and Admins can update points table" ON points_table;
CREATE POLICY "Scorers and Admins can update points table"
  ON points_table FOR ALL
  TO authenticated
  USING (public.is_scorer_or_admin())
  WITH CHECK (public.is_scorer_or_admin());

-- 5.4 Players Quick-Add: Scorers and Admins can insert verified student athletes
DROP POLICY IF EXISTS "Scorers and Admins can insert players" ON players;
CREATE POLICY "Scorers and Admins can insert players"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (public.is_scorer_or_admin());

DROP POLICY IF EXISTS "Admins can update and delete players" ON players;
CREATE POLICY "Admins can update and delete players"
  ON players FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admins can delete players" ON players;
CREATE POLICY "Admins can delete players"
  ON players FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ==============================================================================
-- 6. STRICT SUPER ADMIN EXCLUSIVE TABLES
-- ==============================================================================

-- 6.1 Departments Write Access: Super Admin only
DROP POLICY IF EXISTS "Super admins manage departments" ON departments;
CREATE POLICY "Super admins manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 6.2 Sports Write Access: Super Admin only
DROP POLICY IF EXISTS "Super admins manage sports" ON sports;
CREATE POLICY "Super admins manage sports"
  ON sports FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 6.3 Tournament Groups Write Access: Super Admin only
DROP POLICY IF EXISTS "Super admins manage tournament groups" ON tournament_groups;
CREATE POLICY "Super admins manage tournament groups"
  ON tournament_groups FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 6.4 Podium Results Write Access: Super Admin only
DROP POLICY IF EXISTS "Super admins manage podium results" ON podium_results;
CREATE POLICY "Super admins manage podium results"
  ON podium_results FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 6.5 Records Write Access: Super Admin only
DROP POLICY IF EXISTS "Super admins manage records" ON records;
CREATE POLICY "Super admins manage records"
  ON records FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 6.6 User Roles: Super Admin full control; Users can view own role
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage user roles" ON user_roles;
CREATE POLICY "Super admins manage user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ==============================================================================
-- 7. SYSTEM AUDIT LOGS
-- ==============================================================================

-- Scorers and Admins can write audit entries
DROP POLICY IF EXISTS "Scorers and Admins can insert audit logs" ON audit_logs;
CREATE POLICY "Scorers and Admins can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_scorer_or_admin());

-- Only Super Admins can inspect audit logs (Tamper-evident transparency)
DROP POLICY IF EXISTS "Only Super Admins can inspect audit logs" ON audit_logs;
CREATE POLICY "Only Super Admins can inspect audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin());
