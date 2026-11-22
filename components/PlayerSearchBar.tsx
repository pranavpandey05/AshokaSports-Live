"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, Loader2, User, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface SearchResultItem {
  id: string;
  full_name: string;
  roll_no: string;
  academic_year: number | string;
  jersey_no: number | null;
  default_role: string | null;
  department_code: string;
  department_name: string;
  badge_color: string;
  is_verified: boolean;
}

export function PlayerSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        let fetched: SearchResultItem[] = [];

        // Attempt live query against Supabase if configured
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
              jersey_no,
              default_role,
              is_verified,
              department:departments(name, short_code, badge_color)
            `)
            .or(`full_name.ilike.%${trimmed}%,roll_no.ilike.%${trimmed}%`)
            .limit(8);

          if (!error && data && data.length > 0) {
            fetched = data.map((item: any) => ({
              id: item.id,
              full_name: item.full_name,
              roll_no: item.roll_no,
              academic_year: item.academic_year ? `Year ${item.academic_year}` : "Student",
              jersey_no: item.jersey_no,
              default_role: item.default_role || "Athlete",
              department_code: item.department?.short_code || "AITM",
              department_name: item.department?.name || "Department",
              badge_color: item.department?.badge_color || "#1E3A8A",
              is_verified: !!item.is_verified,
            }));
          }
        }

        setResults(fetched);
        setIsOpen(true);
      } catch {
        setResults([]);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
          placeholder="Search athlete, roll no, or dept..."
          className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder:text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all"
        />
        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-[#1E3A8A] animate-spin" />}
          {query && !isLoading && (
            <button
              onClick={handleClear}
              type="button"
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Instant Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in-50 duration-150">
          <div className="px-3 py-2 bg-slate-50 border-b border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Student Athletes ({results.length})
            </span>
            <span className="text-[10px] text-slate-400">Esc to close</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {results.length > 0 ? (
              results.map((athlete) => (
                <Link
                  key={athlete.id}
                  href={`/players/${athlete.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                      style={{ backgroundColor: athlete.badge_color }}
                    >
                      {athlete.jersey_no ? (
                        <span className="font-mono tabular-nums text-[11px]">
                          #{athlete.jersey_no}
                        </span>
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-semibold text-[#0F172A] group-hover:text-[#1E3A8A] transition-colors truncate">
                          {athlete.full_name}
                        </span>
                        {athlete.is_verified && (
                          <span title="Verified Athlete" className="shrink-0 flex items-center">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#475569] mt-0.5">
                        <span className="font-mono tabular-nums">{athlete.roll_no}</span>
                        <span>•</span>
                        <span>{athlete.academic_year}</span>
                        {athlete.default_role && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 truncate max-w-[120px]">
                              {athlete.default_role}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Department Badge */}
                  <span
                    className="shrink-0 ml-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase text-white shadow-xs"
                    style={{ backgroundColor: athlete.badge_color }}
                  >
                    {athlete.department_code}
                  </span>
                </Link>
              ))
            ) : (
              <div className="p-4 text-center">
                <User className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-600 font-medium">No student athletes found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try searching by name, roll number, or department code
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
