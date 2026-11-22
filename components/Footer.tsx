import React from "react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] mt-16 text-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#475569]">
        <p className="text-center sm:text-left font-medium">
          © 2026–27 Ashoka Institute of Technology &amp; Management (AITM), Varanasi • Ashoka Sports Club
        </p>
        <p className="font-semibold text-[#1E3A8A] text-center sm:text-right shrink-0">
          Made by Pranav Pandey
        </p>
      </div>
    </footer>
  );
}
