/**
 * AshokaSports Live — Database Schema Types
 * Ashoka Institute of Technology and Management (AITM), Varanasi
 * Ashoka Sports Club — Session 2026-27
 */

export type SportCategoryGroup = 'indoor' | 'outdoor' | 'track' | 'field';
export type GenderCategory = 'boys' | 'girls' | 'both';
export type BracketGender = 'boys' | 'girls';
export type SportFormatType = 'team_match' | 'singles_doubles' | 'podium_heat';
export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'abandoned' | 'postponed';
export type AppUserRole =
  | 'super_admin'
  | 'admin'
  | 'scorer'
  | 'faculty_coordinator'
  | 'student_coordinator'
  | 'referee'
  | 'viewer';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'LOCK' | 'VERIFY';

/**
 * Participating Academic Department
 */
export interface Department {
  id: string;
  name: string;
  short_code: string;
  coordinator_name: string | null;
  badge_color: string;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  fair_play_pts: number;
  total_overall_pts: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Sport / Event definition
 */
export interface Sport {
  id: string;
  name: string;
  category_group: SportCategoryGroup;
  gender_category: GenderCategory;
  format_type: SportFormatType;
  scoring_unit: string;
  win_pts: number;
  draw_pts: number;
  loss_pts: number;
  podium_1st_pts: number;
  podium_2nd_pts: number;
  podium_3rd_pts: number;
  playing_squad_size: number;
  bench_squad_size: number;
  reporting_mins_before: number;
  rules_summary: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Student Athlete / Player
 */
export interface Player {
  id: string;
  full_name: string;
  roll_no: string;
  department_id: string;
  academic_year: number | string;
  gender: 'boys' | 'girls' | 'male' | 'female';
  jersey_no: number | null;
  default_role: string | null;
  is_verified: boolean;
  department?: Department;
  created_at?: string;
  updated_at?: string;
}

/**
 * Head-to-head match fixture and result
 */
export interface Match {
  id: string;
  sport_id: string;
  bracket_gender: BracketGender;
  stage_label: string;
  team_a_id: string | null;
  team_b_id: string | null;
  venue: string;
  scheduled_at: string;
  status: MatchStatus;
  team_a_score: string | number | null;
  team_b_score: string | number | null;
  winner_id: string | null;
  mvp_player_id: string | null;
  result_note: string | null;
  is_locked: boolean;
  sport?: Sport;
  team_a?: Department;
  team_b?: Department;
  winner?: Department;
  mvp_player?: Player;
  created_at?: string;
  updated_at?: string;
}

/**
 * Team Lineup for a Match fixture
 */
export interface MatchLineup {
  id: string;
  match_id: string;
  player_id: string;
  department_id: string;
  is_starting: boolean;
  is_captain: boolean;
  position: string | null;
  player?: Player;
  match?: Match;
  department?: Department;
  created_at?: string;
}

/**
 * Individual Player Performance Statistic in a Match
 */
export interface MatchPlayerStat {
  id: string;
  match_id: string;
  player_id: string;
  stat_key: string;
  stat_value: number;
  notes: string | null;
  player?: Player;
  match?: Match;
  created_at?: string;
}

/**
 * Dynamic Points Table row for round-robin / league formats
 */
export interface PointsRow {
  id: string;
  sport_id: string;
  department_id: string;
  bracket_gender: BracketGender;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  score_for: number;
  score_against: number;
  score_diff: number;
  fair_play_score: number;
  total_points: number;
  rank: number | null;
  sport?: Sport;
  department?: Department;
  created_at?: string;
  updated_at?: string;
}

/**
 * Athletic Track / Field or Tournament Podium Finishes
 */
export interface PodiumResult {
  id: string;
  sport_id: string;
  bracket_gender: BracketGender;
  position: 1 | 2 | 3;
  department_id: string;
  player_id: string | null;
  performance_mark: string | null;
  awarded_pts: number;
  sport?: Sport;
  department?: Department;
  player?: Player;
  created_at?: string;
}

/**
 * Historical Institute Sporting Record
 */
export interface RecordItem {
  id: string;
  sport_id: string;
  event_name: string;
  bracket_gender: BracketGender;
  record_holder_name: string;
  department_name: string;
  record_value: string;
  session_year: string;
  verified_by: string | null;
  sport?: Sport;
  created_at?: string;
}

/**
 * Access Control and RBAC Role Mapping
 */
export interface UserRole {
  id: string;
  user_id: string;
  email: string;
  full_name?: string | null;
  role: 'super_admin' | 'admin' | 'scorer';
  approval_status: ApprovalStatus;
  department_id: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  assigned_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * System Audit Log for Critical Score and Match Updates
 */
export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  performed_by: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  timestamp: string;
}

/**
 * Supabase Database Generic Mapping
 */
export interface Database {
  public: {
    Tables: {
      departments: {
        Row: Department;
        Insert: Omit<Department, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Department>;
      };
      sports: {
        Row: Sport;
        Insert: Omit<Sport, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Sport>;
      };
      players: {
        Row: Player;
        Insert: Omit<Player, 'id' | 'created_at' | 'updated_at' | 'department'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Player>;
      };
      matches: {
        Row: Match;
        Insert: Omit<
          Match,
          'id' | 'created_at' | 'updated_at' | 'sport' | 'team_a' | 'team_b' | 'winner' | 'mvp_player'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Match>;
      };
      match_lineups: {
        Row: MatchLineup;
        Insert: Omit<MatchLineup, 'id' | 'created_at' | 'player' | 'match' | 'department'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<MatchLineup>;
      };
      match_player_stats: {
        Row: MatchPlayerStat;
        Insert: Omit<MatchPlayerStat, 'id' | 'created_at' | 'player' | 'match'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<MatchPlayerStat>;
      };
      points_table: {
        Row: PointsRow;
        Insert: Omit<PointsRow, 'id' | 'created_at' | 'updated_at' | 'sport' | 'department'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PointsRow>;
      };
      podium_results: {
        Row: PodiumResult;
        Insert: Omit<PodiumResult, 'id' | 'created_at' | 'sport' | 'department' | 'player'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<PodiumResult>;
      };
      records: {
        Row: RecordItem;
        Insert: Omit<RecordItem, 'id' | 'created_at' | 'sport'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<RecordItem>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<UserRole>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id'> & {
          id?: string;
        };
        Update: Partial<AuditLog>;
      };
    };
  };
}
