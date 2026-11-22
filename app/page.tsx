"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Activity,
  Calendar,
  Shield,
  Award,
  Users,
  ChevronRight,
  BookOpen,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useDepartment } from "@/context/DepartmentContext";
import { NoticeTicker } from "@/components/NoticeTicker";
import { LiveMatchCarousel } from "@/components/LiveMatchCarousel";
import { OverallLeaderboard } from "@/components/OverallLeaderboard";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const { selectedDeptCode, setSelectedDeptCode, pinnedDepartment } = useDepartment();
  const [liveCount, setLiveCount] = useState<number>(0);
  const [medalsCount, setMedalsCount] = useState<number>(0);

  useEffect(() => {
    let channel: any = null;

    async function loadMetrics() {
      try {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

        if (hasSupabaseUrl) {
          const { count: liveMatches } = await supabase
            .from("matches")
            .select("*", { count: "exact", head: true })
            .eq("status", "live");
          if (typeof liveMatches === "number") setLiveCount(liveMatches);

          const { count: medals } = await supabase
            .from("podium_results")
            .select("*", { count: "exact", head: true });
          if (typeof medals === "number") setMedalsCount(medals);
        }
      } catch {}
    }

    loadMetrics();

    // Supabase Realtime subscription for live matches & medals counters
    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (hasSupabaseUrl) {
        channel = supabase
          .channel("home-metrics-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "matches" },
            () => loadMetrics()
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "podium_results" },
            () => loadMetrics()
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
    <div className="space-y-6 sm:space-y-8">
      {/* Official Rulebook & Directive Notice Ticker */}
      <NoticeTicker />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Pinned Department Active Filter Banner */}
        {pinnedDepartment && (
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-3">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: pinnedDepartment.color }}
              ></span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    My Department Focus:
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#1E3A8A]/10 text-[#1E3A8A]">
                    {pinnedDepartment.code}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#0F172A] mt-0.5">
                  {pinnedDepartment.name} • Faculty Coordinator: {pinnedDepartment.coordinator}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDeptCode("ALL")}
              className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Reset to All Departments
            </button>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
              <Trophy className="w-3.5 h-3.5" />
              Ashoka Sports Club • Annual Sports Meet 2026–27
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
              Official Sports Portal of AITM Varanasi
            </h1>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              Real-time match scores, tournament brackets, verified student athlete rosters, and
              departmental points standings across all 14 academic faculties.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[#E2E8F0]">
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                <Activity className="w-4 h-4 text-[#1E3A8A]" />
                Live Matches
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
                {String(liveCount).padStart(2, "0")}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                <Calendar className="w-4 h-4 text-[#D97706]" />
                Sporting Events
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
                19
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                <Users className="w-4 h-4 text-[#059669]" />
                AITM Teams
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
                14
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                <Award className="w-4 h-4 text-[#7C3AED]" />
                Medals Awarded
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
                {String(medalsCount).padStart(2, "0")}
              </div>
            </div>
          </div>
        </section>

        {/* Live Match Carousel */}
        <LiveMatchCarousel />

        {/* 14-Department Championship Leaderboard */}
        <OverallLeaderboard />

        {/* Quick Portal Navigation Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
              Explore AshokaSports Live
            </h2>
            <span className="text-xs text-[#475569]">Session 2026–27 Modules</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Points Table */}
            <Link
              href="/points-table"
              className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-md hover:border-[#1E3A8A]/40 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#D97706]/10 text-[#D97706] flex items-center justify-center font-bold">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#1E3A8A] transition-colors">
                  Official Points Table
                </h3>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Detailed medal breakdown (Gold, Silver, Bronze) and official championship points across all 14 AITM departments.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#1E3A8A] group-hover:translate-x-0.5 transition-transform">
                <span>View Full Standings</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </Link>

            {/* Card 2: Fixtures */}
            <Link
              href="/fixtures"
              className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-md hover:border-[#1E3A8A]/40 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#1E3A8A] transition-colors">
                  Fixtures & Event Schedule
                </h3>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Complete schedule of group matches, knockouts, athletic heats, court assignments, and campus venues.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#1E3A8A] group-hover:translate-x-0.5 transition-transform">
                <span>Browse Fixtures Calendar</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </Link>

            {/* Card 3: Rules & Records */}
            <Link
              href="/records"
              className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-md hover:border-[#1E3A8A]/40 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#059669]/10 text-[#059669] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#1E3A8A] transition-colors">
                  Rulebook & Records
                </h3>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Official SAC rulebook, squad limits, uniform regulations, reporting times, and historical AITM benchmarks.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#1E3A8A] group-hover:translate-x-0.5 transition-transform">
                <span>Review Official Rules</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
