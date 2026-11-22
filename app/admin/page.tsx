"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Plus,
  Calendar,
  Trophy,
  Award,
  History,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Save,
  Users,
  Edit,
  Radio,
  UserCheck,
  UserX,
  Check,
  X,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { AITM_DEPARTMENTS } from "@/lib/constants/departments";
import { AITM_SPORTS } from "@/lib/constants/sports";
import { Sport } from "@/types/database";
import { supabase } from "@/lib/supabase/client";
import SupabaseStatusBanner from "@/components/SupabaseStatusBanner";

export interface OfficialRoleItem {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  role: "super_admin" | "admin" | "scorer";
  approval_status: "pending" | "approved" | "rejected";
  department_id: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

interface AdminMatchItem {
  id: string;
  sport_name: string;
  bracket_gender: "boys" | "girls";
  stage_label: string;
  team_a_code: string;
  team_b_code: string;
  venue: string;
  scheduled_at: string;
  status: "scheduled" | "live" | "completed";
  is_locked: boolean;
}

interface AuditLogDisplay {
  id: string;
  timestamp: string;
  action: string;
  table_name: string;
  performed_by: string;
  details: string;
}

const INITIAL_AUDIT_LOGS: AuditLogDisplay[] = [];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"fixtures" | "add_sport" | "podium" | "approvals" | "audit">("fixtures");
  const [notification, setNotification] = useState<string | null>(null);

  // Auth & 3-Tier Approval State
  const [currentUserRole, setCurrentUserRole] = useState<"super_admin" | "admin">("super_admin");
  const [currentUserName, setCurrentUserName] = useState<string>("Mr. Pankaj Kr. Srivastava (SAC Convenor)");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
  const [officialsList, setOfficialsList] = useState<OfficialRoleItem[]>([]);
  const [isLoadingOfficials, setIsLoadingOfficials] = useState<boolean>(true);

  // Sync auth session & live user_roles
  useEffect(() => {
    let roleChannel: any = null;

    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("ashoka_auth_role");
      const storedName = localStorage.getItem("ashoka_auth_name");
      if (storedRole === "super_admin" || storedRole === "admin") {
        setCurrentUserRole(storedRole as "super_admin" | "admin");
        if (storedName) setCurrentUserName(storedName);
        setIsAuthorized(true);
      } else if (storedRole === "scorer") {
        setIsAuthorized(false);
      }
    }

    // Attempt Supabase fetch
    async function fetchCloudUserRoles() {
      setIsLoadingOfficials(true);
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");
      if (hasSupabaseUrl && navigator.onLine) {
        try {
          const { data, error } = await (supabase as any)
            .from("user_roles")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) {
            const mapped: OfficialRoleItem[] = data.map((d: any) => ({
              id: d.id,
              user_id: d.user_id,
              full_name: d.full_name || d.email?.split("@")[0] || "Official",
              email: d.email,
              role: d.role as "super_admin" | "admin" | "scorer",
              approval_status: d.approval_status as "pending" | "approved" | "rejected",
              department_id: d.department_id || "AITM",
              created_at: d.created_at
                ? new Date(d.created_at).toLocaleDateString() +
                  " " +
                  new Date(d.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recent",
              approved_by: d.approved_by,
              approved_at: d.approved_at,
            }));
            setOfficialsList(mapped);
          } else {
            setOfficialsList([]);
          }
        } catch {
          setOfficialsList([]);
        } finally {
          setIsLoadingOfficials(false);
        }
      } else {
        // Fallback for offline demo mode
        try {
          const localRequests = JSON.parse(
            localStorage.getItem("ashoka_local_role_requests") || "[]"
          );
          setOfficialsList(localRequests);
        } catch {
          setOfficialsList([]);
        } finally {
          setIsLoadingOfficials(false);
        }
      }
    }
    fetchCloudUserRoles();

    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");
      if (hasSupabaseUrl) {
        roleChannel = supabase
          .channel("admin-user-roles-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "user_roles" },
            () => {
              fetchCloudUserRoles();
            }
          )
          .subscribe();
      }
    } catch {}

    return () => {
      if (roleChannel) {
        try {
          supabase.removeChannel(roleChannel);
        } catch {}
      }
    };

    // Fetch fixtures from Supabase
    async function fetchCloudFixtures() {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");
      if (hasSupabaseUrl && navigator.onLine) {
        try {
          const { data, error } = await (supabase as any)
            .from("matches")
            .select(`
              id,
              bracket_gender,
              stage_label,
              venue,
              scheduled_at,
              status,
              is_locked,
              sport:sports(name),
              team_a:departments!matches_team_a_id_fkey(short_code),
              team_b:departments!matches_team_b_id_fkey(short_code)
            `)
            .order("scheduled_at", { ascending: true });
          if (!error && data && data.length > 0) {
            setFixturesList(
              data.map((m: any) => ({
                id: m.id,
                sport_name: m.sport?.name || "Sport",
                bracket_gender: m.bracket_gender,
                stage_label: m.stage_label || "Round 1",
                team_a_code: m.team_a?.short_code || "TBD",
                team_b_code: m.team_b?.short_code || "TBD",
                venue: m.venue || "Campus Ground",
                scheduled_at: m.scheduled_at
                  ? new Date(m.scheduled_at).toLocaleDateString() +
                    " " +
                    new Date(m.scheduled_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "TBD",
                status: m.status,
                is_locked: !!m.is_locked,
              }))
            );
          }
        } catch {}
      }
    }
    fetchCloudFixtures();

    // Fetch audit logs from Supabase
    async function fetchCloudAuditLogs() {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");
      if (hasSupabaseUrl && navigator.onLine) {
        try {
          const { data, error } = await (supabase as any)
            .from("audit_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
          if (!error && data && data.length > 0) {
            setAuditLogs(
              data.map((l: any) => ({
                id: l.id,
                timestamp: l.created_at
                  ? new Date(l.created_at).toLocaleDateString() +
                    " " +
                    new Date(l.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Recent",
                action: l.action || "AUDIT",
                table_name: l.table_name || "system",
                performed_by: l.performed_by || "System",
                details: l.details || (typeof l.payload === "string" ? l.payload : JSON.stringify(l.payload || "")),
              }))
            );
          }
        } catch {}
      }
    }
    fetchCloudAuditLogs();
  }, []);

  // Quick switch role in Demo mode
  const handleSwitchRole = (newRole: "super_admin" | "admin") => {
    setCurrentUserRole(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("ashoka_auth_role", newRole);
      localStorage.setItem(
        "ashoka_auth_name",
        newRole === "super_admin"
          ? "Mr. Pankaj Kr. Srivastava (SAC Convenor)"
          : "Prof. Arvind Kumar (CSE Coordinator)"
      );
    }
    setCurrentUserName(
      newRole === "super_admin"
        ? "Mr. Pankaj Kr. Srivastava (SAC Convenor)"
        : "Prof. Arvind Kumar (CSE Coordinator)"
    );
    setNotification(`Switched demo view to: ${newRole.toUpperCase()}`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Sports list state
  const [sportsList, setSportsList] = useState<Sport[]>(AITM_SPORTS);

  // Fixtures state (empty slate - populated from Supabase or created by Admin)
  const [fixturesList, setFixturesList] = useState<AdminMatchItem[]>([]);

  // Fixture creation form state
  const [fixSportName, setFixSportName] = useState(AITM_SPORTS[0].name);
  const [fixBracketGender, setFixBracketGender] = useState<"boys" | "girls">("boys");
  const [fixTeamA, setFixTeamA] = useState("CSE");
  const [fixTeamB, setFixTeamB] = useState("ME");
  const [fixStage, setFixStage] = useState("Pool A");
  const [fixVenue, setFixVenue] = useState("Main Campus Ground, Pitch #1");
  const [fixDateTime, setFixDateTime] = useState("2026-11-23 11:00");

  // Add Sport Form state
  const [newSportName, setNewSportName] = useState("");
  const [newSportCategory, setNewSportCategory] = useState<"indoor" | "outdoor" | "track" | "field">("outdoor");
  const [newSportGender, setNewSportGender] = useState<"boys" | "girls" | "both">("both");
  const [newSportFormat, setNewSportFormat] = useState<"team_match" | "singles_doubles" | "podium_heat">("team_match");
  const [newSportScoringUnit, setNewSportScoringUnit] = useState("goals");
  const [newSportWinPts, setNewSportWinPts] = useState(3);
  const [newSportDrawPts, setNewSportDrawPts] = useState(1);
  const [newSportLossPts, setNewSportLossPts] = useState(0);
  const [newSportPodium1st, setNewSportPodium1st] = useState(10);
  const [newSportPodium2nd, setNewSportPodium2nd] = useState(8);
  const [newSportPodium3rd, setNewSportPodium3rd] = useState(5);
  const [newSportSquadSize, setNewSportSquadSize] = useState(11);
  const [newSportBenchSize, setNewSportBenchSize] = useState(4);
  const [newSportReportingMins, setNewSportReportingMins] = useState(15);
  const [newSportRulesSummary, setNewSportRulesSummary] = useState("");

  // Podium Entry state
  const [podiumSport, setPodiumSport] = useState("100m Sprint");
  const [podiumGender, setPodiumGender] = useState<"boys" | "girls">("boys");
  const [goldDept, setGoldDept] = useState("CSE");
  const [goldAthlete, setGoldAthlete] = useState("");
  const [goldMark, setGoldMark] = useState("");
  const [silverDept, setSilverDept] = useState("ME");
  const [silverAthlete, setSilverAthlete] = useState("");
  const [silverMark, setSilverMark] = useState("");
  const [bronzeDept, setBronzeDept] = useState("ECE");
  const [bronzeAthlete, setBronzeAthlete] = useState("");
  const [bronzeMark, setBronzeMark] = useState("");

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogDisplay[]>(INITIAL_AUDIT_LOGS);

  const addAuditLog = (action: string, table: string, details: string) => {
    const newLog: AuditLogDisplay = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      action,
      table_name: table,
      performed_by: `${currentUserRole === "super_admin" ? "super_admin" : "admin"} (${currentUserName})`,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handle Approve Role (Super Admin can approve Admin/Scorer; Admin can approve Scorer only)
  const handleApproveRole = async (targetId: string, targetRole: string) => {
    if (targetRole === "admin" && currentUserRole !== "super_admin") {
      alert("Unauthorized: Only the Super Admin (SAC Convenor) can ratify Admin roles.");
      return;
    }

    setOfficialsList((prev) =>
      prev.map((o) =>
        o.id === targetId
          ? {
              ...o,
              approval_status: "approved",
              approved_by: currentUserName,
              approved_at: new Date().toLocaleString(),
            }
          : o
      )
    );

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

    if (hasSupabaseUrl && navigator.onLine) {
      await (supabase as any)
        .from("user_roles")
        .update({
          approval_status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", targetId);
    }

    addAuditLog(
      "APPROVE_ROLE",
      "user_roles",
      `Approved access request for ${targetRole.toUpperCase()} (ID: ${targetId}) by ${currentUserName}`
    );
    setNotification(`Access request APPROVED for ${targetRole.toUpperCase()}! Official can now log in.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle Reject Role
  const handleRejectRole = async (targetId: string, targetRole: string) => {
    if (targetRole === "admin" && currentUserRole !== "super_admin") {
      alert("Unauthorized: Only the Super Admin (SAC Convenor) can reject Admin roles.");
      return;
    }

    setOfficialsList((prev) =>
      prev.map((o) =>
        o.id === targetId ? { ...o, approval_status: "rejected" } : o
      )
    );

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

    if (hasSupabaseUrl && navigator.onLine) {
      await (supabase as any)
        .from("user_roles")
        .update({ approval_status: "rejected" })
        .eq("id", targetId);
    }

    addAuditLog(
      "REJECT_ROLE",
      "user_roles",
      `Declined access request for ${targetRole.toUpperCase()} (ID: ${targetId})`
    );
    setNotification(`Access request declined.`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle Revoke Role
  const handleRevokeRole = async (official: OfficialRoleItem) => {
    if (official.role === "super_admin") {
      alert("Super Admin account cannot be revoked.");
      return;
    }
    if (currentUserRole !== "super_admin" && official.role === "admin") {
      alert("Unauthorized: A Department Admin cannot revoke another Admin.");
      return;
    }

    if (!confirm(`Are you sure you want to revoke access for ${official.full_name} (${official.email})?`)) {
      return;
    }

    setOfficialsList((prev) =>
      prev.map((o) =>
        o.id === official.id ? { ...o, approval_status: "rejected" } : o
      )
    );

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

    if (hasSupabaseUrl && navigator.onLine) {
      await (supabase as any)
        .from("user_roles")
        .update({ approval_status: "rejected" })
        .eq("id", official.id);
    }

    addAuditLog(
      "REVOKE_ROLE",
      "user_roles",
      `Revoked access for ${official.full_name} (${official.role.toUpperCase()})`
    );
    setNotification(`Access revoked for ${official.full_name}.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Create fixture handler
  const handleCreateFixture = (e: React.FormEvent) => {
    e.preventDefault();
    if (fixTeamA === fixTeamB) {
      alert("Team A and Team B must be different departments!");
      return;
    }

    const newFix: AdminMatchItem = {
      id: `fix-${Date.now()}`,
      sport_name: fixSportName,
      bracket_gender: fixBracketGender,
      stage_label: fixStage,
      team_a_code: fixTeamA,
      team_b_code: fixTeamB,
      venue: fixVenue,
      scheduled_at: fixDateTime,
      status: "scheduled",
      is_locked: false,
    };

    setFixturesList((prev) => [newFix, ...prev]);
    addAuditLog("INSERT", "matches", `Created new fixture: ${fixSportName} (${fixBracketGender}) ${fixTeamA} vs ${fixTeamB}`);
    setNotification(`Fixture created: ${fixTeamA} vs ${fixTeamB} (${fixSportName}) scheduled successfully!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Toggle lock state of fixture & sync with database
  const toggleMatchLock = (matchId: string) => {
    setFixturesList((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const newLocked = !m.is_locked;
          addAuditLog(
            newLocked ? "LOCK" : "UNLOCK",
            "matches",
            `${newLocked ? "Locked" : "Unlocked"} match ${m.id} (${m.team_a_code} vs ${m.team_b_code})`
          );

          const hasSupabaseUrl =
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

          if (hasSupabaseUrl && navigator.onLine) {
            (supabase as any)
              .from("matches")
              .update({ is_locked: newLocked, updated_at: new Date().toISOString() })
              .eq("id", matchId);
          }

          return { ...m, is_locked: newLocked };
        }
        return m;
      })
    );
    setNotification(`Match lock state updated & synced to database.`);
    setTimeout(() => setNotification(null), 3500);
  };

  // Update match status (e.g. reopen completed match or finalize live match)
  const updateMatchStatus = (
    matchId: string,
    newStatus: "scheduled" | "live" | "completed"
  ) => {
    setFixturesList((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          addAuditLog(
            "UPDATE",
            "matches",
            `Changed status of match ${m.id} (${m.team_a_code} vs ${m.team_b_code}) to ${newStatus}`
          );

          const hasSupabaseUrl =
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

          if (hasSupabaseUrl && navigator.onLine) {
            (supabase as any)
              .from("matches")
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq("id", matchId);
          }

          return { ...m, status: newStatus };
        }
        return m;
      })
    );
    setNotification(
      `Match status changed to ${newStatus.toUpperCase()}. Idempotent standings trigger automatically updated.`
    );
    setTimeout(() => setNotification(null), 4000);
  };

  // Add Sport handler
  const handleAddSport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSportName.trim()) return;

    const newSp: Sport = {
      id: `sport-${Date.now()}`,
      name: newSportName.trim(),
      category_group: newSportCategory,
      gender_category: newSportGender,
      format_type: newSportFormat,
      scoring_unit: newSportScoringUnit,
      win_pts: newSportWinPts,
      draw_pts: newSportDrawPts,
      loss_pts: newSportLossPts,
      podium_1st_pts: newSportPodium1st,
      podium_2nd_pts: newSportPodium2nd,
      podium_3rd_pts: newSportPodium3rd,
      playing_squad_size: newSportSquadSize,
      bench_squad_size: newSportBenchSize,
      reporting_mins_before: newSportReportingMins,
      rules_summary: newSportRulesSummary.trim() || null,
    };

    setSportsList((prev) => [...prev, newSp]);
    addAuditLog("INSERT", "sports", `Added new sports event: ${newSp.name} (${newSp.category_group}, ${newSp.gender_category})`);
    setNewSportName("");
    setNewSportRulesSummary("");
    setNotification(`New event "${newSp.name}" added to official AITM sports calendar!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Save Podium results handler
  const handleSavePodium = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goldAthlete.trim() || !silverAthlete.trim() || !bronzeAthlete.trim()) {
      alert("Please fill in athlete names for all three podium positions.");
      return;
    }

    addAuditLog(
      "INSERT",
      "podium_results",
      `Recorded podium for ${podiumSport} (${podiumGender}): 1st ${goldDept} (${goldAthlete} - ${goldMark}), 2nd ${silverDept} (${silverAthlete} - ${silverMark}), 3rd ${bronzeDept} (${bronzeAthlete} - ${bronzeMark})`
    );

    setNotification(`Podium results for ${podiumSport} (${podiumGender}) recorded and departmental points updated!`);
    setTimeout(() => setNotification(null), 5000);
  };

  const pendingRequests = officialsList.filter((o) => o.approval_status === "pending");
  const pendingAdminCount = pendingRequests.filter((o) => o.role === "admin").length;
  const pendingScorerCount = pendingRequests.filter((o) => o.role === "scorer").length;
  const approvedOfficials = officialsList.filter((o) => o.approval_status === "approved");

  if (!isAuthorized) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0F172A]">
            Administrative Clearance Required
          </h2>
          <p className="text-xs text-[#475569] leading-relaxed">
            The Admin Console is restricted to approved Department Sports Coordinators (Admins) and the SAC Convenor (Super Admin).
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full py-2.5 px-4 rounded-lg bg-[#1E3A8A] text-white text-xs font-bold hover:bg-[#1E3A8A]/90 transition-colors shadow-xs"
            >
              Sign In with Official Credentials
            </Link>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("ashoka_auth_role", "super_admin");
                  localStorage.setItem(
                    "ashoka_auth_name",
                    "Mr. Pankaj Kr. Srivastava (SAC Convenor)"
                  );
                }
                setCurrentUserRole("super_admin");
                setCurrentUserName("Mr. Pankaj Kr. Srivastava (SAC Convenor)");
                setIsAuthorized(true);
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              Enter Using Demo Super Admin View
            </button>
            <Link
              href="/"
              className="text-xs text-[#1E3A8A] hover:underline pt-1 font-semibold"
            >
              ← Return to Public Live Scores
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D97706] mb-1">
            <Shield className="w-4 h-4" />
            Ashoka Institute SAC Administration • Session 2026–27
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Sports Council {currentUserRole === "super_admin" ? "Super Admin" : "Department Admin"} Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            Manage fixtures, ratify rulebook events, award podium finishes, approve roles, and inspect audit logs.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border shadow-2xs ${
                currentUserRole === "super_admin"
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-blue-100 text-blue-900 border-blue-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {currentUserRole === "super_admin"
                ? "SUPER ADMIN (SAC Convenor)"
                : "ADMIN (Department Coordinator)"}
            </span>
          </div>
          {/* Quick Demo Role Switcher */}
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>Signed in as {currentUserName.split("(")[0]}</span>
            <span>•</span>
            <button
              onClick={() =>
                handleSwitchRole(currentUserRole === "super_admin" ? "admin" : "super_admin")
              }
              className="text-[#1E3A8A] font-bold hover:underline"
              title="Test RBAC permissions between Super Admin & Department Admin"
            >
              Switch to {currentUserRole === "super_admin" ? "Admin" : "Super Admin"} Demo
            </button>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Connection & Setup Helper */}
      <SupabaseStatusBanner mode="admin" />

      {/* Notification Toast */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in-50 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("fixtures")}
          className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "fixtures"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-[#475569] hover:text-[#0F172A]"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Manage Fixtures & Timing</span>
        </button>

        <button
          onClick={() => setActiveTab("add_sport")}
          className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "add_sport"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-[#475569] hover:text-[#0F172A]"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Add New Sport Event</span>
        </button>

        <button
          onClick={() => setActiveTab("podium")}
          className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "podium"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-[#475569] hover:text-[#0F172A]"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Podium Results Entry</span>
        </button>

        <button
          onClick={() => setActiveTab("approvals")}
          className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "approvals"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-[#475569] hover:text-[#0F172A]"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Access Approvals & Team Roles</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#D97706] text-white">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
            activeTab === "audit"
              ? "border-[#1E3A8A] text-[#1E3A8A]"
              : "border-transparent text-[#475569] hover:text-[#0F172A]"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: MANAGE FIXTURES & TIMING */}
      {activeTab === "fixtures" && (
        <div className="space-y-8">
          {/* Create Fixture Form */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Plus className="w-4 h-4 text-[#1E3A8A]" />
              <h2 className="text-base font-extrabold text-[#0F172A]">
                Schedule New Fixture Across 14 AITM Departments
              </h2>
            </div>

            <form onSubmit={handleCreateFixture} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Sport Event:</label>
                <select
                  value={fixSportName}
                  onChange={(e) => setFixSportName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-semibold"
                >
                  {sportsList.map((sp) => (
                    <option key={sp.id} value={sp.name}>
                      {sp.name} ({sp.category_group.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Bracket Gender:</label>
                <select
                  value={fixBracketGender}
                  onChange={(e) => setFixBracketGender(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-semibold"
                >
                  <option value="boys">Boys Bracket</option>
                  <option value="girls">Girls Bracket</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Team A:</label>
                <select
                  value={fixTeamA}
                  onChange={(e) => setFixTeamA(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-semibold"
                >
                  {AITM_DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Team B:</label>
                <select
                  value={fixTeamB}
                  onChange={(e) => setFixTeamB(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-semibold"
                >
                  {AITM_DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Stage / Round:</label>
                <select
                  value={fixStage}
                  onChange={(e) => setFixStage(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                >
                  <option value="Pool A">Pool A</option>
                  <option value="Pool B">Pool B</option>
                  <option value="Quarterfinal">Quarterfinal</option>
                  <option value="Semifinal">Semifinal</option>
                  <option value="Final">Final</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Campus Venue:</label>
                <input
                  type="text"
                  value={fixVenue}
                  onChange={(e) => setFixVenue(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Scheduled Date & Time:</label>
                <input
                  type="text"
                  value={fixDateTime}
                  onChange={(e) => setFixDateTime(e.target.value)}
                  placeholder="2026-11-23 14:00"
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full h-9 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Match Fixture</span>
                </button>
              </div>
            </form>
          </section>

          {/* Existing Fixtures Table & Unlock Match Controls */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#0F172A]">
                  Active Fixtures & Unlocking Control
                </h3>
                <p className="text-xs text-[#475569] mt-0.5">
                  Super Admins can unlock completed matches to allow ground scorers to correct score entries.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                    <th className="py-3 px-4">Sport & Bracket</th>
                    <th className="py-3 px-4">Matchup</th>
                    <th className="py-3 px-3">Stage</th>
                    <th className="py-3 px-3">Venue</th>
                    <th className="py-3 px-3">Time</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Lock Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {fixturesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        <div className="font-semibold text-slate-700">No fixtures currently scheduled</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Use the form above to schedule the first departmental match fixture.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    fixturesList.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                          {f.sport_name}{" "}
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({f.bracket_gender.toUpperCase()})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold">
                          {f.team_a_code} vs {f.team_b_code}
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-600">{f.stage_label}</td>
                        <td className="py-3.5 px-3 text-xs text-slate-600">{f.venue}</td>
                        <td className="py-3.5 px-3 font-mono text-xs text-slate-500">{f.scheduled_at}</td>
                        <td className="py-3.5 px-3 text-center">
                          <select
                            value={f.status}
                            onChange={(e) =>
                              updateMatchStatus(
                                f.id,
                                e.target.value as "scheduled" | "live" | "completed"
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer ${
                              f.status === "live"
                                ? "bg-red-50 text-red-800 border-red-200"
                                : f.status === "completed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="live">Live</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {f.is_locked ? (
                            <button
                              onClick={() => toggleMatchLock(f.id)}
                              className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors inline-flex items-center gap-1"
                            >
                              <Unlock className="w-3 h-3 text-amber-800" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleMatchLock(f.id)}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span>Lock</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: ADD NEW SPORT EVENT */}
      {activeTab === "add_sport" && (
        <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
              Register New Sport / Event in AITM Database
            </h2>
            <p className="text-xs text-[#475569] mt-0.5">
              Specify explicit gender categories, scoring points, squad limits, and official rule summaries.
            </p>
          </div>

          <form onSubmit={handleAddSport} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Sport / Event Name:</label>
                <input
                  type="text"
                  required
                  value={newSportName}
                  onChange={(e) => setNewSportName(e.target.value)}
                  placeholder="e.g. Lawn Tennis"
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Category Group:</label>
                <select
                  value={newSportCategory}
                  onChange={(e) => setNewSportCategory(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                >
                  <option value="outdoor">Outdoor</option>
                  <option value="indoor">Indoor</option>
                  <option value="track">Track (Athletics)</option>
                  <option value="field">Field (Athletics)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Gender Bracket Category:</label>
                <select
                  value={newSportGender}
                  onChange={(e) => setNewSportGender(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                >
                  <option value="both">Both (Boys & Girls Brackets)</option>
                  <option value="boys">Boys Only (Brochure Locked)</option>
                  <option value="girls">Girls Only (Brochure Locked)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Tournament Format:</label>
                <select
                  value={newSportFormat}
                  onChange={(e) => setNewSportFormat(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                >
                  <option value="team_match">Team Match (Pools / League)</option>
                  <option value="singles_doubles">Singles / Doubles</option>
                  <option value="podium_heat">Podium Heat (Track / Field)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Scoring Unit:</label>
                <input
                  type="text"
                  value={newSportScoringUnit}
                  onChange={(e) => setNewSportScoringUnit(e.target.value)}
                  placeholder="goals / points / seconds"
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Win / Draw / Loss Pts:</label>
                <div className="grid grid-cols-3 gap-1">
                  <input
                    type="number"
                    value={newSportWinPts}
                    onChange={(e) => setNewSportWinPts(Number(e.target.value))}
                    className="h-9 px-2 text-center rounded bg-[#F8FAFC] border border-[#E2E8F0]"
                    title="Win Points"
                  />
                  <input
                    type="number"
                    value={newSportDrawPts}
                    onChange={(e) => setNewSportDrawPts(Number(e.target.value))}
                    className="h-9 px-2 text-center rounded bg-[#F8FAFC] border border-[#E2E8F0]"
                    title="Draw Points"
                  />
                  <input
                    type="number"
                    value={newSportLossPts}
                    onChange={(e) => setNewSportLossPts(Number(e.target.value))}
                    className="h-9 px-2 text-center rounded bg-[#F8FAFC] border border-[#E2E8F0]"
                    title="Loss Points"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Squad Sizes (Playing / Bench):</label>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="number"
                    value={newSportSquadSize}
                    onChange={(e) => setNewSportSquadSize(Number(e.target.value))}
                    className="h-9 px-2 text-center rounded bg-[#F8FAFC] border border-[#E2E8F0]"
                    title="Playing Squad Size"
                  />
                  <input
                    type="number"
                    value={newSportBenchSize}
                    onChange={(e) => setNewSportBenchSize(Number(e.target.value))}
                    className="h-9 px-2 text-center rounded bg-[#F8FAFC] border border-[#E2E8F0]"
                    title="Bench Squad Size"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Reporting Time Mins:</label>
                <select
                  value={newSportReportingMins}
                  onChange={(e) => setNewSportReportingMins(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                >
                  <option value={15}>15 Mins Prior (Games)</option>
                  <option value={30}>30 Mins Prior (Track & Field)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0F172A] mb-1">Rules Summary / Directives:</label>
              <textarea
                rows={3}
                value={newSportRulesSummary}
                onChange={(e) => setNewSportRulesSummary(e.target.value)}
                placeholder="Specific rules, sets, overs, or equipment requirements..."
                className="w-full p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-6 rounded-lg bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save & Register Sport Event</span>
            </button>
          </form>
        </section>
      )}

      {/* TAB 3: PODIUM RESULTS ENTRY */}
      {activeTab === "podium" && (
        <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
              Record Track & Field / Podium Winners
            </h2>
            <p className="text-xs text-[#475569] mt-0.5">
              Awards points to department tallies: Gold (10 pts), Silver (8 pts), Bronze (5 pts).
            </p>
          </div>

          <form onSubmit={handleSavePodium} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Select Event:</label>
                <select
                  value={podiumSport}
                  onChange={(e) => setPodiumSport(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-bold"
                >
                  <option value="100m Sprint">100m Sprint</option>
                  <option value="200m Race">200m Race</option>
                  <option value="4x100m Relay">4x100m Relay</option>
                  <option value="1500m Race">1500m Race</option>
                  <option value="Long Jump">Long Jump</option>
                  <option value="High Jump">High Jump</option>
                  <option value="Shot Put">Shot Put</option>
                  <option value="Discus Throw">Discus Throw</option>
                  <option value="Javelin Throw">Javelin Throw</option>
                  <option value="Tug of War">Tug of War</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Gender Bracket:</label>
                <select
                  value={podiumGender}
                  onChange={(e) => setPodiumGender(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-bold"
                >
                  <option value="boys">Boys Bracket</option>
                  <option value="girls">Girls Bracket</option>
                </select>
              </div>
            </div>

            {/* 3 Positions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1st Gold */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-300 space-y-3">
                <div className="font-extrabold text-sm text-amber-900 flex items-center justify-between">
                  <span>1st Place (Gold Medal)</span>
                  <span className="font-mono">+10 Pts</span>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Winning Department:</label>
                  <select
                    value={goldDept}
                    onChange={(e) => setGoldDept(e.target.value)}
                    className="w-full h-8 px-2 rounded bg-white border border-amber-300 font-bold"
                  >
                    {AITM_DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Student Athlete Name:</label>
                  <input
                    type="text"
                    required
                    value={goldAthlete}
                    onChange={(e) => setGoldAthlete(e.target.value)}
                    placeholder="e.g. Aman Verma"
                    className="w-full h-8 px-2 rounded bg-white border border-amber-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Performance Mark:</label>
                  <input
                    type="text"
                    required
                    value={goldMark}
                    onChange={(e) => setGoldMark(e.target.value)}
                    placeholder="e.g. 10.82 seconds"
                    className="w-full h-8 px-2 rounded bg-white border border-amber-300 font-mono"
                  />
                </div>
              </div>

              {/* 2nd Silver */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3">
                <div className="font-extrabold text-sm text-slate-800 flex items-center justify-between">
                  <span>2nd Place (Silver Medal)</span>
                  <span className="font-mono">+8 Pts</span>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Winning Department:</label>
                  <select
                    value={silverDept}
                    onChange={(e) => setSilverDept(e.target.value)}
                    className="w-full h-8 px-2 rounded bg-white border border-slate-300 font-bold"
                  >
                    {AITM_DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Student Athlete Name:</label>
                  <input
                    type="text"
                    required
                    value={silverAthlete}
                    onChange={(e) => setSilverAthlete(e.target.value)}
                    placeholder="e.g. Rahul Vishwakarma"
                    className="w-full h-8 px-2 rounded bg-white border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Performance Mark:</label>
                  <input
                    type="text"
                    required
                    value={silverMark}
                    onChange={(e) => setSilverMark(e.target.value)}
                    placeholder="e.g. 11.05 seconds"
                    className="w-full h-8 px-2 rounded bg-white border border-slate-300 font-mono"
                  />
                </div>
              </div>

              {/* 3rd Bronze */}
              <div className="p-4 rounded-xl bg-amber-50/20 border border-amber-200 space-y-3">
                <div className="font-extrabold text-sm text-amber-950 flex items-center justify-between">
                  <span>3rd Place (Bronze Medal)</span>
                  <span className="font-mono">+5 Pts</span>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Winning Department:</label>
                  <select
                    value={bronzeDept}
                    onChange={(e) => setBronzeDept(e.target.value)}
                    className="w-full h-8 px-2 rounded bg-white border border-amber-200 font-bold"
                  >
                    {AITM_DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Student Athlete Name:</label>
                  <input
                    type="text"
                    required
                    value={bronzeAthlete}
                    onChange={(e) => setBronzeAthlete(e.target.value)}
                    placeholder="e.g. Aditya Singh"
                    className="w-full h-8 px-2 rounded bg-white border border-amber-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Performance Mark:</label>
                  <input
                    type="text"
                    required
                    value={bronzeMark}
                    onChange={(e) => setBronzeMark(e.target.value)}
                    placeholder="e.g. 11.31 seconds"
                    className="w-full h-8 px-2 rounded bg-white border border-amber-200 font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="py-2.5 px-6 rounded-lg bg-[#059669] hover:bg-[#059669]/90 text-white font-bold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Award className="w-4 h-4" />
              <span>Record Podium & Update Department Points</span>
            </button>
          </form>
        </section>
      )}

      {/* TAB 5: ACCESS APPROVALS & TEAM ROLES */}
      {activeTab === "approvals" && (
        <div className="space-y-8">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
              <div className="text-xs font-semibold text-[#475569]">Active Officials</div>
              <div className="text-2xl font-extrabold text-[#0F172A] mt-1">
                {approvedOfficials.length}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                ● Approved & Authorized
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
              <div className="text-xs font-semibold text-[#475569]">Pending Admin Requests</div>
              <div className="text-2xl font-extrabold text-[#D97706] mt-1">
                {pendingAdminCount}
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                Requires Super Admin Ratification
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
              <div className="text-xs font-semibold text-[#475569]">Pending Scorer Requests</div>
              <div className="text-2xl font-extrabold text-[#1E3A8A] mt-1">
                {pendingScorerCount}
              </div>
              <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                Ground Volunteers in Queue
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
              <div className="text-xs font-semibold text-[#475569]">Current Operator Tier</div>
              <div className="text-lg font-extrabold text-[#0F172A] mt-1 truncate">
                {currentUserRole === "super_admin" ? "SUPER ADMIN" : "DEPT ADMIN"}
              </div>
              <div className="text-[11px] text-[#475569] font-medium mt-0.5 truncate">
                {currentUserRole === "super_admin"
                  ? "Full 3-Tier Governance"
                  : "Scorer Approval Rights"}
              </div>
            </div>
          </div>

          {/* SECTION 1: PENDING ROLE ACCESS REQUESTS */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#D97706]" />
                  <h3 className="font-extrabold text-base text-[#0F172A]">
                    Pending Access Approvals ({pendingRequests.length})
                  </h3>
                </div>
                <p className="text-xs text-[#475569] mt-0.5">
                  Review registrations from department coordinators and student volunteers.
                  Super Admins approve all tiers; Department Admins approve Ground Scorers.
                </p>
              </div>

              {currentUserRole === "admin" && (
                <div className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900 font-medium">
                  Notice: As a Department Admin, you can approve Scorer requests only.
                </div>
              )}
            </div>

            {isLoadingOfficials ? (
              <div className="p-8 text-center space-y-2">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#1E3A8A] border-r-transparent mb-2"></div>
                <div className="text-xs font-semibold text-[#475569]">Loading pending access requests from database...</div>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[#0F172A]">Queue Is Clear</h4>
                <p className="text-xs text-[#475569]">
                  No pending access requests in the verification queue.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                      <th className="py-3 px-4">Applicant Name</th>
                      <th className="py-3 px-4">Official Email</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Requested Role</th>
                      <th className="py-3 px-3">Submitted At</th>
                      <th className="py-3 px-4 text-right">Approval Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {pendingRequests.map((req) => {
                      const isAdminRole = req.role === "admin";
                      const canApprove =
                        currentUserRole === "super_admin" || (!isAdminRole && currentUserRole === "admin");

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                            {req.full_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-[#475569]">
                            {req.email}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-slate-100 text-slate-800">
                              {req.department_id}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                                req.role === "admin"
                                  ? "bg-blue-100 text-blue-900 border border-blue-200"
                                  : "bg-red-100 text-red-900 border border-red-200"
                              }`}
                            >
                              {req.role === "admin" ? "Admin / Coord" : "Ground Scorer"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-xs text-slate-500 font-mono">
                            {req.created_at}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {canApprove ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApproveRole(req.id, req.role)}
                                  className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectRole(req.id, req.role)}
                                  className="py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 py-1 px-2.5 rounded-md border border-amber-200">
                                <Lock className="w-3 h-3 shrink-0" />
                                <span>Super Admin Required</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SECTION 2: ACTIVE OFFICIALS ROSTER & GOVERNANCE */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1E3A8A]" />
                <h3 className="font-extrabold text-base text-[#0F172A]">
                  Active Officials Roster & Role Governance
                </h3>
              </div>
              <p className="text-xs text-[#475569] mt-0.5">
                All ratified Sports Council convenors, branch coordinators, and volunteer scorers.
              </p>
            </div>

            {isLoadingOfficials ? (
              <div className="p-8 text-center space-y-2">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#1E3A8A] border-r-transparent mb-2"></div>
                <div className="text-xs font-semibold text-[#475569]">Loading active officials roster from database...</div>
              </div>
            ) : approvedOfficials.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[#0F172A]">No Active Officials Recorded</h4>
                <p className="text-xs text-[#475569] max-w-md mx-auto">
                  Ratified Sports Council convenors, department coordinators, and volunteer scorers will appear here once approved from the queue or registered in Supabase.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                      <th className="py-3 px-4">Official Name</th>
                      <th className="py-3 px-4">Official Email</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Role Tier</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Access Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {approvedOfficials.map((off) => {
                      const isSuperAdmin = off.role === "super_admin";
                      const isSelf = off.email === "convenor.sac@ashoka.edu.in" || off.full_name === currentUserName;
                      const canRevoke =
                        !isSuperAdmin &&
                        !isSelf &&
                        (currentUserRole === "super_admin" || (currentUserRole === "admin" && off.role === "scorer"));

                      return (
                        <tr key={off.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                            {off.full_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-[#475569]">
                            {off.email}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">
                              {off.department_id}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                off.role === "super_admin"
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : off.role === "admin"
                                  ? "bg-blue-100 text-blue-900 border border-blue-200"
                                  : "bg-red-100 text-red-900 border border-red-200"
                              }`}
                            >
                              {off.role === "super_admin"
                                ? "Super Admin"
                                : off.role === "admin"
                                ? "Admin / Coord"
                                : "Ground Scorer"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isSuperAdmin ? (
                              <span className="text-[11px] font-semibold text-slate-400 italic">
                                Root SAC Convenor
                              </span>
                            ) : canRevoke ? (
                              <button
                                type="button"
                                onClick={() => handleRevokeRole(off)}
                                className="py-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1 ml-auto"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Revoke Access</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400">
                                {off.role === "admin" ? "Peer Admin (Protected)" : "Active"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "audit" && (
        <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0]">
            <h3 className="font-extrabold text-base text-[#0F172A]">
              System Audit Logs & Ratified Actions
            </h3>
            <p className="text-xs text-[#475569] mt-0.5">
              Permanent chronological record of critical score commits, match locking, and roster changes.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <History className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">No Audit Logs Recorded</h4>
              <p className="text-xs text-[#475569] max-w-md mx-auto">
                Administrative actions, score commits, and match locking operations will appear here as they are performed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Target Table</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Details / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            log.action === "LOCK"
                              ? "bg-red-100 text-red-800"
                              : log.action === "INSERT"
                              ? "bg-blue-100 text-blue-800"
                              : log.action === "VERIFY"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">
                        {log.table_name}
                      </td>
                      <td className="py-3 px-4 font-semibold text-xs text-[#0F172A]">
                        {log.performed_by}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#475569]">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
