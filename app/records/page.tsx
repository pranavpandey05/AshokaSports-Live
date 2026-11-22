"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Trophy,
  Shield,
  Medal,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { AITM_SPORTS } from "@/lib/constants/sports";
import { supabase } from "@/lib/supabase/client";

export interface RecordRow {
  id: string;
  sport_name: string;
  event_name: string;
  bracket_gender: "boys" | "girls";
  record_holder_name: string;
  department_code: string;
  department_name: string;
  badge_color: string;
  record_value: string;
  session_year: string;
  verified_by: string;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<"all" | "boys" | "girls">("all");
  const [sportFilter, setSportFilter] = useState<string>("all");

  useEffect(() => {
    async function loadRecords() {
      try {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

        if (hasSupabaseUrl) {
          const { data, error } = await supabase
            .from("records")
            .select(`
              id,
              event_name,
              bracket_gender,
              record_holder_name,
              department_name,
              record_value,
              session_year,
              verified_by,
              sport:sports(name)
            `);

          if (!error && data && data.length > 0) {
            const mapped: RecordRow[] = data.map((r: any) => ({
              id: r.id,
              sport_name: r.sport?.name || "Athletics",
              event_name: r.event_name,
              bracket_gender: r.bracket_gender,
              record_holder_name: r.record_holder_name,
              department_code: r.department_name.split(" ")[0] || "AITM",
              department_name: r.department_name,
              badge_color: "#1E3A8A",
              record_value: r.record_value,
              session_year: r.session_year,
              verified_by: r.verified_by || "SAC Athletics Council",
            }));
            setRecords(mapped);
          }
        }
      } catch {
        // Fallback gracefully to empty records
      } finally {
        setIsLoading(false);
      }
    }

    loadRecords();
  }, []);

  const filteredRecords = records.filter((rec) => {
    if (genderFilter !== "all" && rec.bracket_gender !== genderFilter) return false;
    if (sportFilter !== "all" && rec.sport_name !== sportFilter) return false;
    return true;
  });

  const uniqueSports = Array.from(new Set(records.map((r) => r.sport_name)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Rules Notice Header */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#059669] mb-1">
            <Award className="w-4 h-4" />
            Ashoka Sports Club • Session 2026–27
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            Official Rulebook & Institute Records
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-1 max-w-2xl">
            Official guidelines, player eligibility rules, scoring weightages, and benchmark records
            governing the Annual Sports Meet at Ashoka Institute of Technology and Management (AITM), Varanasi.
          </p>
        </div>

        <span className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          AITM Approved Regulations
        </span>
      </div>

      {/* Official 2026-27 Rulebook Reference Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1E3A8A]" />
            2026–27 Ashoka Sports Club Key Directives
          </h2>
          <span className="text-xs text-slate-500 font-mono">Ref: Ashoka/SAC/Sports/2026-27/003</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Rule 1: Indoor Games Limit */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center font-bold text-xs">
                01
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Indoor Games Maximum 2 Games Rule
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                An athlete can participate in a maximum of <strong>2 indoor games</strong> (Chess, Carrom,
                Badminton, Table Tennis) to prevent scheduling conflicts and encourage wider student participation.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] font-semibold text-[#1E3A8A]">
              Indoor Cap: ≤ 2 Events per Athlete
            </div>
          </div>

          {/* Rule 2: Track & Field 1+2 or 2+1 Rule */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs">
                02
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Athletics: 1+2 or 2+1 Rule
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                In Track & Field, an athlete can participate in at most <strong>3 athletic events</strong> in combination of
                either <strong>1 Track + 2 Field</strong> or <strong>2 Track + 1 Field</strong> (excluding team 4x100m relay).
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] font-semibold text-amber-800">
              Athletics Limit: Max 3 Events
            </div>
          </div>

          {/* Rule 3: Podium Points */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs">
                03
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Podium Championship Points
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Track & Field, Tug of War, and Individual heats award points directly toward the Overall Championship Trophy:
                <strong> 1st (Gold) = 10 pts</strong>, <strong>2nd (Silver) = 8 pts</strong>, and <strong>3rd (Bronze) = 5 pts</strong>.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-800">
              Gold: 10 pts • Silver: 8 pts • Bronze: 5 pts
            </div>
          </div>

          {/* Rule 4: Mandatory Sports Dress & ID */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-800 flex items-center justify-center font-bold text-xs">
                04
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Mandatory Dress Code & College ID
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Prescribed departmental sports kit/jersey and non-marking sports shoes mandatory. Physical College ID
                must be produced at reporting call: <strong>30 mins prior</strong> for Track; <strong>15 mins prior</strong> for games.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] font-semibold text-rose-800">
              No ID Card = Ineligible to Play
            </div>
          </div>
        </div>
      </section>

      {/* Official Coordinators Reference Box */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <UserCheck className="w-4 h-4 text-[#1E3A8A]" />
          <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
            Sports Council Executive Authority
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-[10px] uppercase font-bold text-slate-500">Institute Director</div>
            <div className="font-extrabold text-sm text-[#0F172A] mt-0.5">Dr. Sarika Shrivastava</div>
            <div className="text-[11px] text-[#475569]">Patron-in-Chief</div>
          </div>

          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-[10px] uppercase font-bold text-slate-500">SAC Convenor</div>
            <div className="font-extrabold text-sm text-[#0F172A] mt-0.5">Mr. Pankaj Kr. Srivastava</div>
            <div className="text-[11px] text-[#475569]">Student Activity Council</div>
          </div>

          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-[10px] uppercase font-bold text-[#1E3A8A]">Sports Coordinator</div>
            <div className="font-extrabold text-sm text-[#0F172A] mt-0.5">Mr. Surendra Kushwaha</div>
            <div className="text-[11px] text-[#475569]">Electrical Engineering (EE)</div>
          </div>

          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-[10px] uppercase font-bold text-[#1E3A8A]">Sports Co-Coordinator</div>
            <div className="font-extrabold text-sm text-[#0F172A] mt-0.5">Mr. Lalit Kumar</div>
            <div className="text-[11px] text-[#475569]">Electronics & Communication (ECE)</div>
          </div>
        </div>
      </section>

      {/* Fest & All-Time Records Section */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                <Trophy className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-[#0F172A]">
                Fest & All-Time Sporting Benchmarks
              </h2>
            </div>
            <p className="text-xs text-[#475569] mt-0.5">
              Verified records set by student athletes in inter-departmental tournaments.
            </p>
          </div>

          {/* Gender & Sport Filter Pills */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Gender Filter */}
            <div className="inline-flex p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
              <button
                onClick={() => setGenderFilter("all")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  genderFilter === "all"
                    ? "bg-white text-[#0F172A] shadow-xs font-bold"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setGenderFilter("boys")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  genderFilter === "boys"
                    ? "bg-blue-50 text-blue-700 shadow-xs font-bold border border-blue-200"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Boys
              </button>
              <button
                onClick={() => setGenderFilter("girls")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  genderFilter === "girls"
                    ? "bg-rose-50 text-rose-700 shadow-xs font-bold border border-rose-200"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                Girls
              </button>
            </div>

            {/* Sport Dropdown */}
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            >
              <option value="all">All Events ({uniqueSports.length})</option>
              {uniqueSports.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-3">Bracket</th>
                <th className="py-3 px-3 font-mono font-bold text-[#1E3A8A]">Record Benchmark</th>
                <th className="py-3 px-4">Record Holder</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Session</th>
                <th className="py-3 px-4 hidden md:table-cell">Verified By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#1E3A8A] border-r-transparent mb-2"></div>
                    <div className="text-xs font-semibold text-[#475569]">Loading Institute Records...</div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <div className="font-bold text-[#0F172A]">
                      {records.length === 0
                        ? "No Official Records Recorded Yet"
                        : "No Records Match Current Filters"}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {records.length === 0
                        ? "Official records and sporting benchmarks ratified by the SAC Athletics Jury will appear here once officially entered."
                        : "Try choosing another gender or sport filter."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                      {rec.event_name}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          rec.bracket_gender === "boys"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {rec.bracket_gender}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums font-extrabold text-sm sm:text-base text-[#1E3A8A]">
                      {rec.record_value}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                      {rec.record_holder_name}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white shadow-2xs"
                        style={{ backgroundColor: rec.badge_color }}
                      >
                        {rec.department_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-slate-500 font-medium">
                      {rec.session_year}
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell text-xs text-[#475569]">
                      {rec.verified_by}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Records Footer */}
        <div className="p-4 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#475569]">
          <span>
            New benchmarks established during the 2026–27 session will be ratified by the Athletics Jury and updated in real-time.
          </span>
          <span className="font-semibold text-[#1E3A8A]">Ashoka Sports Club</span>
        </div>
      </section>
    </div>
  );
}
