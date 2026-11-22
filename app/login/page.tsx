"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  KeyRound,
  Shield,
  Radio,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  UserPlus,
  Clock,
  Building2,
  User,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AITM_DEPARTMENTS } from "@/lib/constants/departments";

export default function LoginPage() {
  const router = useRouter();

  // Active top tab: "signin" | "request"
  const [activeTab, setActiveTab] = useState<"signin" | "request">("signin");

  // Sign In state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [demoRole, setDemoRole] = useState<"super_admin" | "admin" | "scorer">("admin");
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Request Access state
  const [reqFullName, setReqFullName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqPassword, setReqPassword] = useState("");
  const [reqDept, setReqDept] = useState("CSE");
  const [reqRole, setReqRole] = useState<"admin" | "scorer">("scorer");

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Official Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);
    setSuccessMsg(null);

    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (hasSupabaseUrl && !isDemoMode) {
        // 1. Supabase Auth Sign In
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: signInEmail.trim(),
          password: signInPassword,
        });

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error("Unable to retrieve user session.");
        }

        // 2. Query 3-tier user_roles record
        const { data: roleRows, error: roleError } = await (supabase as any)
          .from("user_roles")
          .select("role, approval_status, full_name, department_id")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (roleError) {
          console.error("Error querying user roles:", roleError);
        }

        // 3. Evaluate Approval Status
        if (!roleRows) {
          await supabase.auth.signOut();
          setWarningMsg(
            "Account found, but no role approval request was recorded. Please submit an Access Request using the tab above."
          );
          setIsLoading(false);
          return;
        }

        if (roleRows.approval_status === "pending") {
          await supabase.auth.signOut();
          setWarningMsg(
            `Your access request as "${roleRows.role.toUpperCase()}" is currently PENDING approval from the Super Admin / Sports Council. Please check back after approval.`
          );
          setIsLoading(false);
          return;
        }

        if (roleRows.approval_status === "rejected") {
          await supabase.auth.signOut();
          setErrorMsg(
            `Your access request for role "${roleRows.role.toUpperCase()}" was REJECTED by college administration. Contact the SAC Convenor if this is an error.`
          );
          setIsLoading(false);
          return;
        }

        // Approved! Save session role in local storage
        if (typeof window !== "undefined") {
          localStorage.setItem("ashoka_auth_role", roleRows.role);
          localStorage.setItem("ashoka_auth_user", authData.user.email || signInEmail);
          localStorage.setItem("ashoka_auth_name", roleRows.full_name || "");
        }

        if (roleRows.role === "scorer") {
          router.push("/scorer");
        } else {
          router.push("/admin");
        }
      } else {
        // Local Demo Mode sign in
        if (typeof window !== "undefined") {
          localStorage.setItem("ashoka_auth_role", demoRole);
          localStorage.setItem(
            "ashoka_auth_user",
            signInEmail.trim() ||
              (demoRole === "super_admin"
                ? "convenor.sac@ashoka.edu.in"
                : demoRole === "admin"
                ? "coordinator.cse@ashoka.edu.in"
                : "volunteer.scorer@ashoka.edu.in")
          );
          localStorage.setItem(
            "ashoka_auth_name",
            demoRole === "super_admin"
              ? "Mr. Pankaj Kr. Srivastava (SAC Convenor)"
              : demoRole === "admin"
              ? "Prof. Arvind Kumar (CSE Coordinator)"
              : "Ground Volunteer Scorer"
          );
        }

        if (demoRole === "scorer") {
          router.push("/scorer");
        } else {
          router.push("/admin");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Check credentials or enable Demo Mode.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Request Access (Sign Up + Pending user_roles row)
  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);
    setSuccessMsg(null);

    if (!reqFullName.trim() || !reqEmail.trim() || !reqPassword.trim()) {
      setErrorMsg("Please complete all required fields.");
      setIsLoading(false);
      return;
    }

    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (hasSupabaseUrl && navigator.onLine) {
        // 1. Create auth user in Supabase
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: reqEmail.trim(),
          password: reqPassword,
          options: {
            data: {
              full_name: reqFullName.trim(),
              department_id: reqDept,
            },
          },
        });

        if (signUpError) throw signUpError;

        const userId = authData.user?.id;

        // 2. Insert pending row into user_roles
        if (userId) {
          const { error: roleInsertError } = await (supabase as any).from("user_roles").insert({
            user_id: userId,
            email: reqEmail.trim(),
            full_name: reqFullName.trim(),
            role: reqRole,
            approval_status: "pending",
            department_id: reqDept,
            assigned_by: "Self Registered",
          });

          if (roleInsertError) {
            console.warn("Notice: user_roles insert through RLS:", roleInsertError);
          }
        }

        setSuccessMsg(
          `Access request submitted! Your account (${reqEmail.trim()}) is awaiting approval from the Sports Council. An Admin or Super Admin will review your "${reqRole.toUpperCase()}" role.`
        );
        // Reset form
        setReqFullName("");
        setReqEmail("");
        setReqPassword("");
      } else {
        // Local Demo fallback: Save to local pending queue so Admin can inspect and approve locally
        const pendingItem = {
          id: `req-${Date.now()}`,
          full_name: reqFullName.trim(),
          email: reqEmail.trim(),
          department_id: reqDept,
          role: reqRole,
          approval_status: "pending",
          created_at: new Date().toISOString(),
        };

        if (typeof window !== "undefined") {
          const existing = JSON.parse(
            localStorage.getItem("ashoka_local_role_requests") || "[]"
          );
          localStorage.setItem(
            "ashoka_local_role_requests",
            JSON.stringify([pendingItem, ...existing])
          );
        }

        setSuccessMsg(
          `[Demo Mode] Access request for "${reqFullName.trim()}" (${reqRole.toUpperCase()}) saved locally! Super Admin can approve it in the Admin Console.`
        );
        setReqFullName("");
        setReqEmail("");
        setReqPassword("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit access request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-Click Demo Shortcut
  const handleOneClickDemo = (role: "super_admin" | "admin" | "scorer") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ashoka_auth_role", role);
      localStorage.setItem(
        "ashoka_auth_user",
        role === "super_admin"
          ? "convenor.sac@ashoka.edu.in"
          : role === "admin"
          ? "coordinator.cse@ashoka.edu.in"
          : "volunteer.scorer@ashoka.edu.in"
      );
      localStorage.setItem(
        "ashoka_auth_name",
        role === "super_admin"
          ? "Mr. Pankaj Kr. Srivastava (SAC Convenor)"
          : role === "admin"
          ? "Prof. Arvind Kumar (CSE Coordinator)"
          : "Ground Volunteer Scorer"
      );
    }
    router.push(role === "scorer" ? "/scorer" : "/admin");
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC]">
      <div className="max-w-md w-full space-y-5">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="relative w-14 h-14 rounded-2xl bg-white border border-[#E2E8F0] p-1 flex items-center justify-center mx-auto shadow-sm">
            <Image
              src="/images/ashoka-logo.png"
              alt="Ashoka Institute of Technology and Management"
              width={52}
              height={52}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            AshokaSports Live
          </h1>
        </div>

        {/* Public Notice Banner */}
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-[#1E3A8A] flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1E3A8A]" />
          <div>
            <span className="font-bold">Students & Public Spectators:</span> No login is required!
            All match live scores, standings, and athlete rosters are publicly accessible on the{" "}
            <Link href="/" className="font-bold underline hover:text-blue-900">
              Live Home Portal
            </Link>
            .
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs space-y-5">
          {/* Top 2-Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setErrorMsg(null);
                setWarningMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "signin"
                  ? "bg-white text-[#1E3A8A] shadow-xs border border-slate-200"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Official Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("request");
                setErrorMsg(null);
                setWarningMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "request"
                  ? "bg-white text-[#1E3A8A] shadow-xs border border-slate-200"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Request Access</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {warningMsg && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Pending Approval: </span>
                <span>{warningMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: OFFICIAL SIGN IN */}
          {activeTab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Demo Role Mode Picker */}
              {isDemoMode && (
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5">
                    Select Test Role (Demo Mode):
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDemoRole("super_admin")}
                      className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                        demoRole === "super_admin"
                          ? "bg-white text-[#D97706] shadow-2xs border border-amber-200"
                          : "text-[#475569] hover:text-[#0F172A]"
                      }`}
                    >
                      Super Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoRole("admin")}
                      className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                        demoRole === "admin"
                          ? "bg-white text-[#1E3A8A] shadow-2xs border border-blue-200"
                          : "text-[#475569] hover:text-[#0F172A]"
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoRole("scorer")}
                      className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                        demoRole === "scorer"
                          ? "bg-white text-[#DC2626] shadow-2xs border border-red-200"
                          : "text-[#475569] hover:text-[#0F172A]"
                      }`}
                    >
                      Scorer
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Official College Email ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder={
                      demoRole === "super_admin"
                        ? "convenor.sac@ashoka.edu.in"
                        : demoRole === "admin"
                        ? "coordinator.cse@ashoka.edu.in"
                        : "ground.scorer@ashoka.edu.in"
                    }
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>
              </div>

              {/* Demo Mode Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-xs text-amber-950 font-medium">
                    Local Demo Mode (Skip Supabase Auth)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isDemoMode}
                  onChange={(e) => setIsDemoMode(e.target.checked)}
                  className="w-4 h-4 text-[#1E3A8A] rounded border-amber-300 focus:ring-[#1E3A8A]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>
                  {isLoading
                    ? "Signing In..."
                    : `Enter Dashboard as ${
                        isDemoMode
                          ? demoRole === "super_admin"
                            ? "Super Admin"
                            : demoRole === "admin"
                            ? "Admin"
                            : "Ground Scorer"
                          : "Official"
                      }`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: REQUEST ACCESS */}
          {activeTab === "request" && (
            <form onSubmit={handleRequestAccess} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={reqFullName}
                    onChange={(e) => setReqFullName(e.target.value)}
                    placeholder="e.g. Prof. Arvind Kumar / Volunteer Name"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  College Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="official.name@ashoka.edu.in"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Choose Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={reqPassword}
                    onChange={(e) => setReqPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Department
                  </label>
                  <select
                    value={reqDept}
                    onChange={(e) => setReqDept(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  >
                    {AITM_DEPARTMENTS.map((dept) => (
                      <option key={dept.code} value={dept.code}>
                        {dept.code} ({dept.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Requested Role
                  </label>
                  <select
                    value={reqRole}
                    onChange={(e) => setReqRole(e.target.value as "admin" | "scorer")}
                    className="w-full h-10 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  >
                    <option value="scorer">Ground Scorer</option>
                    <option value="admin">Admin / Coordinator</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>{isLoading ? "Submitting Request..." : "Submit Access Request"}</span>
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick-Access 1-Click Testing Shortcuts */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Instant 1-Click Local Demo Shortcuts
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleOneClickDemo("scorer")}
                className="py-2 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] text-[10px] font-bold text-[#DC2626] transition-colors flex items-center justify-center gap-1"
              >
                <Radio className="w-3 h-3" />
                <span>Scorer</span>
              </button>
              <button
                type="button"
                onClick={() => handleOneClickDemo("admin")}
                className="py-2 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] text-[10px] font-bold text-[#1E3A8A] transition-colors flex items-center justify-center gap-1"
              >
                <Shield className="w-3 h-3" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleOneClickDemo("super_admin")}
                className="py-2 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] text-[10px] font-bold text-[#D97706] transition-colors flex items-center justify-center gap-1"
              >
                <Shield className="w-3 h-3" />
                <span>Super Admin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-[#1E3A8A] hover:underline"
          >
            ← Return to Public Live Portal
          </Link>
        </div>
      </div>
    </div>
  );
}