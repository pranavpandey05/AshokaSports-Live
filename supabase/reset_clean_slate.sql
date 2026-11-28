-- ==============================================================================
-- AshokaSports Live: Clean Slate Reset Migration (Session 2026–27)
-- Ashoka Institute of Technology and Management (AITM), Varanasi
-- Author: Antigravity Assistant & SAC Sports Committee
-- SAC Convenor: Mr. Pankaj Kr. Srivastava
-- ==============================================================================
-- Purpose:
-- Resets all tournament matches, scores, player stats, lineups, podium entries,
-- and points_table records to a completely clean slate with 0 points and 0 medals.
-- Preserves all 14 AITM departments, 19 sports brochure metadata, and user_roles
-- (including SAC Convenor Mr. Pankaj Kr. Srivastava as super_admin).
-- ==============================================================================

BEGIN;

-- 1. Remove all match-related statistics, lineups, and match entries
DELETE FROM public.match_player_stats WHERE id IS NOT NULL;
DELETE FROM public.match_lineups WHERE id IS NOT NULL;
DELETE FROM public.matches WHERE id IS NOT NULL;

-- 2. Remove all event podium results and sport points table standings
DELETE FROM public.podium_results WHERE id IS NOT NULL;
DELETE FROM public.points_table WHERE id IS NOT NULL;

-- 3. Safely remove deprecated Fair Play columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'departments' AND column_name = 'fair_play_pts'
  ) THEN
    ALTER TABLE public.departments DROP COLUMN fair_play_pts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'points_table' AND column_name = 'fair_play_score'
  ) THEN
    ALTER TABLE public.points_table DROP COLUMN fair_play_score;
  END IF;
END $$;

-- 4. Reset medal counts and championship points to 0 for all 14 departments
UPDATE public.departments
SET
  gold_count = 0,
  silver_count = 0,
  bronze_count = 0,
  total_overall_pts = 0
WHERE id IS NOT NULL;

-- 5. Ensure all 14 official AITM departments exist with exact coordinators & colors
INSERT INTO public.departments (id, name, short_code, coordinator_name, badge_color, gold_count, silver_count, bronze_count, total_overall_pts)
VALUES
  ('dept-cse', 'Computer Science & Engineering', 'CSE', 'Mr. Pankaj Kumar', '#1E3A8A', 0, 0, 0, 0),
  ('dept-ds', 'Data Science', 'DS', 'Mr. Vinay Yadav', '#0284C7', 0, 0, 0, 0),
  ('dept-aiml', 'Artificial Intelligence & Machine Learning', 'AIML', 'Mr. Ravindra Kumar', '#6366F1', 0, 0, 0, 0),
  ('dept-bca', 'Bachelor of Computer Applications', 'BCA', 'Ms. Astha Pathak', '#0D9488', 0, 0, 0, 0),
  ('dept-bba', 'Bachelor of Business Administration', 'BBA', 'Mr. Kunjan Pandey', '#D97706', 0, 0, 0, 0),
  ('dept-bcom', 'Bachelor of Commerce', 'B.COM', 'Mr. Sushil Kumar', '#CA8A04', 0, 0, 0, 0),
  ('dept-mba', 'Master of Business Administration', 'MBA', 'Mr. Amit Kumar Singh', '#EA580C', 0, 0, 0, 0),
  ('dept-bt', 'Biotechnology', 'BT', 'Ms. Arpita Singh', '#16A34A', 0, 0, 0, 0),
  ('dept-ece', 'Electronics & Communication Engineering', 'ECE', 'Mr. Lalit Kumar', '#059669', 0, 0, 0, 0),
  ('dept-ce', 'Civil Engineering', 'CE', 'Mr. Anuj Kumar', '#854D0E', 0, 0, 0, 0),
  ('dept-ee', 'Electrical Engineering', 'EE', 'Mr. Surendra Kushwaha', '#E11D48', 0, 0, 0, 0),
  ('dept-me', 'Mechanical Engineering', 'ME', 'Mr. Abhay Kumar Shukla', '#DC2626', 0, 0, 0, 0),
  ('dept-bpharm', 'Bachelor of Pharmacy', 'B.PHARMA', 'Mr. Om Prakash Sahani', '#9333EA', 0, 0, 0, 0),
  ('dept-dpharm', 'Diploma in Pharmacy', 'D.PHARMA', 'Mr. Sant Lal', '#C026D3', 0, 0, 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_code = EXCLUDED.short_code,
  coordinator_name = EXCLUDED.coordinator_name,
  badge_color = EXCLUDED.badge_color,
  gold_count = 0,
  silver_count = 0,
  bronze_count = 0,
  total_overall_pts = 0;

-- 6. Ensure Super Admin (SAC Convenor Mr. Pankaj Kr. Srivastava) is ratified and active
INSERT INTO public.user_roles (id, full_name, email, role, approval_status, approved_by, approved_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Mr. Pankaj Kr. Srivastava',
  'sac.convenor@ashoka.edu.in',
  'super_admin',
  'approved',
  '00000000-0000-0000-0000-000000000001',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = 'super_admin',
  approval_status = 'approved';

-- 7. Log ratification entry in audit_logs
INSERT INTO public.audit_logs (action, table_name, performed_by, details)
VALUES (
  'CLEAN_SLATE_RESET',
  'tournament',
  'Mr. Pankaj Kr. Srivastava (SAC Convenor)',
  'Official tournament clean slate reset executed: 0 matches, 0 dummy points, 0 mock scores. Ready for Session 2026-27 live match fixtures.'
);

COMMIT;

-- Verify Clean Slate Results
SELECT 
  (SELECT COUNT(*) FROM public.matches) AS total_matches,
  (SELECT COUNT(*) FROM public.podium_results) AS total_podiums,
  (SELECT COUNT(*) FROM public.points_table) AS total_standings_rows,
  (SELECT COUNT(*) FROM public.departments WHERE total_overall_pts > 0) AS depts_with_points,
  (SELECT COUNT(*) FROM public.departments) AS total_departments;
