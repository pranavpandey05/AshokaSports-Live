"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Activity,
  ArrowRight,
  Filter,
  CheckCircle2,
  Medal,
  User,
  Shield,
  Pin,
  AlertCircle,
} from "lucide-react";
import { useDepartment } from "@/context/DepartmentContext";
import { AITM_DEPARTMENTS } from "@/lib/constants/departments";
import { AITM_SPORTS } from "@/lib/constants/sports";
import { supabase } from "@/lib/supabase/client";

export interface FixtureItem {
  id: string;
  sport_id: string;
  sport_name: string;
  bracket_gender: "boys" | "girls";
  stage_label: string;
  venue: string;
  scheduled_at: string; // ISO date string or formatted
  reporting_mins_before: number;
  status: "live" | "scheduled" | "completed";
  team_a_code: string;
  team_a_name: string;
  team_a_color: string;
  team_a_score: string | number | null;
  team_b_code: string;
  team_b_name: string;
  team_b_color: string;
  team_b_score: string | number | null;
  winner_code?: string | null;
  mvp_player_id?: string | null;
  mvp_player_name?: string | null;
  result_note?: string | null;
  current_detail?: string;
}

const FALLBACK_FIXTURES: FixtureItem[] = [];

export default function FixturesPage() {
  const { selectedDeptCode, setSelectedDeptCode } = useDepartment();
  const [fixtures, setFixtures] = useState<FixtureItem[]>(FALLBACK_FIXTURES);
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "scheduled" | "completed">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "boys" | "girls">("all");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [sportsOptions, setSportsOptions] = useState(AITM_SPORTS);

  // Sync pinned department filter when selectedDeptCode changes
  useEffect(() => {
    if (selectedDeptCode !== "ALL") {
      setDeptFilter(selectedDeptCode);
    }
  }, [selectedDeptCode]);

  useEffect(() => {
    async function loadSportsOptions() {
      try {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");
        if (hasSupabaseUrl) {
          const { data } = await supabase
            .from("sports")
            .select("*")
            .order("name", { ascending: true });
          if (data && data.length > 0) {
            setSportsOptions(data as any);
          }
        }
      } catch {}
    }

    async function loadFixtures() {
      try {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

        if (hasSupabaseUrl) {
          const { data, error } = await supabase
            .from("matches")
            .select(`
              id,
              sport_id,
              bracket_gender,
              stage_label,
              venue,
              scheduled_at,
              status,
              team_a_score,
              team_b_score,
              result_note,
              sport:sports(name, reporting_mins_before),
              team_a:departments!matches_team_a_id_fkey(short_code, name, badge_color),
              team_b:departments!matches_team_b_id_fkey(short_code, name, badge_color),
              winner:departments!matches_winner_id_fkey(short_code),
              mvp_player:players(id, full_name)
            `)
            .order("scheduled_at", { ascending: true });

          if (error) {
            console.error("FixturesPage failed to fetch matches:", error);
            setFixtures([]);
          } else if (data) {
            const statusWeight: Record<string, number> = {
              live: 0,
              scheduled: 1,
              completed: 2,
            };
            const mapped: FixtureItem[] = data
              .map((m: any) => ({
                id: m.id,
                sport_id: m.sport_id,
                sport_name: m.sport?.name || "Sport",
                bracket_gender: m.bracket_gender,
                stage_label: m.stage_label || "League Match",
                venue: m.venue || "Main Campus Ground",
                scheduled_at: m.scheduled_at,
                reporting_mins_before: m.sport?.reporting_mins_before || 15,
                status: m.status,
                team_a_code: m.team_a?.short_code || "TBD",
                team_a_name: m.team_a?.name || "Team A",
                team_a_color: m.team_a?.badge_color || "#1E3A8A",
                team_a_score: m.team_a_score,
                team_b_code: m.team_b?.short_code || "TBD",
                team_b_name: m.team_b?.name || "Team B",
                team_b_color: m.team_b?.badge_color || "#DC2626",
                team_b_score: m.team_b_score,
                winner_code: m.winner?.short_code,
                mvp_player_id: m.mvp_player?.id,
                mvp_player_name: m.mvp_player?.full_name,
                result_note: m.result_note,
              }))
              .sort((a: FixtureItem, b: FixtureItem) => {
                const wA = statusWeight[a.status] ?? 3;
                const wB = statusWeight[b.status] ?? 3;
                if (wA !== wB) return wA - wB;
                const tA = new Date(a.scheduled_at).getTime() || 0;
                const tB = new Date(b.scheduled_at).getTime() || 0;
                return a.status === "completed" ? tB - tA : tA - tB;
              });
            setFixtures(mapped);
          } else {
            setFixtures([]);
          }
        }
      } catch (err) {
        console.error("FixturesPage unexpected error:", err);
        setFixtures([]);
      }
    }

    loadSportsOptions();
    loadFixtures();

    // Supabase Realtime subscription for live fixture and score updates
    let channel: any = null;
    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (hasSupabaseUrl) {
        channel = supabase
          .channel("fixtures-page-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "matches" },
            () => loadFixtures()
          )
          .subscribe();
      }
    } catch {}

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  // Filter pipeline
  const filteredFixtures = fixtures.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (genderFilter !== "all" && item.bracket_gender !== genderFilter) return false;
    if (sportFilter !== "all" && item.sport_id !== sportFilter) return false;
    if (deptFilter !== "all") {
      if (item.team_a_code !== deptFilter && item.team_b_code !== deptFilter) return false;
    }
    return true;
  });

  // Calculate reporting time helper
  const getReportingDetails = (scheduledAt: string, reportingMins: number) => {
    try {
      const matchDate = new Date(scheduledAt);
      if (!isNaN(matchDate.getTime())) {
        const reportingDate = new Date(matchDate.getTime() - reportingMins * 60 * 1000);
        return {
          reportingStr: reportingDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          matchTimeStr: matchDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          dateStr: matchDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
        };
      }
    } catch {}
    return {
      reportingStr: `${reportingMins}m prior`,
      matchTimeStr: "Scheduled",
      dateStr: "Session 2026–27",
    };
  };

  const liveMatchesCount = fixtures.filter((f) => f.status === "live").length;
  const upcomingMatchesCount = fixtures.filter((f) => f.status === "scheduled").length;
  const completedMatchesCount = fixtures.filter((f) => f.status === "completed").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Rules Notice Header */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A8A] mb-1">
            <Calendar className="w-4 h-4" />
            Ashoka Sports Club • Event Schedule 2026–27
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Match Fixtures & Live Center
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-1">
            Mandatory reporting rules strictly enforced: 30 mins prior for Track & Field; 15 mins prior for team matches.
          </p>
        </div>

        {liveMatchesCount > 0 && (
          <div className="self-start sm:self-center inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-ping"></span>
            <span>{liveMatchesCount} Matches Live Now</span>
          </div>
        )}
      </div>

      {/* Multi-Filter Controls Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        {/* Top Filter Row: Status Segmented Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="inline-flex p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg self-start">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-white text-[#0F172A] shadow-xs"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              All Matches ({fixtures.length})
            </button>
            <button
              onClick={() => setStatusFilter("live")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === "live"
                  ? "bg-[#DC2626] text-white shadow-xs"
                  : "text-[#DC2626] hover:bg-[#DC2626]/5"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
              Live ({liveMatchesCount})
            </button>
            <button
              onClick={() => setStatusFilter("scheduled")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                statusFilter === "scheduled"
                  ? "bg-white text-[#1E3A8A] shadow-xs"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              Upcoming ({upcomingMatchesCount})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                statusFilter === "completed"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              Completed ({completedMatchesCount})
            </button>
          </div>

          {/* Gender Bracket Selector */}
          <div className="inline-flex p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg self-start sm:self-center">
            <button
              onClick={() => setGenderFilter("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                genderFilter === "all"
                  ? "bg-white text-[#0F172A] shadow-xs font-bold"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              All Brackets
            </button>
            <button
              onClick={() => setGenderFilter("boys")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                genderFilter === "boys"
                  ? "bg-blue-50 text-blue-700 shadow-xs font-bold border border-blue-200"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              Boys Bracket
            </button>
            <button
              onClick={() => setGenderFilter("girls")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                genderFilter === "girls"
                  ? "bg-rose-50 text-rose-700 shadow-xs font-bold border border-rose-200"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              Girls Bracket
            </button>
          </div>
        </div>

        {/* Bottom Filter Row: Sport & Department Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Sport Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
              Filter by Sport:
            </label>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            >
              <option value="all">All Sports Events</option>
              {sportsOptions.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name} ({sport.category_group.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1">
              Filter by Department Team:
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            >
              <option value="all">All 14 AITM Departments</option>
              {AITM_DEPARTMENTS.map((dept) => (
                <option key={dept.code} value={dept.code}>
                  {dept.code} — {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick "My Dept" pin button */}
          <div className="flex items-end">
            {selectedDeptCode !== "ALL" ? (
              <button
                type="button"
                onClick={() => setDeptFilter(deptFilter === selectedDeptCode ? "all" : selectedDeptCode)}
                className={`w-full h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  deptFilter === selectedDeptCode
                    ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs"
                    : "bg-[#F8FAFC] text-[#1E3A8A] border-[#1E3A8A]/30 hover:bg-slate-100"
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
                <span>
                  {deptFilter === selectedDeptCode ? `Filtered to ${selectedDeptCode}` : `Focus on ${selectedDeptCode}`}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setGenderFilter("all");
                  setSportFilter("all");
                  setDeptFilter("all");
                }}
                className="w-full h-9 px-3 rounded-lg text-xs font-semibold bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fixtures List */}
      <div className="space-y-4">
        {filteredFixtures.length > 0 ? (
          filteredFixtures.map((match) => {
            const isLive = match.status === "live";
            const isCompleted = match.status === "completed";
            const isUpcoming = match.status === "scheduled";
            const isBoys = match.bracket_gender === "boys";
            const timing = getReportingDetails(match.scheduled_at, match.reporting_mins_before);

            return (
              <div
                key={match.id}
                className={`bg-white rounded-xl border p-5 sm:p-6 shadow-xs transition-all hover:shadow-md ${
                  isLive
                    ? "border-[#DC2626]/40 ring-1 ring-[#DC2626]/20"
                    : "border-[#E2E8F0]"
                }`}
              >
                {/* Top Meta: Status + Sport + Bracket + Stage */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    {isLive && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-extrabold uppercase tracking-wider bg-[#DC2626] text-white shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping mr-1.5"></span>
                        LIVE NOW
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        <Clock className="w-3 h-3 mr-1 text-slate-500" />
                        Upcoming
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-700" />
                        Finished
                      </span>
                    )}

                    {/* Gender Bracket */}
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                        isBoys
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {isBoys ? "Boys Bracket" : "Girls Bracket"}
                    </span>

                    {/* Sport & Stage */}
                    <span className="text-xs font-bold text-[#0F172A]">
                      {match.sport_name}
                    </span>
                    <span className="text-xs text-[#475569]">
                      • {match.stage_label}
                    </span>
                  </div>

                  {/* Venue & Date */}
                  <div className="flex items-center gap-1.5 text-xs text-[#475569]">
                    <MapPin className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                    <span>{match.venue}</span>
                  </div>
                </div>

                {/* Center Fixture Grid: Team A vs Team B */}
                <div className="py-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Team A */}
                  <div className="md:col-span-5 flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-xs"
                        style={{ backgroundColor: match.team_a_color }}
                      >
                        {match.team_a_code}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm sm:text-base text-[#0F172A] truncate">
                          {match.team_a_code}
                        </div>
                        <div className="text-xs text-[#475569] truncate">
                          {match.team_a_name}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-xl font-bold tabular-nums text-[#0F172A]">
                      {match.team_a_score ?? "-"}
                    </div>
                  </div>

                  {/* VS / Middle Status */}
                  <div className="md:col-span-2 text-center py-1">
                    {isCompleted ? (
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          FT: {match.winner_code} Won
                        </span>
                      </div>
                    ) : isLive ? (
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold font-mono text-[#DC2626]">
                          {match.current_detail || "LIVE"}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">
                          VS
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-[#1E3A8A]">
                          {timing.matchTimeStr}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Team B */}
                  <div className="md:col-span-5 flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-xs"
                        style={{ backgroundColor: match.team_b_color }}
                      >
                        {match.team_b_code}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm sm:text-base text-[#0F172A] truncate">
                          {match.team_b_code}
                        </div>
                        <div className="text-xs text-[#475569] truncate">
                          {match.team_b_name}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-xl font-bold tabular-nums text-[#0F172A]">
                      {match.team_b_score ?? "-"}
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer: Reporting Time OR MVP / Notes */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Upcoming: Mandatory Reporting Time Alert */}
                  {isUpcoming && (
                    <div className="flex items-center gap-2 text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/80">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        <strong>Mandatory Reporting Time:</strong>{" "}
                        <span className="font-mono font-bold text-amber-950">
                          {timing.reportingStr}
                        </span>{" "}
                        ({match.reporting_mins_before} mins prior to {timing.matchTimeStr} start).
                      </span>
                    </div>
                  )}

                  {/* Completed: MVP Pill & Note */}
                  {isCompleted && (
                    <div className="flex items-center gap-3 flex-wrap">
                      {match.mvp_player_name && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                          <Trophy className="w-3.5 h-3.5 text-amber-600" />
                          <span>MVP:</span>
                          {match.mvp_player_id ? (
                            <Link
                              href={`/players/${match.mvp_player_id}`}
                              className="font-bold text-[#1E3A8A] hover:underline"
                            >
                              {match.mvp_player_name}
                            </Link>
                          ) : (
                            <span className="font-bold">{match.mvp_player_name}</span>
                          )}
                        </div>
                      )}
                      {match.result_note && (
                        <span className="text-slate-600 italic">
                          "{match.result_note}"
                        </span>
                      )}
                    </div>
                  )}

                  {/* Live: Active detail */}
                  {isLive && (
                    <div className="text-xs text-[#475569]">
                      <span className="font-semibold text-[#0F172A]">Live Status:</span>{" "}
                      {match.current_detail || "Match underway at main venue"}
                    </div>
                  )}

                  {/* Match Center Action Link */}
                  <Link
                    href={`/matches/${match.id}`}
                    className="self-end sm:self-center py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-[#1E3A8A] hover:text-white border border-[#E2E8F0] hover:border-[#1E3A8A] text-xs font-bold text-[#0F172A] transition-all flex items-center gap-1 shrink-0 group"
                  >
                    <span>Match Center & Lineup</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0F172A]">
              {fixtures.length === 0 ? "No matches scheduled yet" : "No fixtures found"}
            </h3>
            <p className="text-xs text-[#475569] mt-1 max-w-md mx-auto">
              {fixtures.length === 0
                ? "Fixtures and match schedules will appear here in real-time once scheduled and ratified by the SAC Sports Committee."
                : "No matches match the selected status, sport, or departmental filters."}
            </p>
            {fixtures.length > 0 && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setGenderFilter("all");
                  setSportFilter("all");
                  setDeptFilter("all");
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-semibold hover:bg-[#1E3A8A]/90 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
