"use client";

import React, { useState, useEffect } from "react";
import { Lock, Trophy, Activity, Filter, Check, Shield } from "lucide-react";
import { Sport } from "@/types/database";
import { AITM_SPORTS } from "@/lib/constants/sports";
import { supabase } from "@/lib/supabase/client";

interface SportGenderFilterProps {
  selectedSport: Sport;
  onSelectSport: (sport: Sport) => void;
  selectedBracketGender: "boys" | "girls";
  onSelectBracketGender: (gender: "boys" | "girls") => void;
}

export function SportGenderFilter({
  selectedSport,
  onSelectSport,
  selectedBracketGender,
  onSelectBracketGender,
}: SportGenderFilterProps) {
  const [sports, setSports] = useState<Sport[]>(AITM_SPORTS);
  const [activeCategory, setActiveCategory] = useState<
    "all" | "outdoor" | "indoor" | "track" | "field"
  >("all");

  // Load sports from Supabase if connected
  useEffect(() => {
    async function loadSports() {
      try {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

        if (hasSupabaseUrl) {
          const { data, error } = await supabase
            .from("sports")
            .select("*")
            .order("category_group", { ascending: true })
            .order("name", { ascending: true });

          if (!error && data && data.length > 0) {
            setSports(data as Sport[]);
          }
        }
      } catch {
        // Fallback to constant
      }
    }

    loadSports();
  }, []);

  // When selectedSport changes, enforce strict gender bracket rules
  useEffect(() => {
    if (selectedSport.gender_category === "boys" && selectedBracketGender !== "boys") {
      onSelectBracketGender("boys");
    } else if (selectedSport.gender_category === "girls" && selectedBracketGender !== "girls") {
      onSelectBracketGender("girls");
    }
  }, [selectedSport, selectedBracketGender, onSelectBracketGender]);

  const categories = [
    { id: "all", label: "All Sports" },
    { id: "outdoor", label: "Outdoor" },
    { id: "indoor", label: "Indoor" },
    { id: "track", label: "Track" },
    { id: "field", label: "Field" },
  ] as const;

  const filteredSports =
    activeCategory === "all"
      ? sports
      : sports.filter((s) => s.category_group === activeCategory);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs space-y-5">
      {/* Top Row: Category Tabs + Gender Bracket Enforcer */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-[#1E3A8A] text-white shadow-xs"
                  : "bg-[#F8FAFC] text-[#475569] hover:bg-slate-100 hover:text-[#0F172A] border border-[#E2E8F0]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gender Bracket Control */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-[#475569] uppercase tracking-wider hidden sm:inline">
            Tournament Bracket:
          </span>

          {selectedSport.gender_category === "boys" ? (
            /* Locked Boys Only Badge */
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-xs">
              <Lock className="w-3.5 h-3.5 text-blue-700" />
              <span>Boys Only Bracket</span>
            </div>
          ) : selectedSport.gender_category === "girls" ? (
            /* Locked Girls Only Badge */
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-xs">
              <Lock className="w-3.5 h-3.5 text-rose-700" />
              <span>Girls Only Bracket</span>
            </div>
          ) : (
            /* Segmented Toggle for 'both' */
            <div className="inline-flex p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg shadow-inner">
              <button
                type="button"
                onClick={() => onSelectBracketGender("boys")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedBracketGender === "boys"
                    ? "bg-white text-blue-700 shadow-xs border border-blue-200"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                <span>Boys Bracket</span>
                {selectedBracketGender === "boys" && <Check className="w-3.5 h-3.5 text-blue-700" />}
              </button>
              <button
                type="button"
                onClick={() => onSelectBracketGender("girls")}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedBracketGender === "girls"
                    ? "bg-white text-rose-700 shadow-xs border border-rose-200"
                    : "text-[#475569] hover:text-[#0F172A]"
                }`}
              >
                <span>Girls Bracket</span>
                {selectedBracketGender === "girls" && <Check className="w-3.5 h-3.5 text-rose-700" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sports Selector Grid / Pills */}
      <div>
        <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span>Select Sport Event ({filteredSports.length})</span>
          <span className="text-[10px] text-slate-400">
            Selected: <strong className="text-[#0F172A]">{selectedSport.name}</strong> (
            {selectedSport.format_type === "podium_heat" ? "Podium Heats" : "League / Knockout"})
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {filteredSports.map((sport) => {
            const isSelected = selectedSport.id === sport.id;

            return (
              <button
                key={sport.id}
                onClick={() => onSelectSport(sport)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs"
                    : "bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <span>{sport.name}</span>

                {/* Micro gender rule indicator */}
                {sport.gender_category === "boys" && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    Boys
                  </span>
                )}
                {sport.gender_category === "girls" && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    Girls
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
