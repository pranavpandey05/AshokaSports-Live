"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Shield,
  Award,
  ChevronRight,
  Pin,
  Sparkles,
  Info,
} from "lucide-react";
import { useDepartment } from "@/context/DepartmentContext";
import { AITM_DEPARTMENTS } from "@/lib/constants/departments";
import { supabase } from "@/lib/supabase/client";

export interface DepartmentStanding {
  id: string;
  short_code: string;
  name: string;
  coordinator_name: string;
  badge_color: string;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  total_overall_pts: number;
}

// Baseline department standings initialized to 0 across all 14 official AITM departments
// Pure medal calculation: Gold = 10 pts, Silver = 8 pts, Bronze = 5 pts (Zero pre-filled points)
const FALLBACK_STANDINGS: DepartmentStanding[] = AITM_DEPARTMENTS.map((dept) => ({
  id: `dept-${dept.code.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
  short_code: dept.code,
  name: dept.name,
  coordinator_name: dept.coordinator,
  badge_color: dept.color,
  gold_count: 0,
  silver_count: 0,
  bronze_count: 0,
  total_overall_pts: 0,
}));

export function OverallLeaderboard() {
  const { selectedDeptCode, setSelectedDeptCode } = useDepartment();
  const [standings, setStandings] = useState<DepartmentStanding[]>(FALLBACK_STANDINGS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadStandings() {
      try {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

        if (!hasSupabaseUrl) {
          setStandings(FALLBACK_STANDINGS);
          return;
        }

        setIsLoading(true);
        const { data, error } = await supabase
          .from("departments")
          .select(
            "id, short_code, name, coordinator_name, badge_color, gold_count, silver_count, bronze_count, total_overall_pts"
          )
          .order("total_overall_pts", { ascending: false })
          .order("gold_count", { ascending: false })
          .order("silver_count", { ascending: false })
          .order("bronze_count", { ascending: false });

        if (!error && data && data.length > 0) {
          setStandings(data as DepartmentStanding[]);
        } else {
          setStandings(FALLBACK_STANDINGS);
        }
      } catch {
        setStandings(FALLBACK_STANDINGS);
      } finally {
        setIsLoading(false);
      }
    }

    loadStandings();

    // Supabase Realtime subscription for live standings updates
    let channel: any = null;
    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (hasSupabaseUrl) {
        channel = supabase
          .channel("departments-leaderboard-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "departments" },
            () => loadStandings()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "points_table" },
            () => loadStandings()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "podium_results" },
            () => loadStandings()
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

  return (
    <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden max-w-full">
      {/* Top Card Header */}
      <div className="p-5 sm:p-6 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A]">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
              AITM Overall Championship Table (Session 2026–27)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#475569] mt-1">
            Real-time standings across all 14 academic departments based on official medal tallies (Gold = 10, Silver = 8, Bronze = 5).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            Official Tally
          </span>
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            14 Departments
          </span>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              <th className="py-3 px-2 sm:px-3 text-center w-10 sm:w-14">Rank</th>
              <th className="py-3 px-2 sm:px-3.5">Department</th>
              <th className="py-3 px-3 hidden sm:table-cell">Coordinator</th>
              <th className="py-3 px-1.5 sm:px-2.5 text-center font-bold text-amber-700">Gold</th>
              <th className="py-3 px-1.5 sm:px-2.5 text-center font-bold text-slate-600">Silver</th>
              <th className="py-3 px-1.5 sm:px-2.5 text-center font-bold text-amber-800">Bronze</th>
              <th className="py-3 px-2.5 sm:px-4 text-right font-extrabold text-[#1E3A8A]">Total Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {standings.map((dept, index) => {
              const isPinned = selectedDeptCode === dept.short_code;

              return (
                <tr
                  key={dept.id || dept.short_code}
                  onClick={() =>
                    setSelectedDeptCode(isPinned ? "ALL" : dept.short_code)
                  }
                  title={`Click to ${isPinned ? "unpin" : "pin"} ${dept.name}`}
                  className={`cursor-pointer transition-colors ${
                    isPinned
                      ? "bg-blue-50/80 border-l-4 border-l-[#1E3A8A] font-semibold"
                      : "hover:bg-slate-50/70"
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3.5 px-2 sm:px-3 text-center font-mono font-bold tabular-nums text-xs">
                    {index === 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs shadow-xs">
                        1
                      </span>
                    ) : index === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-extrabold text-xs">
                        2
                      </span>
                    ) : index === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-extrabold text-xs">
                        3
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">#{index + 1}</span>
                    )}
                  </td>

                  {/* Department with Badge */}
                  <td className="py-3.5 px-2 sm:px-3.5">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <span
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: dept.badge_color }}
                      ></span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[#0F172A] text-sm">
                            {dept.short_code}
                          </span>
                          {isPinned && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-[#1E3A8A] text-white">
                              <Pin className="w-2.5 h-2.5" /> My Dept
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#475569] truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                          {dept.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Coordinator */}
                  <td className="py-3.5 px-3 hidden sm:table-cell text-xs text-[#475569]">
                    {dept.coordinator_name}
                  </td>

                  {/* Gold Medals */}
                  <td className="py-3.5 px-1.5 sm:px-2.5 text-center font-mono tabular-nums font-bold text-amber-700 text-sm">
                    {dept.gold_count}
                  </td>

                  {/* Silver Medals */}
                  <td className="py-3.5 px-1.5 sm:px-2.5 text-center font-mono tabular-nums font-bold text-slate-600 text-sm">
                    {dept.silver_count}
                  </td>

                  {/* Bronze Medals */}
                  <td className="py-3.5 px-1.5 sm:px-2.5 text-center font-mono tabular-nums font-bold text-amber-900 text-sm">
                    {dept.bronze_count}
                  </td>

                  {/* Total Overall Points */}
                  <td className="py-3.5 px-2.5 sm:px-4 text-right font-mono tabular-nums font-extrabold text-base text-[#1E3A8A]">
                    {dept.total_overall_pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Rule Explanation & Quick Link */}
      <div className="p-4 bg-slate-50 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#475569]">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#1E3A8A] shrink-0" />
          <span>
            <strong className="text-[#0F172A]">Championship Points:</strong> 1st (Gold) = 10 pts • 2nd (Silver) = 8 pts • 3rd (Bronze) = 5 pts.
          </span>
        </div>

        <Link
          href="/points"
          className="inline-flex items-center gap-1 font-semibold text-[#1E3A8A] hover:underline shrink-0"
        >
          <span>View Detailed Points Breakdown</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
