"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Trophy,
  Shield,
  Award,
  Users,
  Radio,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export interface LineupPlayer {
  id: string;
  player_id: string;
  full_name: string;
  roll_no: string;
  academic_year: string;
  jersey_no: number | null;
  position: string | null;
  is_captain: boolean;
  is_starting: boolean;
}

export interface PlayerStatEntry {
  id: string;
  player_id: string;
  player_name: string;
  department_code: string;
  badge_color: string;
  stat_key: string;
  stat_value: number;
  notes: string | null;
}

export interface MatchCenterData {
  id: string;
  sport_name: string;
  category_group: string;
  bracket_gender: "boys" | "girls";
  stage_label: string;
  venue: string;
  scheduled_at: string;
  status: "live" | "scheduled" | "completed";
  reporting_mins_before: number;
  rules_summary: string;
  team_a_code: string;
  team_a_name: string;
  team_a_color: string;
  team_a_coordinator: string;
  team_a_score: string | number | null;
  team_b_code: string;
  team_b_name: string;
  team_b_color: string;
  team_b_coordinator: string;
  team_b_score: string | number | null;
  winner_code: string | null;
  mvp_player_id: string | null;
  mvp_player_name: string | null;
  result_note: string | null;
  current_detail?: string;
  team_a_lineup: LineupPlayer[];
  team_b_lineup: LineupPlayer[];
  player_stats: PlayerStatEntry[];
}

export function MatchCenterClient({ matchId }: { matchId: string }) {
  const [matchData, setMatchData] = useState<MatchCenterData | null>(null);
  const [activeTab, setActiveTab] = useState<"lineups" | "stats" | "rules">("lineups");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMatch() {
      try {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

        if (hasSupabaseUrl) {
          setIsLoading(true);
          const { data, error } = await supabase
            .from("matches")
            .select(`
              id,
              status,
              bracket_gender,
              stage_label,
              venue,
              scheduled_at,
              team_a_score,
              team_b_score,
              result_note,
              sport:sports(name, category_group, reporting_mins_before, rules_summary),
              team_a:departments!matches_team_a_id_fkey(short_code, name, badge_color, coordinator_name),
              team_b:departments!matches_team_b_id_fkey(short_code, name, badge_color, coordinator_name),
              winner:departments!matches_winner_id_fkey(short_code),
              mvp_player:players(id, full_name)
            `)
            .eq("id", matchId)
            .single();

          const match: any = data;

          if (!error && match) {
            // Fetch lineups
            const { data: lineupsData } = await supabase
              .from("match_lineups")
              .select(`
                id,
                player_id,
                department_id,
                is_starting,
                is_captain,
                position,
                player:players(id, full_name, roll_no, academic_year, jersey_no),
                department:departments(short_code)
              `)
              .eq("match_id", matchId);

            // Fetch stats
            const { data: statsData } = await supabase
              .from("match_player_stats")
              .select(`
                id,
                player_id,
                stat_key,
                stat_value,
                notes,
                player:players(id, full_name, department:departments(short_code, badge_color))
              `)
              .eq("match_id", matchId);

            const teamALineup = (lineupsData || [])
              .filter((l: any) => l.department?.short_code === match.team_a?.short_code)
              .map((l: any) => ({
                id: l.id,
                player_id: l.player?.id || l.player_id,
                full_name: l.player?.full_name || "Player",
                roll_no: l.player?.roll_no || "",
                academic_year: l.player?.academic_year ? `Yr ${l.player.academic_year}` : "Yr 2",
                jersey_no: l.player?.jersey_no || null,
                position: l.position || "Squad Member",
                is_captain: !!l.is_captain,
                is_starting: !!l.is_starting,
              }));

            const teamBLineup = (lineupsData || [])
              .filter((l: any) => l.department?.short_code === match.team_b?.short_code)
              .map((l: any) => ({
                id: l.id,
                player_id: l.player?.id || l.player_id,
                full_name: l.player?.full_name || "Player",
                roll_no: l.player?.roll_no || "",
                academic_year: l.player?.academic_year ? `Yr ${l.player.academic_year}` : "Yr 2",
                jersey_no: l.player?.jersey_no || null,
                position: l.position || "Squad Member",
                is_captain: !!l.is_captain,
                is_starting: !!l.is_starting,
              }));

            const mappedStats: PlayerStatEntry[] = (statsData || []).map((s: any) => ({
              id: s.id,
              player_id: s.player?.id || s.player_id,
              player_name: s.player?.full_name || "Player",
              department_code: s.player?.department?.short_code || "AITM",
              badge_color: s.player?.department?.badge_color || "#1E3A8A",
              stat_key: s.stat_key,
              stat_value: s.stat_value,
              notes: s.notes,
            }));

            setMatchData({
              id: match.id,
              sport_name: match.sport?.name || "Sport",
              category_group: match.sport?.category_group || "outdoor",
              bracket_gender: match.bracket_gender,
              stage_label: match.stage_label,
              venue: match.venue,
              scheduled_at: match.scheduled_at,
              status: match.status,
              reporting_mins_before: match.sport?.reporting_mins_before || 15,
              rules_summary:
                match.sport?.rules_summary ||
                "Official AITM Sports Council regulations and match guidelines apply.",
              team_a_code: match.team_a?.short_code || "Team A",
              team_a_name: match.team_a?.name || "Department A",
              team_a_color: match.team_a?.badge_color || "#1E3A8A",
              team_a_coordinator: match.team_a?.coordinator_name || "Faculty Coordinator",
              team_a_score: match.team_a_score,
              team_b_code: match.team_b?.short_code || "Team B",
              team_b_name: match.team_b?.name || "Department B",
              team_b_color: match.team_b?.badge_color || "#DC2626",
              team_b_coordinator: match.team_b?.coordinator_name || "Faculty Coordinator",
              team_b_score: match.team_b_score,
              winner_code: match.winner?.short_code || null,
              mvp_player_id: match.mvp_player?.id || null,
              mvp_player_name: match.mvp_player?.full_name || null,
              result_note: match.result_note || null,
              team_a_lineup: teamALineup,
              team_b_lineup: teamBLineup,
              player_stats: mappedStats,
            });
          }
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }

    fetchMatch();

    // Supabase Realtime subscriptions on matches, lineups, stats for this matchId
    try {
      const channel = supabase
        .channel(`match-center-${matchId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
          () => fetchMatch()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "match_lineups", filter: `match_id=eq.${matchId}` },
          () => fetchMatch()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "match_player_stats", filter: `match_id=eq.${matchId}` },
          () => fetchMatch()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Ignore websocket errors offline
    }
  }, [matchId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#1E3A8A] border-r-transparent mb-3"></div>
        <p className="text-xs font-semibold text-[#475569]">Loading Match Center...</p>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-extrabold text-[#0F172A]">Match Fixture Not Found</h2>
        <p className="text-xs text-[#475569] max-w-md mx-auto">
          The requested match fixture has not been scheduled yet or has been removed from the schedule.
        </p>
        <div>
          <Link
            href="/fixtures"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-semibold hover:bg-[#1E3A8A]/90 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Fixtures & Results
          </Link>
        </div>
      </div>
    );
  }

  const isLive = matchData.status === "live";
  const isCompleted = matchData.status === "completed";
  const isBoys = matchData.bracket_gender === "boys";

  // Filter playing squad vs bench
  const teamAStarting = matchData.team_a_lineup.filter((p) => p.is_starting);
  const teamABench = matchData.team_a_lineup.filter((p) => !p.is_starting);
  const teamBStarting = matchData.team_b_lineup.filter((p) => p.is_starting);
  const teamBBench = matchData.team_b_lineup.filter((p) => !p.is_starting);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/fixtures"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Fixtures Calendar
        </Link>
      </div>

      {/* Scoreboard Header Card */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Top Badges: Status + Sport + Gender Bracket + Stage */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 flex-wrap">
            {isLive ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-extrabold uppercase tracking-wider bg-[#DC2626] text-white shadow-xs">
                <span className="w-2 h-2 rounded-full bg-white animate-ping mr-1.5"></span>
                LIVE MATCH CENTER
              </span>
            ) : isCompleted ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                Completed Match
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Scheduled Fixture
              </span>
            )}

            <span
              className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                isBoys
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {isBoys ? "Boys Bracket" : "Girls Bracket"}
            </span>

            <span className="text-xs font-bold text-[#0F172A]">
              {matchData.sport_name} • {matchData.stage_label}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <MapPin className="w-4 h-4 text-[#1E3A8A] shrink-0" />
            <span className="font-medium">{matchData.venue}</span>
          </div>
        </div>

        {/* Head-to-Head Scoreboard Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center py-4">
          {/* Team A */}
          <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center sm:text-left flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-xs"
                style={{ backgroundColor: matchData.team_a_color }}
              >
                {matchData.team_a_code}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-base sm:text-lg text-[#0F172A] truncate">
                  {matchData.team_a_code}
                </div>
                <div className="text-xs text-[#475569] truncate max-w-[140px]">
                  {matchData.team_a_name}
                </div>
              </div>
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums text-[#0F172A] shrink-0">
              {matchData.team_a_score ?? "-"}
            </div>
          </div>

          {/* Middle Indicator */}
          <div className="text-center space-y-1">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              {isCompleted ? "FULL TIME" : "VS"}
            </span>
            <div className="text-xs font-mono font-bold text-[#1E3A8A] px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 inline-block">
              {matchData.current_detail || "Session 2026–27"}
            </div>
            {matchData.winner_code && (
              <div className="text-xs font-extrabold text-emerald-700 mt-1">
                Winner: {matchData.winner_code}
              </div>
            )}
          </div>

          {/* Team B */}
          <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center sm:text-right flex items-center justify-between sm:flex-row-reverse">
            <div className="flex items-center gap-3 min-w-0 sm:flex-row-reverse">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-xs"
                style={{ backgroundColor: matchData.team_b_color }}
              >
                {matchData.team_b_code}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-base sm:text-lg text-[#0F172A] truncate">
                  {matchData.team_b_code}
                </div>
                <div className="text-xs text-[#475569] truncate max-w-[140px]">
                  {matchData.team_b_name}
                </div>
              </div>
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums text-[#0F172A] shrink-0">
              {matchData.team_b_score ?? "-"}
            </div>
          </div>
        </div>

        {/* MVP & Match Result Summary */}
        <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#475569]">
            {matchData.result_note && <span>{matchData.result_note}</span>}
          </div>

          {matchData.mvp_player_name && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-semibold self-start sm:self-center">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Match MVP:</span>
              {matchData.mvp_player_id ? (
                <Link
                  href={`/players/${matchData.mvp_player_id}`}
                  className="font-bold text-[#1E3A8A] hover:underline"
                >
                  {matchData.mvp_player_name}
                </Link>
              ) : (
                <span className="font-bold">{matchData.mvp_player_name}</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Navigation Tabs (Lineups, Stats, Rules) */}
      <div className="border-b border-[#E2E8F0] flex items-center gap-2">
        <button
          onClick={() => setActiveTab("lineups")}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "lineups"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-[#475569] hover:text-[#0F172A]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Playing Lineups ({matchData.team_a_lineup.length + matchData.team_b_lineup.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("stats")}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "stats"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-[#475569] hover:text-[#0F172A]"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Player Stats ({matchData.player_stats.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "rules"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-[#475569] hover:text-[#0F172A]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Rules & Officials</span>
        </button>
      </div>

      {/* TAB 1: Playing Lineups */}
      {activeTab === "lineups" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team A Lineup */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: matchData.team_a_color }}
                ></span>
                <h3 className="font-extrabold text-base text-[#0F172A]">
                  {matchData.team_a_name} ({matchData.team_a_code})
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#475569]">
                Coord: {matchData.team_a_coordinator}
              </span>
            </div>

            {/* Starting Squad */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md mb-3 flex items-center justify-between">
                <span>Starting Playing Squad ({teamAStarting.length})</span>
                <span>Active On-Court / On-Field</span>
              </div>

              <div className="divide-y divide-slate-100">
                {teamAStarting.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Starting lineup not announced yet.
                  </div>
                ) : (
                  teamAStarting.map((player) => (
                    <div
                      key={player.id}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono tabular-nums text-xs font-bold text-slate-500 w-6 text-center">
                          {player.jersey_no ? `#${player.jersey_no}` : "-"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/players/${player.player_id}`}
                              className="font-bold text-xs sm:text-sm text-[#0F172A] group-hover:text-[#1E3A8A] transition-colors hover:underline truncate"
                            >
                              {player.full_name}
                            </Link>
                            {player.is_captain && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                                CAPTAIN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#475569] font-mono mt-0.5">
                            Roll: {player.roll_no} • {player.academic_year}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        {player.position}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Substitutes / Bench */}
            {teamABench.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md mb-3 flex items-center justify-between">
                  <span>Substitutes & Reserves ({teamABench.length})</span>
                  <span>Bench</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {teamABench.map((player) => (
                    <div
                      key={player.id}
                      className="py-2 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono tabular-nums text-xs text-slate-400 w-6 text-center">
                          {player.jersey_no ? `#${player.jersey_no}` : "-"}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/players/${player.player_id}`}
                            className="font-medium text-xs text-slate-700 group-hover:text-[#1E3A8A] transition-colors hover:underline truncate block"
                          >
                            {player.full_name}
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {player.roll_no} • {player.academic_year}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500">{player.position}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Team B Lineup */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: matchData.team_b_color }}
                ></span>
                <h3 className="font-extrabold text-base text-[#0F172A]">
                  {matchData.team_b_name} ({matchData.team_b_code})
                </h3>
              </div>
              <span className="text-xs font-semibold text-[#475569]">
                Coord: {matchData.team_b_coordinator}
              </span>
            </div>

            {/* Starting Squad */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md mb-3 flex items-center justify-between">
                <span>Starting Playing Squad ({teamBStarting.length})</span>
                <span>Active On-Court / On-Field</span>
              </div>

              <div className="divide-y divide-slate-100">
                {teamBStarting.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Starting lineup not announced yet.
                  </div>
                ) : (
                  teamBStarting.map((player) => (
                    <div
                      key={player.id}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono tabular-nums text-xs font-bold text-slate-500 w-6 text-center">
                          {player.jersey_no ? `#${player.jersey_no}` : "-"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/players/${player.player_id}`}
                              className="font-bold text-xs sm:text-sm text-[#0F172A] group-hover:text-[#1E3A8A] transition-colors hover:underline truncate"
                            >
                              {player.full_name}
                            </Link>
                            {player.is_captain && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                                CAPTAIN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#475569] font-mono mt-0.5">
                            Roll: {player.roll_no} • {player.academic_year}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                        {player.position}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Substitutes / Bench */}
            {teamBBench.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md mb-3 flex items-center justify-between">
                  <span>Substitutes & Reserves ({teamBBench.length})</span>
                  <span>Bench</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {teamBBench.map((player) => (
                    <div
                      key={player.id}
                      className="py-2 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono tabular-nums text-xs text-slate-400 w-6 text-center">
                          {player.jersey_no ? `#${player.jersey_no}` : "-"}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/players/${player.player_id}`}
                            className="font-medium text-xs text-slate-700 group-hover:text-[#1E3A8A] transition-colors hover:underline truncate block"
                          >
                            {player.full_name}
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {player.roll_no} • {player.academic_year}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500">{player.position}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Player Stats */}
      {activeTab === "stats" && (
        <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#E2E8F0]">
            <h3 className="font-extrabold text-base text-[#0F172A]">
              Official Match Performance Statistics
            </h3>
            <p className="text-xs text-[#475569] mt-0.5">
              Verified individual player contributions recorded by official match scorers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  <th className="py-3 px-4">Student Athlete</th>
                  <th className="py-3 px-3">Team</th>
                  <th className="py-3 px-3">Metric</th>
                  <th className="py-3 px-3 text-center font-mono">Value</th>
                  <th className="py-3 px-4">Performance Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {matchData.player_stats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      No individual player stats recorded yet for this match.
                    </td>
                  </tr>
                ) : (
                  matchData.player_stats.map((stat) => (
                    <tr key={stat.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/players/${stat.player_id}`}
                          className="font-bold text-[#0F172A] hover:text-[#1E3A8A] hover:underline"
                        >
                          {stat.player_name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white shadow-2xs"
                          style={{ backgroundColor: stat.badge_color }}
                        >
                          {stat.department_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-700">
                        {stat.stat_key}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono tabular-nums font-bold text-base text-[#1E3A8A]">
                        {stat.stat_value}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#475569]">
                        {stat.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: Rules & Officials */}
      {activeTab === "rules" && (
        <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="font-extrabold text-base text-[#0F172A]">
              Match Regulations & Appointed Officials
            </h3>
            <p className="text-xs text-[#475569] mt-0.5">
              Ref: Ashoka/SAC/Sports/2026-27/003 • Official Rulebook for {matchData.sport_name}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rules Summary */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                Competition Format & Directives
              </div>
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                {matchData.rules_summary}
              </p>
              <div className="pt-2 text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <strong>Reporting Deadline:</strong> Teams must report exactly {matchData.reporting_mins_before} minutes
                before scheduled fixture time with official student identity cards.
              </div>
            </div>

            {/* Department Coordinators */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#059669] uppercase tracking-wider">
                <UserCheck className="w-4 h-4" />
                Participating Faculty Coordinators
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0F172A]">{matchData.team_a_code} Coordinator</span>
                    <div className="text-slate-500">{matchData.team_a_name}</div>
                  </div>
                  <span className="font-bold text-slate-800">{matchData.team_a_coordinator}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0F172A]">{matchData.team_b_code} Coordinator</span>
                    <div className="text-slate-500">{matchData.team_b_name}</div>
                  </div>
                  <span className="font-bold text-slate-800">{matchData.team_b_coordinator}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-1">
                For protests or score disputes, both faculty coordinators must submit a signed form to the SAC Convener within 15 mins of match conclusion.
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
