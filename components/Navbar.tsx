"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Trophy,
  Calendar,
  FileText,
  Home as HomeIcon,
  Filter,
  Check,
  ChevronDown,
  Lock,
  Radio,
  Flame,
  Shield,
  UserCheck,
  LogOut,
} from "lucide-react";
import { useDepartment } from "@/context/DepartmentContext";
import { PlayerSearchBar } from "./PlayerSearchBar";
import { supabase } from "@/lib/supabase/client";

export function Navbar() {
  const pathname = usePathname();
  const { selectedDeptCode, setSelectedDeptCode, pinnedDepartment, departments } = useDepartment();
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [authRole, setAuthRole] = useState<string | null>(null);

  // Sync auth role from local storage and supabase session
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthRole(localStorage.getItem("ashoka_auth_role"));
    }

    try {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          if (typeof window !== "undefined" && !localStorage.getItem("ashoka_auth_role")) {
            setAuthRole(null);
          }
        }
      });
      return () => {
        authListener?.subscription?.unsubscribe();
      };
    } catch {
      // Ignore if supabase client unconfigured
    }
  }, [pathname]);

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ashoka_auth_role");
      localStorage.removeItem("ashoka_auth_user");
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setAuthRole(null);
    window.location.href = "/";
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDeptDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Points Table", href: "/points" },
    { label: "Fixtures", href: "/fixtures" },
    { label: "Records & Rules", href: "/records" },
  ];

  return (
    <>
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: Branding & Subtitle */}
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center p-0.5 border border-[#E2E8F0] shadow-2xs group-hover:border-[#1E3A8A]/40 transition-colors shrink-0">
                <Image
                  src="/images/ashoka-logo.png"
                  alt="Ashoka Institute of Technology and Management (AITM)"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-base sm:text-lg text-[#0F172A] truncate">
                    AshokaSports
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse mr-1"></span>
                    Live
                  </span>
                </div>
                <span className="text-[11px] text-[#475569] font-medium hidden sm:block truncate">
                  AITM Varanasi • Ashoka Sports Club 2026–27
                </span>
              </div>
            </Link>

            {/* Center: Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold"
                        : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-100/70"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <div className="h-4 w-px bg-[#E2E8F0] mx-1"></div>

              {/* Official Controls / Login */}
              {authRole ? (
                <div className="flex items-center gap-1.5">
                  {authRole === "scorer" ? (
                    <Link
                      href="/scorer"
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        pathname === "/scorer"
                          ? "bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 font-bold"
                          : "text-[#DC2626] hover:bg-[#DC2626]/5"
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      Scorer Console
                    </Link>
                  ) : (
                    <Link
                      href="/admin"
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        pathname === "/admin"
                          ? "bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20 font-bold"
                          : "text-[#D97706] hover:bg-[#D97706]/5"
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 text-[#D97706]" />
                      {authRole === "super_admin" ? "Super Admin" : "Admin Panel"}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#1E3A8A] bg-[#1E3A8A]/10 hover:bg-[#1E3A8A] hover:text-white border border-[#1E3A8A]/20 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Official Login</span>
                </Link>
              )}
            </nav>

            {/* Right: Player Search (Desktop) & "My Dept" Dropdown */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop Global Search Bar */}
              <div className="hidden md:block w-56 md:w-64">
                <PlayerSearchBar />
              </div>

              {/* Department Pin Filter Dropdown */}
              <div ref={dropdownRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setDeptDropdownOpen((prev) => !prev)}
                  className={`h-9 px-2 sm:px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all max-w-[115px] sm:max-w-none ${
                    pinnedDepartment
                      ? "bg-white border-[#1E3A8A]/30 text-[#0F172A] shadow-xs"
                      : "bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-white hover:text-[#0F172A]"
                  }`}
                  title={
                    pinnedDepartment
                      ? `Pinned: ${pinnedDepartment.name} (Coord: ${pinnedDepartment.coordinator})`
                      : "Pin your department to filter scores"
                  }
                >
                  {pinnedDepartment ? (
                    <>
                      <span
                        className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: pinnedDepartment.color }}
                      ></span>
                      <span className="font-bold text-[#0F172A] truncate">{pinnedDepartment.code}</span>
                    </>
                  ) : (
                    <>
                      <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">My Dept</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {deptDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in-50 duration-150">
                    <div className="p-3 bg-slate-50 border-b border-[#E2E8F0]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">
                          Pin Your Department
                        </span>
                        {selectedDeptCode !== "ALL" && (
                          <button
                            onClick={() => {
                              setSelectedDeptCode("ALL");
                              setDeptDropdownOpen(false);
                            }}
                            className="text-[11px] font-semibold text-[#1E3A8A] hover:underline"
                          >
                            Reset to All
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-[#475569] mt-0.5">
                        Focus matches, roster & points on your branch
                      </p>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-1 divide-y divide-slate-100">
                      {/* All Departments Option */}
                      <button
                        onClick={() => {
                          setSelectedDeptCode("ALL");
                          setDeptDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                          selectedDeptCode === "ALL"
                            ? "bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold"
                            : "text-[#0F172A] hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                          <span>All Departments (AITM Overall)</span>
                        </div>
                        {selectedDeptCode === "ALL" && <Check className="w-4 h-4 text-[#1E3A8A]" />}
                      </button>

                      {/* 14 Official AITM Departments */}
                      {departments.map((dept) => {
                        const isSelected = selectedDeptCode === dept.code;
                        return (
                          <button
                            key={dept.code}
                            onClick={() => {
                              setSelectedDeptCode(dept.code);
                              setDeptDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-lg transition-colors ${
                              isSelected
                                ? "bg-slate-100 font-semibold text-[#0F172A]"
                                : "text-[#0F172A] hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                                style={{ backgroundColor: dept.color }}
                              ></span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs">{dept.code}</span>
                                  <span className="text-[11px] text-[#475569] truncate">
                                    {dept.name}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Coord: {dept.coordinator}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#1E3A8A] shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Quick Official Portal / Login Icon (< md) */}
              <div className="lg:hidden shrink-0">
                {authRole ? (
                  <Link
                    href={authRole === "scorer" ? "/scorer" : "/admin"}
                    className="h-9 px-2 rounded-lg bg-[#1E3A8A]/10 border border-[#1E3A8A]/20 text-[#1E3A8A] text-xs font-bold flex items-center gap-1 shadow-2xs"
                    title={authRole === "scorer" ? "Scorer Console" : "Admin Panel"}
                  >
                    <Shield className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    <span className="text-[11px] font-bold">
                      {authRole === "scorer" ? "Scorer" : "Admin"}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="h-9 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-[#E2E8F0] text-[#0F172A] text-xs font-bold flex items-center gap-1 shadow-2xs"
                    title="Official Login"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px] font-bold hidden xs:inline">Login</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Search Bar: Clean Full-Width Row (< md) */}
          <div className="md:hidden pb-2.5 pt-0.5">
            <PlayerSearchBar />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Tabs: Home, Points, Fixtures, Rules) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8F0] shadow-lg">
        <div className="grid grid-cols-4 h-15">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              pathname === "/"
                ? "text-[#1E3A8A] font-bold"
                : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Home</span>
          </Link>

          <Link
            href="/points"
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              pathname === "/points"
                ? "text-[#1E3A8A] font-bold"
                : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Points</span>
          </Link>

          <Link
            href="/fixtures"
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              pathname === "/fixtures"
                ? "text-[#1E3A8A] font-bold"
                : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Fixtures</span>
          </Link>

          <Link
            href="/records"
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              pathname === "/records"
                ? "text-[#1E3A8A] font-bold"
                : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Rules</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
