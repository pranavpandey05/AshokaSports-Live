"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Radio,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Flame,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export interface CarouselMatch {
  id: string;
  status: "live" | "scheduled" | "completed";
  sport_name: string;
  bracket_gender: "boys" | "girls";
  stage_label: string;
  team_a_code: string;
  team_a_name: string;
  team_a_color: string;
  team_a_score: string | number | null;
  team_b_code: string;
  team_b_name: string;
  team_b_color: string;
  team_b_score: string | number | null;
  venue: string;
  scheduled_time: string;
  current_detail?: string;
}

// Clean baseline: Zero pre-feeded fake matches or scores
const FALLBACK_MATCHES: CarouselMatch[] = [];

export function LiveMatchCarousel() {
  const [matches, setMatches] = useState<CarouselMatch[]>(FALLBACK_MATCHES);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchMatches = async () => {
    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (!hasSupabaseUrl) {
        setMatches(FALLBACK_MATCHES);
        return;
      }

      // Fetch live matches and next upcoming matches
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          status,
          bracket_gender,
          stage_label,
          team_a_score,
          team_b_score,
          venue,
          scheduled_at,
          sport:sports(name),
          team_a:departments!matches_team_a_id_fkey(short_code, name, badge_color),
          team_b:departments!matches_team_b_id_fkey(short_code, name, badge_color)
        `)
        .in("status", ["live", "scheduled"])
        .order("status", { ascending: false }) // 'live' first
        .order("scheduled_at", { ascending: true })
        .limit(9);

      if (!error && data && data.length > 0) {
        const formatted: CarouselMatch[] = data.map((m: any) => ({
          id: m.id,
          status: m.status,
          sport_name: m.sport?.name || "Sport",
          bracket_gender: m.bracket_gender || "boys",
          stage_label: m.stage_label || "Group Match",
          team_a_code: m.team_a?.short_code || "TBD",
          team_a_name: m.team_a?.name || "Team A",
          team_a_color: m.team_a?.badge_color || "#1E3A8A",
          team_a_score: m.team_a_score ?? (m.status === "live" ? "0" : "-"),
          team_b_code: m.team_b?.short_code || "TBD",
          team_b_name: m.team_b?.name || "Team B",
          team_b_color: m.team_b?.badge_color || "#DC2626",
          team_b_score: m.team_b_score ?? (m.status === "live" ? "0" : "-"),
          venue: m.venue || "AITM Campus Ground",
          scheduled_time: new Date(m.scheduled_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        setMatches(formatted);
      } else {
        setMatches(FALLBACK_MATCHES);
      }
    } catch {
      setMatches(FALLBACK_MATCHES);
    }
  };

  useEffect(() => {
    fetchMatches();

    // Subscribe to Supabase Realtime changes on matches table
    try {
      const channel = supabase
        .channel("matches-live-carousel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "matches" },
          () => {
            fetchMatches();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Ignore websocket errors if offline
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const offset = direction === "left" ? -340 : 340;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <section className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Header bar with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse"></span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight">
              Match Center & Live Scores
            </h2>
          </div>
          {liveCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">
              {liveCount} Live
            </span>
          )}
        </div>

        {/* Carousel Scroll Controls (visible only when matches exist) */}
        {matches.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-colors shadow-xs"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-colors shadow-xs"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Carousel Track or Clean Empty State */}
      {matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-7 text-center space-y-2 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Radio className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-[#0F172A]">No Matches Currently Scheduled or Live</h3>
          <p className="text-xs text-[#475569] max-w-md mx-auto">
            Live pitch scores and upcoming tournament fixtures will appear here in real time once ground scorers and the Sports Committee broadcast matches.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Link
              href="/fixtures"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1E3A8A]/10 text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white transition-colors"
            >
              <span>View Fixtures & Rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="w-full max-w-full flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-2 scroll-smooth no-scrollbar touch-pan-x"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
        {matches.map((match) => {
          const isLive = match.status === "live";
          const isBoys = match.bracket_gender === "boys";

          return (
            <div
              key={match.id}
              className={`shrink-0 w-[280px] xs:w-80 sm:w-[325px] bg-white border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                isLive
                  ? "border-[#DC2626]/40 ring-1 ring-[#DC2626]/20"
                  : "border-[#E2E8F0] hover:border-slate-300"
              }`}
            >
              {/* Card Top: Status Pill + Sport + Gender + Stage */}
              <div>
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Status Pill */}
                    {isLive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#DC2626] text-white shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping mr-1"></span>
                        LIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        <Clock className="w-3 h-3 mr-1 text-slate-500" />
                        UPCOMING
                      </span>
                    )}

                    {/* Gender Badge */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                        isBoys
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {isBoys ? "Boys" : "Girls"}
                    </span>
                  </div>

                  {/* Sport & Stage */}
                  <span className="text-[11px] font-semibold text-[#475569] truncate">
                    {match.sport_name} • {match.stage_label}
                  </span>
                </div>

                {/* Score Area: Team A vs Team B */}
                <div className="py-4 space-y-3">
                  {/* Team A */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-6 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: match.team_a_color }}
                      ></span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-[#0F172A] truncate">
                          {match.team_a_code}
                        </div>
                        <div className="text-[11px] text-[#475569] truncate max-w-[130px]">
                          {match.team_a_name}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-mono tabular-nums text-lg font-bold ${
                        isLive ? "text-[#0F172A]" : "text-slate-400"
                      }`}
                    >
                      {match.team_a_score ?? "-"}
                    </div>
                  </div>

                  {/* Team B */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-6 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: match.team_b_color }}
                      ></span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-[#0F172A] truncate">
                          {match.team_b_code}
                        </div>
                        <div className="text-[11px] text-[#475569] truncate max-w-[130px]">
                          {match.team_b_name}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-mono tabular-nums text-lg font-bold ${
                        isLive ? "text-[#0F172A]" : "text-slate-400"
                      }`}
                    >
                      {match.team_b_score ?? "-"}
                    </div>
                  </div>
                </div>

                {/* Match Venue & Time Detail */}
                <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475569] space-y-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                    <span className="truncate">{match.venue}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                    <span>{match.scheduled_time}</span>
                    {match.current_detail && (
                      <span className="text-[#1E3A8A] font-semibold truncate max-w-[150px]">
                        {match.current_detail}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer: Match Center Link */}
              <div className="pt-3 mt-3 border-t border-slate-100">
                <Link
                  href={`/matches/${match.id}`}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-[#1E3A8A] hover:text-white border border-[#E2E8F0] hover:border-[#1E3A8A] text-xs font-semibold text-[#0F172A] transition-all flex items-center justify-center gap-1.5 group"
                >
                  <span>Match Center & Lineup</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </section>
  );
}
