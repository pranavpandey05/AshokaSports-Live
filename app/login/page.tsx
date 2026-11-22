"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Clock,
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

    const email = signInEmail.trim();
    const password = signInPassword;

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (!hasSupabaseUrl) {
        throw new Error("Database service is not configured. Please check connection settings.");
      }

      // 1. Supabase Auth Sign In
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
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
        localStorage.setItem("ashoka_auth_user", authData.user.email || email);
        localStorage.setItem("ashoka_auth_name", roleRows.full_name || "");
      }

      if (roleRows.role === "scorer") {
        router.push("/scorer");
      } else {
        router.push("/admin");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please check your credentials.");
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

    const fullName = reqFullName.trim();
    const email = reqEmail.trim();
    const password = reqPassword;

    if (!fullName || !email || !password) {
      setErrorMsg("Please complete all required fields.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (!hasSupabaseUrl) {
        throw new Error("Database service is not configured. Please check connection settings.");
      }

      // 1. Create auth user in Supabase
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
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
          email,
          full_name: fullName,
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
        `Access request submitted! Your account (${email}) is awaiting approval from the Sports Council. An Admin or Super Admin will review your "${reqRole.toUpperCase()}" role.`
      );
      // Reset form
      setReqFullName("");
      setReqEmail("");
      setReqPassword("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit access request. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Official College Email ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="official.name@ashoka.edu.in"
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
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>{isLoading ? "Signing In..." : "Sign In to Official Console"}</span>
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
