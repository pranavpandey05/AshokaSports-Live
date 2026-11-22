"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Shield,
  Medal,
  Award,
  Pin,
  ChevronRight,
  Info,
  CheckCircle2,
  User,
  Clock,
  Sparkles,
} from "lucide-react";
import { useDepartment } from "@/context/DepartmentContext";
import { SportGenderFilter } from "@/components/SportGenderFilter";
import { AITM_SPORTS } from "@/lib/constants/sports";
import { Sport } from "@/types/database";
import { supabase } from "@/lib/supabase/client";

interface LeaguePointsItem {
  id: string;
  department_code: string;
  department_name: string;
  badge_color: string;
  pool: "Pool A" | "Pool B";
  played: number;
  won: number;
  lost: number;
  drawn: number;
  score_diff: string | number; // NRR or Goal Difference
  points: number;
}

interface PodiumItem {
  position: 1 | 2 | 3;
  medal: "Gold" | "Silver" | "Bronze";
  pts: number;
  athlete_id: string;
  athlete_name: string;
  roll_no: string;
  department_code: string;
  department_name: string;
  badge_color: string;
  performance_mark: string;
}

// Fallback league data across pools (empty slate)
const FALLBACK_LEAGUE_STANDINGS: LeaguePointsItem[] = [];

// Fallback podium results for track/field/heat events (empty slate)
const FALLBACK_PODIUM_RESULTS: Record<"boys" | "girls", PodiumItem[]> = {
  boys: [],
  girls: [],
};

export default function PointsTablePage() {
  const { selectedDeptCode } = useDepartment();
  const [selectedSport, setSelectedSport] = useState<Sport>(AITM_SPORTS[0]);
  const [selectedBracketGender, setSelectedBracketGender] = useState<"boys" | "girls">("boys");
  const [selectedPool, setSelectedPool] = useState<"all" | "Pool A" | "Pool B">("all");
  const [leagueStandings, setLeagueStandings] = useState<LeaguePointsItem[]>(FALLBACK_LEAGUE_STANDINGS);
  const [podiumWinners, setPodiumWinners] = useState<PodiumItem[]>(FALLBACK_PODIUM_RESULTS.boys);
  const [isLoading, setIsLoading] = useState(false);

  // Sync data whenever sport or gender changes
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

        if (hasSupabaseUrl) {
          if (selectedSport.format_type === "podium_heat") {
            const { data } = await supabase
              .from("podium_results")
              .select(`
                position,
                awarded_pts,
                performance_mark,
                player:players(id, full_name, roll_no),
                department:departments(short_code, name, badge_color)
              `)
              .eq("sport_id", selectedSport.id)
              .eq("bracket_gender", selectedBracketGender)
              .order("position", { ascending: true });

            if (data && data.length > 0) {
              const mapped: PodiumItem[] = data.map((d: any) => ({
                position: d.position,
                medal: d.position === 1 ? "Gold" : d.position === 2 ? "Silver" : "Bronze",
                pts: d.awarded_pts,
                athlete_id: d.player?.id || "p-demo",
                athlete_name: d.player?.full_name || "Athlete",
                roll_no: d.player?.roll_no || "",
                department_code: d.department?.short_code || "AITM",
                department_name: d.department?.name || "Department",
                badge_color: d.department?.badge_color || "#1E3A8A",
                performance_mark: d.performance_mark || "N/A",
              }));
              setPodiumWinners(mapped);
            } else {
              setPodiumWinners(FALLBACK_PODIUM_RESULTS[selectedBracketGender]);
            }
          } else {
            // League standings
            const { data } = await supabase
              .from("points_table")
              .select(`
                id,
                played,
                won,
                lost,
                drawn,
                score_diff,
                total_points,
                department:departments(short_code, name, badge_color)
              `)
              .eq("sport_id", selectedSport.id)
              .eq("bracket_gender", selectedBracketGender)
              .order("total_points", { ascending: false })
              .order("score_diff", { ascending: false });

            if (data && data.length > 0) {
              const mapped: LeaguePointsItem[] = data.map((d: any, i: number) => ({
                id: d.id,
                department_code: d.department?.short_code || "AITM",
                department_name: d.department?.name || "Department",
                badge_color: d.department?.badge_color || "#1E3A8A",
                pool: i % 2 === 0 ? "Pool A" : "Pool B",
                played: d.played,
                won: d.won,
                lost: d.lost,
                drawn: d.drawn,
                score_diff: d.score_diff > 0 ? `+${d.score_diff}` : `${d.score_diff}`,
                points: d.total_points,
              }));
              setLeagueStandings(mapped);
            } else {
              setLeagueStandings(FALLBACK_LEAGUE_STANDINGS);
            }
          }
        } else {
          // Fallback demo values
          if (selectedSport.format_type === "podium_heat") {
            setPodiumWinners(FALLBACK_PODIUM_RESULTS[selectedBracketGender]);
          } else {
            setLeagueStandings(FALLBACK_LEAGUE_STANDINGS);
          }
        }
      } catch {
        setLeagueStandings(FALLBACK_LEAGUE_STANDINGS);
        setPodiumWinners(FALLBACK_PODIUM_RESULTS[selectedBracketGender]);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    // Supabase Realtime subscriptions on points_table, podium_results, and departments
    let channel: any = null;
    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (hasSupabaseUrl) {
        channel = supabase
          .channel(`points-table-sync-${selectedSport.id}-${selectedBracketGender}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "points_table" },
            () => loadData()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "podium_results" },
            () => loadData()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "departments" },
            () => loadData()
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
  }, [selectedSport, selectedBracketGender]);

  const isPodiumFormat = selectedSport.format_type === "podium_heat";

  const displayedLeague =
    selectedPool === "all"
      ? leagueStandings
      : leagueStandings.filter((row) => row.pool === selectedPool);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Rules Header */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A8A] mb-1">
            <Trophy className="w-4 h-4" />
            Ashoka Sports Club • Session 2026–27
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Gender-Specific Points Table & Standings
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-1">
            Strict gender isolation ensures Boys and Girls brackets and medal tallies are maintained independently.
          </p>
        </div>

        <span className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          Official SAC Standings
        </span>
      </div>

      {/* Sport & Gender Bracket Selector */}
      <SportGenderFilter
        selectedSport={selectedSport}
        onSelectSport={setSelectedSport}
        selectedBracketGender={selectedBracketGender}
        onSelectBracketGender={setSelectedBracketGender}
      />

      {/* Main Content: Either League Standings OR Podium Winners */}
      {isPodiumFormat ? (
        /* Podium Winners Presentation (Track & Field / Tug of War) */
        <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                  <Award className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-bold text-[#0F172A]">
                  Podium Results • {selectedSport.name} ({selectedBracketGender.toUpperCase()})
                </h2>
              </div>
              <p className="text-xs text-[#475569] mt-0.5">
                Official podium finishes: Gold (10 pts), Silver (8 pts), Bronze (5 pts) awarded toward the Overall Championship.
              </p>
            </div>

            <div className="text-xs font-semibold px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]">
              Scoring Unit: <span className="font-mono">{selectedSport.scoring_unit}</span>
            </div>
          </div>

          {/* 3-Column Podium Cards */}
          {podiumWinners.length === 0 ? (
            <div className="bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] p-10 text-center">
              <Medal className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#0F172A]">No Podium Results Yet</h3>
              <p className="text-xs text-[#475569] mt-1 max-w-sm mx-auto">
                Official medal positions for {selectedSport.name} ({selectedBracketGender === "boys" ? "Boys" : "Girls"}) will appear here once finals conclude.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {podiumWinners.map((winner) => {
                const isGold = winner.position === 1;
                const isSilver = winner.position === 2;
                const isBronze = winner.position === 3;

                return (
                  <div
                    key={winner.position}
                    className={`relative rounded-xl border p-6 flex flex-col justify-between transition-all ${
                      isGold
                        ? "bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/20 shadow-sm order-1 md:order-2 md:-translate-y-2"
                        : isSilver
                        ? "bg-slate-50/70 border-slate-300 shadow-xs order-2 md:order-1"
                        : "bg-amber-50/20 border-amber-200 shadow-xs order-3 md:order-3"
                    }`}
                  >
                    {/* Top Badge */}
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                            isGold
                              ? "bg-amber-500 text-white shadow-xs"
                              : isSilver
                              ? "bg-slate-500 text-white shadow-xs"
                              : "bg-amber-800 text-white shadow-xs"
                          }`}
                        >
                          <Medal className="w-3.5 h-3.5" />
                          {winner.medal} • Position #{winner.position}
                        </span>
                        <span className="font-mono font-bold text-xs text-[#1E3A8A]">
                          +{winner.pts} Pts
                        </span>
                      </div>

                      {/* Athlete Details */}
                      <div className="py-5 space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                            style={{ backgroundColor: winner.badge_color }}
                          >
                            {winner.department_code}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/players/${winner.athlete_id}`}
                              className="font-extrabold text-base text-[#0F172A] hover:text-[#1E3A8A] transition-colors truncate block"
                            >
                              {winner.athlete_name}
                            </Link>
                            <div className="text-xs text-[#475569] font-mono mt-0.5">
                              Roll: {winner.roll_no}
                            </div>
                          </div>
                        </div>

                        {/* Performance Mark */}
                        <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                            Official Mark / Record
                          </div>
                          <div className="text-xl font-extrabold font-mono tabular-nums text-[#0F172A] mt-0.5">
                            {winner.performance_mark}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom: Department Pill */}
                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-[#475569]">
                      <span className="truncate">{winner.department_name}</span>
                      <Link
                        href={`/players/${winner.athlete_id}`}
                        className="text-[#1E3A8A] font-semibold hover:underline flex items-center shrink-0"
                      >
                        Profile <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* Team League / Match Standings */
        <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 sm:p-6 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-[#1E3A8A]/10 text-[#1E3A8A]">
                  <Trophy className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-bold text-[#0F172A]">
                  {selectedSport.name} ({selectedBracketGender === "boys" ? "Boys" : "Girls"} Bracket) Standings
                </h2>
              </div>
              <p className="text-xs text-[#475569] mt-1">
                Top 2 teams in each pool qualify for the Championship Knockout Semifinals.
              </p>
            </div>

            {/* Pool Selector Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg self-start sm:self-center">
              {(["all", "Pool A", "Pool B"] as const).map((pool) => (
                <button
                  key={pool}
                  onClick={() => setSelectedPool(pool)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    selectedPool === pool
                      ? "bg-white text-[#1E3A8A] font-bold shadow-xs border border-slate-200"
                      : "text-[#475569] hover:text-[#0F172A]"
                  }`}
                >
                  {pool === "all" ? "All Pools" : pool}
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast Light Mode Points Table */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  <th className="py-3 px-2 sm:px-3.5 text-center w-10 sm:w-14">Rank</th>
                  <th className="py-3 px-2 sm:px-3.5">Department</th>
                  <th className="py-3 px-2 text-center hidden sm:table-cell">Pool</th>
                  <th className="py-3 px-1.5 sm:px-2.5 text-center font-mono">P</th>
                  <th className="py-3 px-1.5 sm:px-2.5 text-center font-mono text-emerald-700">W</th>
                  <th className="py-3 px-1.5 sm:px-2.5 text-center font-mono text-rose-700">L</th>
                  <th className="py-3 px-2 text-center font-mono text-slate-600 hidden sm:table-cell">D</th>
                  <th className="py-3 px-2 sm:px-3 text-right font-mono hidden xs:table-cell">NRR / GD</th>
                  <th className="py-3 px-3 sm:px-4 text-right font-extrabold text-[#1E3A8A] font-mono">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {displayedLeague.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#475569]">
                      <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-[#0F172A]">No Standings Recorded Yet</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Matches for {selectedSport.name} ({selectedBracketGender === "boys" ? "Boys" : "Girls"}) have not commenced yet.
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedLeague.map((row, index) => {
                  const isTopTwo = index < 2;
                  const isPinned = selectedDeptCode === row.department_code;

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isPinned
                          ? "bg-[#EFF6FF] border-l-4 border-l-[#1E3A8A] font-semibold"
                          : isTopTwo
                          ? "border-l-4 border-l-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* Rank with qualification badge */}
                      <td className="py-3.5 px-2 sm:px-3.5 text-center font-mono tabular-nums font-bold text-xs">
                        {isTopTwo ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs" title="Qualifying Position">
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-slate-500">#{index + 1}</span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-2 sm:px-3.5">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: row.badge_color }}
                          ></span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-[#0F172A] text-sm">
                                {row.department_code}
                              </span>
                              {isTopTwo && (
                                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                  Q
                                </span>
                              )}
                              {isPinned && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-[#1E3A8A] text-white">
                                  <Pin className="w-2.5 h-2.5" /> My Dept
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#475569] hidden sm:inline">
                              {row.department_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Pool */}
                      <td className="py-3.5 px-2 text-center text-xs font-semibold text-slate-600 hidden sm:table-cell">
                        {row.pool}
                      </td>

                      {/* Played */}
                      <td className="py-3.5 px-1.5 sm:px-2.5 text-center font-mono tabular-nums font-medium text-slate-700">
                        {row.played}
                      </td>

                      {/* Won */}
                      <td className="py-3.5 px-1.5 sm:px-2.5 text-center font-mono tabular-nums font-bold text-emerald-700">
                        {row.won}
                      </td>

                      {/* Lost */}
                      <td className="py-3.5 px-1.5 sm:px-2.5 text-center font-mono tabular-nums font-bold text-rose-700">
                        {row.lost}
                      </td>

                      {/* Drawn */}
                      <td className="py-3.5 px-2 text-center font-mono tabular-nums font-medium text-slate-600 hidden sm:table-cell">
                        {row.drawn}
                      </td>

                      {/* Score Diff / NRR */}
                      <td className="py-3.5 px-2 sm:px-3 text-right font-mono tabular-nums text-xs text-slate-600 hidden xs:table-cell">
                        {row.score_diff}
                      </td>

                      {/* Points */}
                      <td className="py-3.5 px-3 sm:px-4 text-right font-mono tabular-nums font-extrabold text-base text-[#1E3A8A]">
                        {row.points}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          {/* Table Legend */}
          <div className="p-4 bg-slate-50 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#475569]">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>Green border = Top 2 Knockout Qualification (Q)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#1E3A8A]"></span>
                <span>Blue row = Pinned "My Department"</span>
              </span>
            </div>

            <span className="text-[11px] text-slate-500">
              Win = 3 pts • Draw = 1 pt • Loss = 0 pts
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
