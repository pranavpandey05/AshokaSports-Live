import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, Award, Shield, UserCheck, ExternalLink } from "lucide-react";
import { AITM_DEPARTMENTS } from "@/lib/constants/departments";

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] mt-16 text-[#0F172A]">
      {/* Upper Info Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Institute & Portal Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center p-0.5 border border-[#E2E8F0] shadow-2xs shrink-0">
                <Image
                  src="/images/ashoka-logo.png"
                  alt="Ashoka Institute of Technology and Management"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-lg text-[#0F172A]">
                  AshokaSports
                </span>
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">
                  Live
                </span>
                <p className="text-xs text-[#475569] font-medium">Ashoka Sports Club • 2026–27</p>
              </div>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed">
              The official centralized sports intelligence and live scoring portal for Ashoka Institute
              of Technology and Management (AITM), Varanasi.
            </p>

            <div className="pt-2 text-xs text-[#475569] space-y-1.5">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
                <span>Ashoka Engineering Chauraha Paharia, Sarnath, Varanasi-221007 (U.P)</span>
              </div>
            </div>
          </div>

          {/* Col 2: Sports Council & Leadership */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#1E3A8A]" />
              Sports Council & Leadership
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-[10px] uppercase font-semibold text-[#475569]">Director</div>
                <div className="font-bold text-[#0F172A] text-sm">Dr. Sarika Shrivastava</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-[10px] uppercase font-semibold text-[#475569]">SAC Convenor</div>
                <div className="font-bold text-[#0F172A] text-sm">Mr. Pankaj Kr. Srivastava</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-[10px] uppercase font-semibold text-[#475569]">
                  Sports Coordinator
                </div>
                <div className="font-bold text-[#0F172A] text-sm">
                  Mr. Surendra Kushwaha <span className="text-xs font-normal text-[#475569]">(EE)</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-[10px] uppercase font-semibold text-[#475569]">
                  Sports Co-Coordinator
                </div>
                <div className="font-bold text-[#0F172A] text-sm">
                  Mr. Lalit Kumar <span className="text-xs font-normal text-[#475569]">(ECE)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: Participating Departments (14 Branches) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#D97706]" />
              14 Competing Teams
            </h3>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {AITM_DEPARTMENTS.map((dept) => (
                <div
                  key={dept.code}
                  className="px-2 py-1.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-1.5"
                  title={`${dept.name} — Coordinator: ${dept.coordinator}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: dept.color }}
                  ></span>
                  <span className="font-bold text-[#0F172A] text-[11px] truncate">{dept.code}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#475569] pt-1">
              All 14 academic faculties compete for the AITM Overall Championship Trophy.
            </p>
          </div>

          {/* Col 4: Quick Portals & Administration */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#059669]" />
              Portal Access & Links
            </h3>
            <ul className="space-y-2 text-xs text-[#475569]">
              <li>
                <Link href="/points" className="hover:text-[#1E3A8A] hover:underline flex items-center gap-1">
                  Overall Championship Standings
                </Link>
              </li>
              <li>
                <Link href="/fixtures" className="hover:text-[#1E3A8A] hover:underline flex items-center gap-1">
                  Fixtures & Event Calendar
                </Link>
              </li>
              <li>
                <Link href="/records" className="hover:text-[#1E3A8A] hover:underline flex items-center gap-1">
                  Institute Records & Rulebook
                </Link>
              </li>
              <li>
                <Link href="/scorer" className="text-[#DC2626] font-semibold hover:underline flex items-center gap-1">
                  Referee / Scorer Live Match Console
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-[#D97706] font-semibold hover:underline flex items-center gap-1">
                  Faculty Coordinator & Admin Login
                </Link>
              </li>
            </ul>

            <div className="pt-3">
              <div className="p-3 rounded-lg bg-[#1E3A8A]/5 border border-[#1E3A8A]/20 text-[11px] text-[#1E3A8A]">
                <span className="font-bold">Code of Conduct:</span> All teams must report 15 mins
                prior to match time with college ID cards.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#475569]">
          <div className="flex items-center gap-2 flex-wrap text-center sm:text-left justify-center sm:justify-start">
            <p>© 2026-27 Ashoka Institute of Technology and Management, Varanasi. All rights reserved.</p>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="font-semibold text-[#1E3A8A]">Made by Pranav Pandey</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] font-semibold text-[#1E3A8A]">
              Session 2026-27
            </span>
            <span>Ashoka Sports Club</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
