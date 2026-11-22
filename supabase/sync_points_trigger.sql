-- ==============================================================================
-- AshokaSports Live — Match Completion & Standings Synchronization Trigger
-- Ashoka Institute of Technology and Management (AITM), Varanasi
-- Session 2026-27 • Idempotent Points Table & Department Tally Recomputation
--
-- INSTRUCTIONS FOR SUPABASE SQL EDITOR:
-- Paste this script into your Supabase Dashboard -> SQL Editor and click Run.
-- Safe to execute repeatedly without duplicating points or creating conflicts.
-- ==============================================================================

-- 1. Numeric score extraction helper (handles strings like "142/6", "3", "2-1", etc.)
CREATE OR REPLACE FUNCTION public.parse_score_numeric(val TEXT)
RETURNS NUMERIC AS $$
BEGIN
  IF val IS NULL OR trim(val) = '' OR trim(val) = '-' OR lower(trim(val)) LIKE '%yet%' THEN
    RETURN 0;
  END IF;
  -- Extract leading numeric digits
  IF val ~ '^[0-9]+' THEN
    RETURN substring(val from '^[0-9]+')::numeric;
  END IF;
  RETURN 0;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Master function to recalculate points_table and departments.total_overall_pts
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
  -- Identify affected sport and bracket gender
  IF TG_OP = 'DELETE' THEN
    v_sport_id := OLD.sport_id;
    v_bracket_gender := OLD.bracket_gender;
  ELSE
    v_sport_id := NEW.sport_id;
    v_bracket_gender := NEW.bracket_gender;
  END IF;

  -- Resolve canonical sport ID and sport win/draw/loss points
  SELECT s.id, COALESCE(s.win_pts, 3), COALESCE(s.draw_pts, 1), COALESCE(s.loss_pts, 0)
  INTO v_sport_id, v_win_pts, v_draw_pts, v_loss_pts
  FROM sports s
  WHERE s.id = v_sport_id OR s.name = v_sport_id
  LIMIT 1;

  IF v_sport_id IS NOT NULL AND v_bracket_gender IS NOT NULL THEN
    -- Loop over every registered department
    FOR r_dept IN SELECT id, short_code FROM departments LOOP
      -- Aggregate match statistics from all COMPLETED matches
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

      -- Upsert points_table row
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

  -- 3. Idempotently recompute total_overall_pts for ALL departments:
  -- Total = (Sum of league points from points_table) + (Sum of track & field podium points)
  -- Zero fair-play bonus points.
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

-- 4. Podium recomputation trigger function
CREATE OR REPLACE FUNCTION public.recalculate_standings_from_podium()
RETURNS TRIGGER AS $$
BEGIN
  -- Recompute gold, silver, bronze counts and total_overall_pts for all departments
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

-- 5. Attach Triggers
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
