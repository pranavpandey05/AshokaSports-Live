"use client";

import React, { useState, useEffect } from "react";
import { Megaphone, ChevronLeft, ChevronRight, Info } from "lucide-react";

const NOTICES = [
  {
    id: "notice-1",
    ref: "Ref: Ashoka/SAC/Sports/2026-27/003",
    text: "Mandatory prescribed sports dress & valid college ID required for all events (Ref: Ashoka/SAC/Sports/2026-27/003).",
    tag: "Eligibility & Dress Code",
  },
  {
    id: "notice-2",
    ref: "Reporting Protocol",
    text: "Reporting Time: 30 mins prior for Track & Field; 15 mins prior for Football, Volleyball, Kho-Kho & Indoor games.",
    tag: "Discipline",
  },
  {
    id: "notice-3",
    ref: "Scoring Weightage",
    text: "Track & Field Podium Points: 1st (Gold) = 10 pts, 2nd (Silver) = 8 pts, 3rd (Bronze) = 5 pts.",
    tag: "Championship Rules",
  },
];

export function NoticeTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % NOTICES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + NOTICES.length) % NOTICES.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % NOTICES.length);
  };

  const activeNotice = NOTICES[currentIndex];

  return (
    <div
      className="bg-amber-50 border-b border-amber-200 text-slate-900 transition-colors"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          {/* Left: Badge & Live Notice text */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 shrink-0 border border-amber-300">
              <Megaphone className="w-3.5 h-3.5 text-amber-800 shrink-0" />
              <span className="hidden sm:inline">Official Directive</span>
              <span className="sm:hidden">Notice</span>
            </span>

            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="font-semibold text-slate-900 truncate">
                {activeNotice.text}
              </span>
              <span className="hidden md:inline-flex px-1.5 py-0.2 rounded text-[10px] font-medium bg-white/80 border border-amber-200 text-amber-800 shrink-0">
                {activeNotice.tag}
              </span>
            </div>
          </div>

          {/* Right: Controls & Ticker dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1 mr-2">
              {NOTICES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? "w-4 bg-amber-700" : "bg-amber-300 hover:bg-amber-400"
                  }`}
                  aria-label={`Go to notice ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handlePrev}
              type="button"
              className="p-1 rounded hover:bg-amber-200/60 text-amber-900 transition-colors"
              aria-label="Previous notice"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              type="button"
              className="p-1 rounded hover:bg-amber-200/60 text-amber-900 transition-colors"
              aria-label="Next notice"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
