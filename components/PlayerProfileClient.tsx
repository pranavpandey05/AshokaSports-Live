"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Trophy,
  Activity,
  Award,
  Calendar,
  ChevronRight,
  MapPin,
  Flame,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export interface PlayerProfileData {
  id: string;
  full_name: string;
  roll_no: string;
  academic_year: string;
  gender: string;
  jersey_no: number | null;
  default_role: string;
  is_verified: boolean;
  department_code: string;
  department_name: string;
  badge_color: string;
  coordinator_name: string;
  stats: {
    matches_played: number;
    primary_metric_label: string;
    primary_metric_value: string | number;
    mvp_count: number;
  };
  matches: {
    id: string;
    sport_name: string;
    stage_label: string;
    opponent_code: string;
    opponent_name: string;
    score: string;
    status: string;
    date: string;
    is_win: boolean;
  }[];
}

export function PlayerProfileClient({ playerId }: { playerId: string }) {
  const [player, setPlayer] = useState<PlayerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadPlayerData() {
      setIsLoading(true);
      setNotFound(false);
      try {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

        if (hasSupabaseUrl) {
          const { data, error } = await supabase
            .from("players")
            .select(`
              id,
              full_name,
              roll_no,
              academic_year,
              gender,
              jersey_no,
              default_role,
              is_verified,
              department:departments(name, short_code, badge_color, coordinator_name)
            `)
            .eq("id", playerId)
            .maybeSingle();

          const athlete: any = data;
          if (!error && athlete) {
            setPlayer({
              id: athlete.id,
              full_name: athlete.full_name,
              roll_no: athlete.roll_no,
              academic_year: athlete.academic_year ? `Year ${athlete.academic_year}` : "Student Athlete",
              gender: athlete.gender === "girls" || athlete.gender === "female" ? "Girls" : "Boys",
              jersey_no: athlete.jersey_no,
              default_role: athlete.default_role || "Athlete",
              is_verified: !!athlete.is_verified,
              department_code: athlete.department?.short_code || "AITM",
              department_name: athlete.department?.name || "Department",
              badge_color: athlete.department?.badge_color || "#1E3A8A",
              coordinator_name: athlete.department?.coordinator_name || "Coordinator",
              stats: {
                matches_played: 0,
                primary_metric_label: "Session Points",
                primary_metric_value: "0 Points",
                mvp_count: 0,
              },
              matches: [],
            });
            setIsLoading(false);
            return;
          }
        }
        setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadPlayerData();
  }, [playerId]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A8A]"></div>
        <div className="text-sm font-semibold text-[#475569]">Loading student athlete profile...</div>
      </div>
    );
  }

  if (notFound || !player) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
            Student Athlete Not Found
          </h1>
          <p className="text-sm text-[#475569] max-w-md mx-auto">
            No athlete record matching ID <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs">{playerId}</code> was found in the official AITM sports database.
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3A8A] text-white text-xs font-bold hover:bg-blue-900 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portal Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal Dashboard
        </Link>
      </div>

      {/* Main Student Athlete Identity Card */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-sm shrink-0"
              style={{ backgroundColor: player.badge_color }}
            >
              {player.jersey_no ? (
                <span className="font-mono tabular-nums">#{player.jersey_no}</span>
              ) : (
                <User className="w-9 h-9" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  {player.full_name}
                </h1>
                {player.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Athlete
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#475569] font-medium flex-wrap">
                <span className="font-mono font-bold text-[#0F172A]">
                  Roll: {player.roll_no}
                </span>
                <span>•</span>
                <span>{player.academic_year}</span>
                <span>•</span>
                <span className="font-semibold text-[#1E3A8A]">{player.default_role}</span>
              </div>
            </div>
          </div>

          {/* Department badge pill */}
          <div className="self-start sm:self-center">
            <div className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: player.badge_color }}
              ></span>
              <div>
                <div className="font-extrabold text-sm text-[#0F172A]">
                  {player.department_code}
                </div>
                <div className="text-[11px] text-[#475569]">{player.department_name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fest Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#475569]">
              <Activity className="w-4 h-4 text-[#1E3A8A]" />
              Matches in Squad
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
              {player.stats.matches_played}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Active Lineup Appearances</div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#475569]">
              <Flame className="w-4 h-4 text-[#D97706]" />
              {player.stats.primary_metric_label}
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
              {player.stats.primary_metric_value}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Session 2026–27 Contributions</div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#475569]">
              <Trophy className="w-4 h-4 text-[#059669]" />
              MVP Recognitions
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
              {player.stats.mvp_count}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Player of the Match Awards</div>
          </div>
        </div>
      </section>

      {/* Match Appearances Section */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1E3A8A]" />
            Official Match Appearances & Scorecards
          </h2>
          <span className="text-xs text-[#475569]">Ashoka Sports Club 2026–27</span>
        </div>

        <div className="divide-y divide-slate-100">
          {player.matches.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No match fixtures or official tournament stats recorded yet for this athlete in the 2026–27 session.
            </div>
          ) : (
            player.matches.map((m) => (
              <div
                key={m.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-3 rounded-lg transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-[#0F172A]">
                      {m.sport_name} • {m.stage_label}
                    </span>
                    <span className="text-xs font-semibold text-[#475569]">
                      vs {m.opponent_code} ({m.opponent_name})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 font-mono">
                    <span>{m.date}</span>
                    <span>•</span>
                    <span>Score: {m.score}</span>
                    <span>•</span>
                    <span className={m.is_win ? "text-emerald-700 font-bold" : "text-slate-600"}>
                      {m.status}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/matches/${m.id}`}
                  className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-[#1E3A8A] hover:text-white text-xs font-bold text-[#0F172A] transition-colors flex items-center gap-1 self-start sm:self-center shrink-0"
                >
                  <span>Match Center</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Privacy Notice Card */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#475569] flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <span>
          <strong>Student Privacy Protected:</strong> Under Ashoka Institute sports policy, student contact numbers
          and personal emails are strictly confidential and excluded from public sports portal feeds.
        </span>
      </div>
    </div>
  );
}
