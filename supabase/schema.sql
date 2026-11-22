-- ==============================================================================
-- AshokaSports Live — Complete PostgreSQL Database Schema & Seed Data
-- Ashoka Institute of Technology and Management (AITM), Varanasi
-- Ashoka Sports Club & Student Activity Council (SAC) — Session 2026-27
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLE DEFINITIONS
-- ==============================================================================

-- 1.1 Departments (14 Official AITM Academic Departments)
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  coordinator_name TEXT,
  badge_color TEXT NOT NULL DEFAULT '#1E3A8A',
  gold_count INTEGER NOT NULL DEFAULT 0,
  silver_count INTEGER NOT NULL DEFAULT 0,
  bronze_count INTEGER NOT NULL DEFAULT 0,
  fair_play_pts NUMERIC NOT NULL DEFAULT 100,
  total_overall_pts NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Sports / Athletic Events (19 Official Events)
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Tournament Groups / Pools
CREATE TABLE IF NOT EXISTS tournament_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sport_id TEXT NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  bracket_gender TEXT NOT NULL CHECK (bracket_gender IN ('boys', 'girls')),
  name TEXT NOT NULL, -- e.g., 'Pool A', 'Pool B'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Student Athletes / Players (Zero Contact Details for Privacy)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name TEXT NOT NULL,
  roll_no TEXT NOT NULL UNIQUE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL, -- '1', '2', '3', '4' or 'Yr 1', etc.
  gender TEXT NOT NULL CHECK (gender IN ('boys', 'girls', 'male', 'female')),
  jersey_no INTEGER,
  default_role TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.5 Matches / Fixtures
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

-- 1.6 Match Lineups (Starting vs Bench Squads)
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

-- 1.7 Individual Match Player Stats
CREATE TABLE IF NOT EXISTS match_player_stats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  stat_key TEXT NOT NULL,
  stat_value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.8 League Standings / Points Table
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
  fair_play_score NUMERIC NOT NULL DEFAULT 100,
  total_points NUMERIC NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_points_sport_dept_gender UNIQUE (sport_id, department_id, bracket_gender)
);

-- 1.9 Athletic Track & Field Podium Results
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

-- 1.10 College Fest Sporting Records
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

-- 1.11 RBAC User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'scorer', 'faculty_coordinator', 'student_coordinator', 'referee', 'viewer', 'admin')),
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  assigned_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_role UNIQUE (user_id, role)
);

-- 1.12 Tamper-Proof System Audit Logs
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_dept ON players(department_id);
CREATE INDEX IF NOT EXISTS idx_players_roll ON players(roll_no);
CREATE INDEX IF NOT EXISTS idx_matches_sport ON matches(sport_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled ON matches(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_points_table_sport ON points_table(sport_id, bracket_gender);
CREATE INDEX IF NOT EXISTS idx_lineups_match ON match_lineups(match_id);
CREATE INDEX IF NOT EXISTS idx_stats_match ON match_player_stats(match_id);

-- ==============================================================================
-- 2. TRIGGER FUNCTIONS: AUTOMATED PODIUM SCORING
-- ==============================================================================

-- Trigger function to automatically credit 10 (Gold), 8 (Silver), or 5 (Bronze) points
-- directly to the department's leaderboard tally upon ratification of podium finishes.
CREATE OR REPLACE FUNCTION apply_podium_points()
RETURNS TRIGGER AS $$
DECLARE
  gold_delta INT := 0;
  silver_delta INT := 0;
  bronze_delta INT := 0;
  pts_delta INT := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.position = 1 THEN
      gold_delta := 1;
      pts_delta := COALESCE(NEW.awarded_pts, 10);
      IF pts_delta = 0 THEN pts_delta := 10; END IF;
    ELSIF NEW.position = 2 THEN
      silver_delta := 1;
      pts_delta := COALESCE(NEW.awarded_pts, 8);
      IF pts_delta = 0 THEN pts_delta := 8; END IF;
    ELSIF NEW.position = 3 THEN
      bronze_delta := 1;
      pts_delta := COALESCE(NEW.awarded_pts, 5);
      IF pts_delta = 0 THEN pts_delta := 5; END IF;
    END IF;

    UPDATE departments
    SET gold_count = gold_count + gold_delta,
        silver_count = silver_count + silver_delta,
        bronze_count = bronze_count + bronze_delta,
        total_overall_pts = total_overall_pts + pts_delta,
        updated_at = now()
    WHERE id = NEW.department_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.position = 1 THEN
      gold_delta := 1;
      pts_delta := COALESCE(OLD.awarded_pts, 10);
      IF pts_delta = 0 THEN pts_delta := 10; END IF;
    ELSIF OLD.position = 2 THEN
      silver_delta := 1;
      pts_delta := COALESCE(OLD.awarded_pts, 8);
      IF pts_delta = 0 THEN pts_delta := 8; END IF;
    ELSIF OLD.position = 3 THEN
      bronze_delta := 1;
      pts_delta := COALESCE(OLD.awarded_pts, 5);
      IF pts_delta = 0 THEN pts_delta := 5; END IF;
    END IF;

    UPDATE departments
    SET gold_count = GREATEST(0, gold_count - gold_delta),
        silver_count = GREATEST(0, silver_count - silver_delta),
        bronze_count = GREATEST(0, bronze_count - bronze_delta),
        total_overall_pts = GREATEST(0, total_overall_pts - pts_delta),
        updated_at = now()
    WHERE id = OLD.department_id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_apply_podium_points ON podium_results;
CREATE TRIGGER trigger_apply_podium_points
AFTER INSERT OR DELETE ON podium_results
FOR EACH ROW
EXECUTE FUNCTION apply_podium_points();

-- ==============================================================================
-- 3. REALTIME PUBLICATION
-- ==============================================================================

-- Enable Realtime publication so clients receive live updates without polling
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches, match_lineups, match_player_stats, points_table, departments;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Set replica identity to full on dynamic tables to allow payload inspection in Realtime
ALTER TABLE matches REPLICA IDENTITY FULL;
ALTER TABLE match_lineups REPLICA IDENTITY FULL;
ALTER TABLE match_player_stats REPLICA IDENTITY FULL;
ALTER TABLE points_table REPLICA IDENTITY FULL;
ALTER TABLE departments REPLICA IDENTITY FULL;

-- ==============================================================================
-- 4. SEED DATA: 14 OFFICIAL AITM DEPARTMENTS (SESSION 2026-27)
-- ==============================================================================

INSERT INTO departments (id, short_code, name, coordinator_name, badge_color, gold_count, silver_count, bronze_count, fair_play_pts, total_overall_pts)
VALUES
  ('dept-cse', 'CSE', 'Computer Science & Engineering', 'Mr. Pankaj Kumar', '#1E3A8A', 4, 2, 1, 6, 54),
  ('dept-ds', 'DS', 'Data Science', 'Mr. Vinay Yadav', '#0284C7', 2, 1, 1, 4, 28),
  ('dept-aiml', 'AIML', 'Artificial Intelligence & Machine Learning', 'Mr. Ravindra Kumar', '#6366F1', 1, 3, 2, 5, 34),
  ('dept-bca', 'BCA', 'Bachelor of Computer Applications', 'Ms. Astha Pathak', '#0D9488', 2, 2, 3, 4, 37),
  ('dept-bba', 'BBA', 'Bachelor of Business Administration', 'Mr. Kunjan Pandey', '#D97706', 1, 1, 2, 3, 21),
  ('dept-bcom', 'B.COM', 'Bachelor of Commerce', 'Mr. Sushil Kumar', '#CA8A04', 1, 0, 1, 3, 14),
  ('dept-mba', 'MBA', 'Master of Business Administration', 'Mr. Amit Kumar Singh', '#EA580C', 2, 1, 0, 4, 25),
  ('dept-bt', 'BT', 'Biotechnology', 'Ms. Arpita Singh', '#16A34A', 1, 2, 1, 3, 25),
  ('dept-ece', 'ECE', 'Electronics & Communication Engineering', 'Mr. Lalit Kumar', '#059669', 2, 3, 3, 5, 41),
  ('dept-ce', 'CE', 'Civil Engineering', 'Mr. Anuj Kumar', '#854D0E', 1, 2, 1, 3, 25),
  ('dept-ee', 'EE', 'Electrical Engineering', 'Mr. Surendra Kushwaha', '#E11D48', 2, 0, 2, 4, 26),
  ('dept-me', 'ME', 'Mechanical Engineering', 'Mr. Abhay Kumar Shukla', '#DC2626', 3, 3, 2, 5, 47),
  ('dept-bpharma', 'B.PHARMA', 'Bachelor of Pharmacy', 'Mr. Om Prakash Sahani', '#9333EA', 0, 2, 2, 3, 17),
  ('dept-dpharma', 'D.PHARMA', 'Diploma in Pharmacy', 'Mr. Sant Lal', '#C026D3', 0, 1, 1, 2, 9)
ON CONFLICT (short_code) DO UPDATE SET
  name = EXCLUDED.name,
  coordinator_name = EXCLUDED.coordinator_name,
  badge_color = EXCLUDED.badge_color;

-- ==============================================================================
-- 5. SEED DATA: 19 OFFICIAL AITM SPORTS & GENDER CATEGORIES
-- ==============================================================================

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
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category_group = EXCLUDED.category_group,
  gender_category = EXCLUDED.gender_category,
  format_type = EXCLUDED.format_type,
  rules_summary = EXCLUDED.rules_summary;

-- ==============================================================================
-- 6. SEED DATA: INITIAL TOURNAMENT GROUPS (POOLS A & B)
-- ==============================================================================

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

-- ==============================================================================
-- 7. SEED DATA: OFFICIAL FEST RECORDS
-- ==============================================================================

INSERT INTO records (id, sport_id, event_name, bracket_gender, record_holder_name, department_name, record_value, session_year, verified_by)
VALUES
  ('rec-100m-boys', 'sport-100m', '100m Sprint', 'boys', 'Aryan Maurya', 'Mechanical Engineering', '11.08s', '2024-25', 'Dr. S. K. Sharma (Sports Officer)'),
  ('rec-100m-girls', 'sport-100m', '100m Sprint', 'girls', 'Pooja Verma', 'Computer Science & Engineering', '13.12s', '2025-26', 'Sports Committee AITM'),
  ('rec-longjump-boys', 'sport-long-jump', 'Long Jump', 'boys', 'Vikas Singh', 'Civil Engineering', '6.68m', '2023-24', 'AITM Athletics Board'),
  ('rec-highjump-boys', 'sport-high-jump', 'High Jump', 'boys', 'Rohit Patel', 'Computer Science & Engineering', '1.82m', '2025-26', 'Dr. S. K. Sharma (Sports Officer)'),
  ('rec-shotput-boys', 'sport-shot-put', 'Shot Put', 'boys', 'Aman Yadav', 'Mechanical Engineering', '12.45m', '2024-25', 'Sports Committee AITM'),
  ('rec-javelin-boys', 'sport-javelin-throw', 'Javelin Throw', 'boys', 'Kunal Tiwari', 'Electrical Engineering', '52.30m', '2025-26', 'AITM Athletics Board')
ON CONFLICT (id) DO NOTHING;
