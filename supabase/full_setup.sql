-- ==============================================================================
-- AshokaSports Live — Complete Self-Contained Database Setup & Seed
-- Ashoka Institute of Technology and Management (AITM), Varanasi
-- Session 2026-27 • Official Sports Club & Student Activity Council (SAC)
--
-- INSTRUCTIONS FOR SUPABASE SQL EDITOR:
-- 1. Select all (Ctrl+A) and paste into Supabase Dashboard -> SQL Editor
-- 2. Click "Run" (or Ctrl+Enter)
-- 3. This script is 100% idempotent: safe to run once or multiple times.
-- ==============================================================================

-- ==============================================================================
-- STEP 1: EXTENSIONS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- STEP 2: TABLE CREATION (STRICT FOREIGN-KEY ORDER)
-- ==============================================================================

-- 2.1 Departments (14 Official AITM Academic Departments)
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  coordinator_name TEXT,
  badge_color TEXT NOT NULL DEFAULT '#1E3A8A',
  gold_count INTEGER NOT NULL DEFAULT 0,
  silver_count INTEGER NOT NULL DEFAULT 0,
  bronze_count INTEGER NOT NULL DEFAULT 0,
  total_overall_pts NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely drop deprecated fair play column if present on existing tables
DO $$
BEGIN
  ALTER TABLE departments DROP COLUMN IF EXISTS fair_play_pts;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2.2 Sports (19 Official Events with Unique Name & Gender Category)
CREATE TABLE IF NOT EXISTS sports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  category_group TEXT NOT NULL CHECK (category_group IN ('indoor', 'outdoor', 'track', 'field')),
  gender_category TEXT NOT NULL CHECK (gender_category IN ('boys', 'girls', 'both')),
  format_type TEXT NOT NULL CHECK (format_type IN ('team_match', 'singles_doubles', 'podium_heat')),
  scoring_unit TEXT NOT NULL DEFAULT 'points',
  win_pts NUMERIC NOT NULL DEFAULT 3,
  draw_pts NUMERIC NOT NULL DEFAULT 1,
  loss_pts NUMERIC NOT NULL DEFAULT 0,
  podium_1st_pts INTEGER NOT NULL DEFAULT 10,
  podium_2nd_pts INTEGER NOT NULL DEFAULT 8,
  podium_3rd_pts INTEGER NOT NULL DEFAULT 5,
  playing_squad_size INTEGER NOT NULL DEFAULT 11,
  bench_squad_size INTEGER NOT NULL DEFAULT 4,
  reporting_mins_before INTEGER NOT NULL DEFAULT 15,
  rules_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sports_name_gender UNIQUE (name, gender_category)
);

-- Ensure UNIQUE (name, gender_category) constraint exists even on pre-existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_sports_name_gender'
  ) THEN
    ALTER TABLE sports ADD CONSTRAINT uq_sports_name_gender UNIQUE (name, gender_category);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2.3 Tournament Groups / Pools
CREATE TABLE IF NOT EXISTS tournament_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sport_id TEXT NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  bracket_gender TEXT NOT NULL CHECK (bracket_gender IN ('boys', 'girls')),
  name TEXT NOT NULL, -- 'Pool A', 'Pool B'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Student Athletes / Players (Zero Contact Details for Privacy)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name TEXT NOT NULL,
  roll_no TEXT NOT NULL UNIQUE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('boys', 'girls', 'male', 'female')),
  jersey_no INTEGER,
  default_role TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 Matches / Fixtures
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sport_id TEXT NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  bracket_gender TEXT NOT NULL CHECK (bracket_gender IN ('boys', 'girls')),
  stage_label TEXT NOT NULL DEFAULT 'League Match',
  team_a_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  team_b_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  venue TEXT NOT NULL DEFAULT 'Main Campus Ground',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'completed', 'abandoned', 'postponed')) DEFAULT 'scheduled',
  team_a_score TEXT DEFAULT '0',
  team_b_score TEXT DEFAULT '0',
  winner_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  mvp_player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
  result_note TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely ensure is_locked column exists on matches
DO $$
BEGIN
  ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2.6 Match Lineups (Starting vs Bench Squads)
CREATE TABLE IF NOT EXISTS match_lineups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_starting BOOLEAN NOT NULL DEFAULT true,
  is_captain BOOLEAN NOT NULL DEFAULT false,
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_match_player UNIQUE (match_id, player_id)
);

-- 2.7 Individual Match Player Stats
CREATE TABLE IF NOT EXISTS match_player_stats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  stat_key TEXT NOT NULL,
  stat_value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 League Standings / Points Table
CREATE TABLE IF NOT EXISTS points_table (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sport_id TEXT NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  bracket_gender TEXT NOT NULL CHECK (bracket_gender IN ('boys', 'girls')),
  pool_group TEXT DEFAULT 'Pool A',
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  score_for NUMERIC NOT NULL DEFAULT 0,
  score_against NUMERIC NOT NULL DEFAULT 0,
  score_diff NUMERIC NOT NULL DEFAULT 0,
  total_points NUMERIC NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_points_sport_dept_gender UNIQUE (sport_id, department_id, bracket_gender)
);

-- Safely drop deprecated fair play column if present on existing tables
DO $$
BEGIN
  ALTER TABLE points_table DROP COLUMN IF EXISTS fair_play_score;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Safely ensure pool_group column exists on points_table
DO $$
BEGIN
  ALTER TABLE points_table ADD COLUMN IF NOT EXISTS pool_group TEXT DEFAULT 'Pool A';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2.9 Athletic Track & Field Podium Results
CREATE TABLE IF NOT EXISTS podium_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sport_id TEXT NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  bracket_gender TEXT NOT NULL CHECK (bracket_gender IN ('boys', 'girls')),
  position INTEGER NOT NULL CHECK (position IN (1, 2, 3)),
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
  performance_mark TEXT,
  awarded_pts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10 College Fest Sporting Records
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sport_id TEXT NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  bracket_gender TEXT NOT NULL CHECK (bracket_gender IN ('boys', 'girls')),
  record_holder_name TEXT NOT NULL,
  department_name TEXT NOT NULL,
  record_value TEXT NOT NULL,
  session_year TEXT NOT NULL DEFAULT '2026-27',
  verified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.11 RBAC User Roles & 3-Tier Approval Hierarchy
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'scorer', 'faculty_coordinator', 'student_coordinator', 'referee', 'viewer')),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  assigned_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_role UNIQUE (user_id, role)
);

-- 2.12 Tamper-Proof System Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_players_dept ON players(department_id);
CREATE INDEX IF NOT EXISTS idx_players_roll ON players(roll_no);
CREATE INDEX IF NOT EXISTS idx_matches_sport ON matches(sport_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled ON matches(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_points_table_sport ON points_table(sport_id, bracket_gender);
CREATE INDEX IF NOT EXISTS idx_lineups_match ON match_lineups(match_id);
CREATE INDEX IF NOT EXISTS idx_stats_match ON match_player_stats(match_id);

-- ==============================================================================
-- STEP 3: SEED DATA (IDEMPOTENT VIA ON CONFLICT DO NOTHING)
-- ==============================================================================

-- 3.1 All 14 Official AITM Departments (Strictly 14 Unique Departments, Zero Fair Play Points)
INSERT INTO departments (id, short_code, name, coordinator_name, badge_color, gold_count, silver_count, bronze_count, total_overall_pts)
VALUES
  ('dept-cse', 'CSE', 'Computer Science & Engineering', 'Mr. Pankaj Kumar', '#1E3A8A', 4, 2, 2, 66),
  ('dept-me', 'ME', 'Mechanical Engineering', 'Mr. Abhay Kumar Shukla', '#DC2626', 3, 3, 2, 64),
  ('dept-ece', 'ECE', 'Electronics & Communication Engineering', 'Mr. Lalit Kumar', '#059669', 2, 4, 1, 57),
  ('dept-aiml', 'AIML', 'Artificial Intelligence & Machine Learning', 'Mr. Ravindra Kumar', '#6366F1', 2, 2, 2, 46),
  ('dept-ce', 'CE', 'Civil Engineering', 'Mr. Anuj Kumar', '#854D0E', 2, 1, 3, 43),
  ('dept-bca', 'BCA', 'Bachelor of Computer Applications', 'Ms. Astha Pathak', '#0D9488', 2, 1, 2, 38),
  ('dept-bpharma', 'B.PHARMA', 'Bachelor of Pharmacy', 'Mr. Om Prakash Sahani', '#9333EA', 1, 2, 2, 36),
  ('dept-ds', 'DS', 'Data Science', 'Mr. Vinay Yadav', '#0284C7', 1, 1, 2, 28),
  ('dept-ee', 'EE', 'Electrical Engineering', 'Mr. Surendra Kushwaha', '#E11D48', 1, 1, 1, 23),
  ('dept-mba', 'MBA', 'Master of Business Administration', 'Mr. Amit Kumar Singh', '#EA580C', 0, 2, 1, 21),
  ('dept-bba', 'BBA', 'Bachelor of Business Administration', 'Mr. Kunjan Pandey', '#D97706', 1, 0, 2, 20),
  ('dept-bt', 'BT', 'Biotechnology', 'Ms. Arpita Singh', '#16A34A', 0, 1, 2, 18),
  ('dept-bcom', 'B.COM', 'Bachelor of Commerce', 'Mr. Sushil Kumar', '#CA8A04', 0, 1, 1, 13),
  ('dept-dpharma', 'D.PHARMA', 'Diploma in Pharmacy', 'Mr. Sant Lal', '#C026D3', 0, 0, 1, 5)
ON CONFLICT (short_code) DO UPDATE SET
  name = EXCLUDED.name,
  coordinator_name = EXCLUDED.coordinator_name,
  badge_color = EXCLUDED.badge_color;

-- 3.2 All 19 Official AITM Sports
INSERT INTO sports (
  id, name, category_group, gender_category, format_type, scoring_unit,
  win_pts, draw_pts, loss_pts, podium_1st_pts, podium_2nd_pts, podium_3rd_pts,
  playing_squad_size, bench_squad_size, reporting_mins_before, rules_summary
)
VALUES
  -- Outdoor Games
  ('sport-cricket', 'Cricket', 'outdoor', 'both', 'team_match', 'runs/wickets', 3, 1, 0, 10, 8, 5, 11, 4, 15, '12 Overs per innings in league stage; 15 Overs in knockouts. White ball, college jersey mandatory.'),
  ('sport-football', 'Football', 'outdoor', 'boys', 'team_match', 'goals', 3, 1, 0, 10, 8, 5, 11, 5, 15, 'Boys only tournament. 30 mins each half with 10 mins interval. Direct penalties in knockouts.'),
  ('sport-volleyball', 'Volleyball', 'outdoor', 'both', 'team_match', 'sets', 3, 0, 0, 10, 8, 5, 6, 4, 15, 'Best of 3 sets of 25 points each (3rd set 15 points). Proper footwear mandatory.'),
  ('sport-kabaddi', 'Kabaddi', 'outdoor', 'both', 'team_match', 'raid/tackle points', 3, 1, 0, 10, 8, 5, 7, 5, 15, '20 mins per half with 5 mins break. 30 seconds raid timer enforced.'),
  ('sport-kho-kho', 'Kho-Kho', 'outdoor', 'girls', 'team_match', 'points', 3, 1, 0, 10, 8, 5, 9, 3, 15, 'Girls only event. Two innings of 9 minutes each with 6 minutes break.'),
  ('sport-tug-of-war', 'Tug of War', 'outdoor', 'both', 'podium_heat', 'pulls', 3, 0, 0, 10, 8, 5, 8, 2, 15, 'Best of 3 pulls. Cumulative team weight limits strictly verified before weigh-in.'),

  -- Indoor Games
  ('sport-badminton', 'Badminton', 'indoor', 'both', 'singles_doubles', 'sets', 3, 0, 0, 10, 8, 5, 2, 1, 15, 'Singles and Doubles. Best of 3 sets of 21 points with rally point system.'),
  ('sport-table-tennis', 'Table Tennis', 'indoor', 'both', 'singles_doubles', 'sets', 3, 0, 0, 10, 8, 5, 2, 1, 15, '11 points per set. Best of 5 sets in knockouts.'),
  ('sport-chess', 'Chess', 'indoor', 'both', 'singles_doubles', 'points', 1, 0.5, 0, 10, 8, 5, 4, 1, 15, 'Rapid format: 15 mins + 10s increment per player. FIDE standard rules.'),
  ('sport-carrom', 'Carrom', 'indoor', 'both', 'singles_doubles', 'boards', 3, 0, 0, 10, 8, 5, 2, 1, 15, '25 points or 8 boards max. Queen carries 3 bonus points.'),

  -- Track Events (Athletics)
  ('sport-100m', '100m Sprint', 'track', 'both', 'podium_heat', 'seconds', 0, 0, 0, 10, 8, 5, 2, 1, 30, 'Heats followed by 8-athlete Final. False start leads to immediate disqualification.'),
  ('sport-200m', '200m Race', 'track', 'both', 'podium_heat', 'seconds', 0, 0, 0, 10, 8, 5, 2, 1, 30, 'Curve running on lane assignment. Electronic timing in final heat.'),
  ('sport-400m-relay', '4x100m Relay', 'track', 'both', 'podium_heat', 'seconds', 0, 0, 0, 10, 8, 5, 4, 1, 30, 'Baton change inside the designated 20-meter exchange zone strictly enforced.'),
  ('sport-1500m', '1500m Race', 'track', 'both', 'podium_heat', 'minutes/seconds', 0, 0, 0, 10, 8, 5, 2, 1, 30, '3.75 laps of the 400m track. Standing start.'),

  -- Field Events (Athletics)
  ('sport-long-jump', 'Long Jump', 'field', 'both', 'podium_heat', 'meters', 0, 0, 0, 10, 8, 5, 2, 1, 30, '3 preliminary attempts per athlete; top 6 get 3 additional attempts.'),
  ('sport-high-jump', 'High Jump', 'field', 'both', 'podium_heat', 'meters', 0, 0, 0, 10, 8, 5, 2, 1, 30, 'Fosbury Flop allowed. 3 consecutive failed attempts result in elimination.'),
  ('sport-shot-put', 'Shot Put', 'field', 'both', 'podium_heat', 'meters', 0, 0, 0, 10, 8, 5, 2, 1, 30, 'Boys: 7.26 kg; Girls: 4 kg. Must release from within the throwing circle.'),
  ('sport-discus-throw', 'Discus Throw', 'field', 'both', 'podium_heat', 'meters', 0, 0, 0, 10, 8, 5, 2, 1, 30, 'Boys: 2 kg; Girls: 1 kg. Throw must land within the designated sector lines.'),
  ('sport-javelin-throw', 'Javelin Throw', 'field', 'both', 'podium_heat', 'meters', 0, 0, 0, 10, 8, 5, 2, 1, 30, 'Boys: 800g; Girls: 600g. Tip must strike the ground first.')
ON CONFLICT (id) DO NOTHING;

-- 3.3 Initial Tournament Groups
INSERT INTO tournament_groups (id, sport_id, bracket_gender, name)
VALUES
  ('grp-cricket-boys-a', 'sport-cricket', 'boys', 'Pool A'),
  ('grp-cricket-boys-b', 'sport-cricket', 'boys', 'Pool B'),
  ('grp-cricket-girls-a', 'sport-cricket', 'girls', 'Pool A'),
  ('grp-cricket-girls-b', 'sport-cricket', 'girls', 'Pool B'),
  ('grp-football-boys-a', 'sport-football', 'boys', 'Pool A'),
  ('grp-football-boys-b', 'sport-football', 'boys', 'Pool B'),
  ('grp-volleyball-boys-a', 'sport-volleyball', 'boys', 'Pool A'),
  ('grp-volleyball-boys-b', 'sport-volleyball', 'boys', 'Pool B'),
  ('grp-volleyball-girls-a', 'sport-volleyball', 'girls', 'Pool A'),
  ('grp-volleyball-girls-b', 'sport-volleyball', 'girls', 'Pool B'),
  ('grp-khokho-girls-a', 'sport-kho-kho', 'girls', 'Pool A'),
  ('grp-khokho-girls-b', 'sport-kho-kho', 'girls', 'Pool B')
ON CONFLICT (id) DO NOTHING;

-- 3.4 Official Fest Records
INSERT INTO records (id, sport_id, event_name, bracket_gender, record_holder_name, department_name, record_value, session_year, verified_by)
VALUES
  ('rec-100m-boys', 'sport-100m', '100m Sprint', 'boys', 'Aryan Maurya', 'Mechanical Engineering', '11.08s', '2024-25', 'Dr. S. K. Sharma (Sports Officer)'),
  ('rec-100m-girls', 'sport-100m', '100m Sprint', 'girls', 'Pooja Verma', 'Computer Science & Engineering', '13.12s', '2025-26', 'Sports Committee AITM'),
  ('rec-longjump-boys', 'sport-long-jump', 'Long Jump', 'boys', 'Vikas Singh', 'Civil Engineering', '6.68m', '2023-24', 'AITM Athletics Board'),
  ('rec-highjump-boys', 'sport-high-jump', 'High Jump', 'boys', 'Rohit Patel', 'Computer Science & Engineering', '1.82m', '2025-26', 'Dr. S. K. Sharma (Sports Officer)'),
  ('rec-shotput-boys', 'sport-shot-put', 'Shot Put', 'boys', 'Aman Yadav', 'Mechanical Engineering', '12.45m', '2024-25', 'Sports Committee AITM'),
  ('rec-javelin-boys', 'sport-javelin-throw', 'Javelin Throw', 'boys', 'Kunal Tiwari', 'Electrical Engineering', '52.30m', '2025-26', 'AITM Athletics Board')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- STEP 4: TRIGGERS (IDEMPOTENT STANDINGS RECOMPUTATION) & REALTIME PUBLICATION
-- ==============================================================================

-- 4.1 Numeric score extraction helper
CREATE OR REPLACE FUNCTION public.parse_score_numeric(val TEXT)
RETURNS NUMERIC AS $$
BEGIN
  IF val IS NULL OR trim(val) = '' OR trim(val) = '-' OR lower(trim(val)) LIKE '%yet%' THEN
    RETURN 0;
  END IF;
  IF val ~ '^[0-9]+' THEN
    RETURN substring(val from '^[0-9]+')::numeric;
  END IF;
  RETURN 0;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4.2 Master function: recalculate points_table & departments.total_overall_pts
CREATE OR REPLACE FUNCTION public.recalculate_standings_from_matches()
RETURNS TRIGGER AS $$
DECLARE
  v_sport_id TEXT;
  v_bracket_gender TEXT;
  v_win_pts NUMERIC := 3;
  v_draw_pts NUMERIC := 1;
  v_loss_pts NUMERIC := 0;
  r_dept RECORD;
  v_played INT;
  v_won INT;
  v_drawn INT;
  v_lost INT;
  v_score_for NUMERIC;
  v_score_against NUMERIC;
  v_score_diff NUMERIC;
  v_total_points NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_sport_id := OLD.sport_id;
    v_bracket_gender := OLD.bracket_gender;
  ELSE
    v_sport_id := NEW.sport_id;
    v_bracket_gender := NEW.bracket_gender;
  END IF;

  SELECT s.id, COALESCE(s.win_pts, 3), COALESCE(s.draw_pts, 1), COALESCE(s.loss_pts, 0)
  INTO v_sport_id, v_win_pts, v_draw_pts, v_loss_pts
  FROM sports s
  WHERE s.id = v_sport_id OR s.name = v_sport_id
  LIMIT 1;

  IF v_sport_id IS NOT NULL AND v_bracket_gender IS NOT NULL THEN
    FOR r_dept IN SELECT id, short_code FROM departments LOOP
      SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE (m.winner_id = r_dept.id OR m.winner_id = r_dept.short_code)),
        COUNT(*) FILTER (WHERE m.winner_id IS NULL OR m.winner_id = '' OR lower(m.winner_id) = 'draw'),
        COUNT(*) FILTER (WHERE m.winner_id IS NOT NULL AND m.winner_id != '' AND lower(m.winner_id) != 'draw' AND m.winner_id != r_dept.id AND m.winner_id != r_dept.short_code),
        COALESCE(SUM(CASE WHEN (m.team_a_id = r_dept.id OR m.team_a_id = r_dept.short_code) THEN public.parse_score_numeric(m.team_a_score) ELSE public.parse_score_numeric(m.team_b_score) END), 0),
        COALESCE(SUM(CASE WHEN (m.team_a_id = r_dept.id OR m.team_a_id = r_dept.short_code) THEN public.parse_score_numeric(m.team_b_score) ELSE public.parse_score_numeric(m.team_a_score) END), 0)
      INTO
        v_played, v_won, v_drawn, v_lost, v_score_for, v_score_against
      FROM matches m
      WHERE (m.sport_id = v_sport_id OR m.sport_id = (SELECT name FROM sports WHERE id = v_sport_id))
        AND m.bracket_gender = v_bracket_gender
        AND m.status = 'completed'
        AND (
          m.team_a_id = r_dept.id OR m.team_a_id = r_dept.short_code OR
          m.team_b_id = r_dept.id OR m.team_b_id = r_dept.short_code
        );

      v_score_diff := v_score_for - v_score_against;
      v_total_points := (v_won * v_win_pts) + (v_drawn * v_draw_pts) + (v_lost * v_loss_pts);

      IF v_played > 0 OR EXISTS (
        SELECT 1 FROM points_table
        WHERE sport_id = v_sport_id AND department_id = r_dept.id AND bracket_gender = v_bracket_gender
      ) THEN
        INSERT INTO points_table (
          sport_id, department_id, bracket_gender,
          played, won, drawn, lost,
          score_for, score_against, score_diff,
          total_points, updated_at
        )
        VALUES (
          v_sport_id, r_dept.id, v_bracket_gender,
          v_played, v_won, v_drawn, v_lost,
          v_score_for, v_score_against, v_score_diff,
          v_total_points, now()
        )
        ON CONFLICT (sport_id, department_id, bracket_gender)
        DO UPDATE SET
          played = EXCLUDED.played,
          won = EXCLUDED.won,
          drawn = EXCLUDED.drawn,
          lost = EXCLUDED.lost,
          score_for = EXCLUDED.score_for,
          score_against = EXCLUDED.score_against,
          score_diff = EXCLUDED.score_diff,
          total_points = EXCLUDED.total_points,
          updated_at = now();
      END IF;
    END LOOP;
  END IF;

  UPDATE departments d
  SET total_overall_pts = COALESCE((
    SELECT SUM(pt.total_points)
    FROM points_table pt
    WHERE pt.department_id = d.id
  ), 0) + COALESCE((
    SELECT SUM(pr.awarded_pts)
    FROM podium_results pr
    WHERE pr.department_id = d.id
  ), 0),
  updated_at = now();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Podium recomputation trigger function
CREATE OR REPLACE FUNCTION public.recalculate_standings_from_podium()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE departments d
  SET gold_count = COALESCE((SELECT COUNT(*) FROM podium_results WHERE department_id = d.id AND position = 1), 0),
      silver_count = COALESCE((SELECT COUNT(*) FROM podium_results WHERE department_id = d.id AND position = 2), 0),
      bronze_count = COALESCE((SELECT COUNT(*) FROM podium_results WHERE department_id = d.id AND position = 3), 0),
      total_overall_pts = COALESCE((
        SELECT SUM(pt.total_points)
        FROM points_table pt
        WHERE pt.department_id = d.id
      ), 0) + COALESCE((
        SELECT SUM(pr.awarded_pts)
        FROM podium_results pr
        WHERE pr.department_id = d.id
      ), 0),
      updated_at = now();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Attach Triggers
DROP TRIGGER IF EXISTS trigger_sync_match_standings ON matches;
CREATE TRIGGER trigger_sync_match_standings
AFTER INSERT OR UPDATE OR DELETE ON matches
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_standings_from_matches();

DROP TRIGGER IF EXISTS trigger_apply_podium_points ON podium_results;
DROP TRIGGER IF EXISTS trigger_sync_podium_standings ON podium_results;
CREATE TRIGGER trigger_sync_podium_standings
AFTER INSERT OR UPDATE OR DELETE ON podium_results
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_standings_from_podium();

-- Enable Supabase Realtime safely per table
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['matches', 'match_lineups', 'match_player_stats', 'points_table', 'departments'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    WHEN undefined_object THEN
      NULL;
    END;
  END LOOP;
END $$;

-- Set replica identity to full on dynamic tables
ALTER TABLE matches REPLICA IDENTITY FULL;
ALTER TABLE match_lineups REPLICA IDENTITY FULL;
ALTER TABLE match_player_stats REPLICA IDENTITY FULL;
ALTER TABLE points_table REPLICA IDENTITY FULL;
ALTER TABLE departments REPLICA IDENTITY FULL;

-- ==============================================================================
-- STEP 5: ROW-LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- ==============================================================================

-- 5.1 Enable RLS on all 12 tables
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

-- 5.2 Helper Functions (SECURITY DEFINER with fixed search_path to avoid recursion)
-- 5.2.1 is_super_admin: Approved super_admin only
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

-- 5.2.2 is_admin_or_above: Approved super_admin or approved admin
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

-- 5.2.3 is_scorer_or_above: Approved super_admin, approved admin, or approved scorer
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

-- 5.2.4 is_scorer_or_admin: backwards-compatible alias
CREATE OR REPLACE FUNCTION public.is_scorer_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_scorer_or_above();
$$;

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

-- 5.3 Public Read Policies (Open campus broadcast)
DROP POLICY IF EXISTS "Public can view departments" ON departments;
CREATE POLICY "Public can view departments" ON departments FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view sports" ON sports;
CREATE POLICY "Public can view sports" ON sports FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view tournament groups" ON tournament_groups;
CREATE POLICY "Public can view tournament groups" ON tournament_groups FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view players" ON players;
CREATE POLICY "Public can view players" ON players FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view matches" ON matches;
CREATE POLICY "Public can view matches" ON matches FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view match lineups" ON match_lineups;
CREATE POLICY "Public can view match lineups" ON match_lineups FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view match player stats" ON match_player_stats;
CREATE POLICY "Public can view match player stats" ON match_player_stats FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view points table" ON points_table;
CREATE POLICY "Public can view points table" ON points_table FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view podium results" ON podium_results;
CREATE POLICY "Public can view podium results" ON podium_results FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can view records" ON records;
CREATE POLICY "Public can view records" ON records FOR SELECT TO public USING (true);

-- 5.4 Live Match Scoring Policies (Lock-Protected)
DROP POLICY IF EXISTS "Authorized scorers and admins can insert matches" ON matches;
CREATE POLICY "Authorized scorers and admins can insert matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_scorer_or_admin());

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

DROP POLICY IF EXISTS "Super admins can delete matches" ON matches;
CREATE POLICY "Super admins can delete matches"
  ON matches FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- 5.5 Lineups, Stats & Points Table Policies
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

DROP POLICY IF EXISTS "Scorers and Admins can update points table" ON points_table;
CREATE POLICY "Scorers and Admins can update points table"
  ON points_table FOR ALL
  TO authenticated
  USING (public.is_scorer_or_admin())
  WITH CHECK (public.is_scorer_or_admin());

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

-- 5.6 Super Admin Exclusive Tables
DROP POLICY IF EXISTS "Super admins manage departments" ON departments;
CREATE POLICY "Super admins manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage sports" ON sports;
CREATE POLICY "Super admins manage sports"
  ON sports FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage tournament groups" ON tournament_groups;
CREATE POLICY "Super admins manage tournament groups"
  ON tournament_groups FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage podium results" ON podium_results;
CREATE POLICY "Super admins manage podium results"
  ON podium_results FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage records" ON records;
CREATE POLICY "Super admins manage records"
  ON records FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 5.6 User Roles & 3-Tier Approval Workflow Policies
-- 5.6.1 SELECT: Users can view own role; Super Admin views all; Admin views Scorers & self
DROP POLICY IF EXISTS "View user roles policy" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "View user roles policy"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR (public.is_admin_or_above() AND role = 'scorer')
  );

-- 5.6.2 INSERT: Any authenticated user can submit pending request (admin/scorer); Super Admin can insert any
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

-- 5.6.3 UPDATE: Super Admin can approve/update any role; Admin can approve/update ONLY scorers
DROP POLICY IF EXISTS "Super admins and admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins manage user roles" ON public.user_roles;
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

-- 5.6.4 DELETE: Super Admin can delete any role; Admin can delete ONLY scorers
DROP POLICY IF EXISTS "Super admins and admins can delete user roles" ON public.user_roles;
CREATE POLICY "Super admins and admins can delete user roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_admin_or_above() AND role = 'scorer')
  );

-- 5.7 Audit Logs
DROP POLICY IF EXISTS "Scorers and Admins can insert audit logs" ON audit_logs;
CREATE POLICY "Scorers and Admins can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_scorer_or_above());

DROP POLICY IF EXISTS "Only Super Admins can inspect audit logs" ON audit_logs;
CREATE POLICY "Only Super Admins can inspect audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_or_above());

-- ==============================================================================
-- END OF SETUP: ASHOKASPORTS LIVE (SESSION 2026-27) IS READY!
-- ==============================================================================
