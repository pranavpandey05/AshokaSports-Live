-- ==============================================================================
-- AshokaSports Live — Fix "UPDATE requires a WHERE clause" (pg_safeupdate)
-- Ashoka Institute of Technology and Management (AITM), Varanasi • Session 2026-27
--
-- ROOT CAUSE:
-- Supabase enables the pg_safeupdate extension, which rejects any UPDATE/DELETE
-- statement without a WHERE clause — including inside trigger functions like
-- recalculate_standings_from_matches() and recalculate_standings_from_podium().
--
-- INSTRUCTIONS FOR SUPABASE SQL EDITOR:
-- Paste this script into Supabase Dashboard -> SQL Editor and click Run.
-- ==============================================================================

-- 1. Fix recalculate_standings_from_matches() with explicit WHERE d.id IS NOT NULL
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
  FROM public.sports s
  WHERE s.id = v_sport_id OR s.name = v_sport_id
  LIMIT 1;

  IF v_sport_id IS NOT NULL AND v_bracket_gender IS NOT NULL THEN
    FOR r_dept IN SELECT id, short_code FROM public.departments LOOP
      SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE (m.winner_id = r_dept.id OR m.winner_id = r_dept.short_code)),
        COUNT(*) FILTER (WHERE m.winner_id IS NULL OR m.winner_id = '' OR lower(m.winner_id) = 'draw'),
        COUNT(*) FILTER (WHERE m.winner_id IS NOT NULL AND m.winner_id != '' AND lower(m.winner_id) != 'draw' AND m.winner_id != r_dept.id AND m.winner_id != r_dept.short_code),
        COALESCE(SUM(CASE WHEN (m.team_a_id = r_dept.id OR m.team_a_id = r_dept.short_code) THEN public.parse_score_numeric(m.team_a_score) ELSE public.parse_score_numeric(m.team_b_score) END), 0),
        COALESCE(SUM(CASE WHEN (m.team_a_id = r_dept.id OR m.team_a_id = r_dept.short_code) THEN public.parse_score_numeric(m.team_b_score) ELSE public.parse_score_numeric(m.team_a_score) END), 0)
      INTO
        v_played, v_won, v_drawn, v_lost, v_score_for, v_score_against
      FROM public.matches m
      WHERE (m.sport_id = v_sport_id OR m.sport_id = (SELECT name FROM public.sports WHERE id = v_sport_id))
        AND m.bracket_gender = v_bracket_gender
        AND m.status = 'completed'
        AND (
          m.team_a_id = r_dept.id OR m.team_a_id = r_dept.short_code OR
          m.team_b_id = r_dept.id OR m.team_b_id = r_dept.short_code
        );

      v_score_diff := v_score_for - v_score_against;
      v_total_points := (v_won * v_win_pts) + (v_drawn * v_draw_pts) + (v_lost * v_loss_pts);

      IF v_played > 0 OR EXISTS (
        SELECT 1 FROM public.points_table
        WHERE sport_id = v_sport_id AND department_id = r_dept.id AND bracket_gender = v_bracket_gender
      ) THEN
        INSERT INTO public.points_table (
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

  -- Explicit WHERE d.id IS NOT NULL required by Supabase pg_safeupdate
  UPDATE public.departments d
  SET total_overall_pts = COALESCE((
    SELECT SUM(pt.total_points)
    FROM public.points_table pt
    WHERE pt.department_id = d.id
  ), 0) + COALESCE((
    SELECT SUM(
      CASE 
        WHEN pr.position = 1 THEN 10
        WHEN pr.position = 2 THEN 8
        WHEN pr.position = 3 THEN 5
        ELSE COALESCE(pr.awarded_pts, 0)
      END
    )
    FROM public.podium_results pr
    WHERE pr.department_id = d.id
  ), 0),
  updated_at = now()
  WHERE d.id IS NOT NULL;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix recalculate_standings_from_podium() with explicit WHERE d.id IS NOT NULL
CREATE OR REPLACE FUNCTION public.recalculate_standings_from_podium()
RETURNS TRIGGER AS $$
BEGIN
  -- Explicit WHERE d.id IS NOT NULL required by Supabase pg_safeupdate
  UPDATE public.departments d
  SET gold_count = COALESCE((SELECT COUNT(*) FROM public.podium_results WHERE department_id = d.id AND position = 1), 0),
      silver_count = COALESCE((SELECT COUNT(*) FROM public.podium_results WHERE department_id = d.id AND position = 2), 0),
      bronze_count = COALESCE((SELECT COUNT(*) FROM public.podium_results WHERE department_id = d.id AND position = 3), 0),
      total_overall_pts = COALESCE((
        SELECT SUM(pt.total_points)
        FROM public.points_table pt
        WHERE pt.department_id = d.id
      ), 0) + COALESCE((
        SELECT SUM(
          CASE 
            WHEN pr.position = 1 THEN 10
            WHEN pr.position = 2 THEN 8
            WHEN pr.position = 3 THEN 5
            ELSE COALESCE(pr.awarded_pts, 0)
          END
        )
        FROM public.podium_results pr
        WHERE pr.department_id = d.id
      ), 0),
      updated_at = now()
  WHERE d.id IS NOT NULL;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach triggers cleanly
DROP TRIGGER IF EXISTS trigger_sync_match_standings ON public.matches;
CREATE TRIGGER trigger_sync_match_standings
AFTER INSERT OR UPDATE OR DELETE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_standings_from_matches();

DROP TRIGGER IF EXISTS trigger_apply_podium_points ON public.podium_results;
DROP TRIGGER IF EXISTS trigger_sync_podium_standings ON public.podium_results;
CREATE TRIGGER trigger_sync_podium_standings
AFTER INSERT OR UPDATE OR DELETE ON public.podium_results
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_standings_from_podium();
