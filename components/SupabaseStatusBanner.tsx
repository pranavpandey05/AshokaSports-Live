"use client";

import React, { useEffect, useState } from "react";
import { Database, AlertTriangle, CheckCircle2, Copy, Check, X, ShieldAlert, Terminal } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface SupabaseStatusBannerProps {
  mode?: "admin" | "scorer";
}

export default function SupabaseStatusBanner({ mode = "admin" }: SupabaseStatusBannerProps) {
  const [status, setStatus] = useState<"checking" | "connected" | "needs_setup" | "dismissed">("checking");
  const [issueReason, setIssueReason] = useState<string>("");
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem("ashoka_supabase_banner_dismissed");
    if (isDismissed === "true") {
      setStatus("dismissed");
      return;
    }

    async function checkSupabaseConnection() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      const isPlaceholder =
        !url ||
        !key ||
        url.includes("your-supabase") ||
        key.includes("your-anon-key") ||
        !url.startsWith("http");

      if (isPlaceholder) {
        setIssueReason("Missing Supabase credentials in .env.local (Running in Local Offline Demo Mode)");
        setStatus("needs_setup");
        return;
      }

      try {
        const { count, error } = await (supabase as any)
          .from("departments")
          .select("id", { count: "exact", head: true });

        if (error || count === 0 || count === null) {
          setIssueReason("Connected to Supabase project, but database tables are uninitialized (0 departments found)");
          setStatus("needs_setup");
        } else {
          setStatus("connected");
        }
      } catch {
        setIssueReason("Could not reach Supabase endpoint. Operating in local fallback mode.");
        setStatus("needs_setup");
      }
    }

    checkSupabaseConnection();
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("ashoka_supabase_banner_dismissed", "true");
    setStatus("dismissed");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(label);
    setTimeout(() => setCopiedScript(null), 2500);
  };

  if (status === "checking" || status === "connected" || status === "dismissed") {
    return null;
  }

  return (
    <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 sm:p-5 text-[#0F172A] shadow-xs relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3.5 right-3.5 p-1 rounded-md text-amber-700 hover:text-amber-950 hover:bg-amber-200/60 transition-colors"
        title="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5">
        <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
          <Database className="w-5 h-5" />
        </div>

        <div className="space-y-2 pr-6 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-amber-950 tracking-tight">
              Supabase Database Setup Required (Session 2026–27)
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
              {issueReason.includes(".env.local") ? "Credentials Needed" : "Schema Unseeded"}
            </span>
          </div>

          <p className="text-xs text-amber-900 leading-relaxed">
            {mode === "scorer"
              ? "The live scoring terminal is currently operating in offline/demo mode. All volunteer scores are saved locally."
              : "To enable live cloud broadcasting, multi-device volunteer score logging, and real-time leaderboard sync across the campus:"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            <div className="bg-white border border-amber-300 rounded-lg p-2 flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Terminal className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-mono text-[11px] text-emerald-900 truncate font-bold">
                  full_setup.sql
                </span>
              </div>
              <button
                onClick={() => copyToClipboard("supabase/full_setup.sql", "full")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0 transition-colors border border-emerald-200"
              >
                {copiedScript === "full" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-white border border-amber-200 rounded-lg p-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Terminal className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-mono text-[11px] text-slate-700 truncate font-semibold">
                  sync_points_trigger.sql
                </span>
              </div>
              <button
                onClick={() => copyToClipboard("supabase/sync_points_trigger.sql", "trigger")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0 transition-colors border border-blue-200"
              >
                {copiedScript === "trigger" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-white border border-amber-200 rounded-lg p-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-mono text-[11px] text-slate-700 truncate font-semibold">
                  schema.sql
                </span>
              </div>
              <button
                onClick={() => copyToClipboard("supabase/schema.sql", "schema")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold shrink-0 transition-colors"
              >
                {copiedScript === "schema" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-white border border-amber-200 rounded-lg p-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-mono text-[11px] text-slate-700 truncate font-semibold">
                  rls_policies.sql
                </span>
              </div>
              <button
                onClick={() => copyToClipboard("supabase/rls_policies.sql", "rls")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold shrink-0 transition-colors"
              >
                {copiedScript === "rls" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-amber-800/90 pt-0.5">
            <strong>Instructions:</strong> Open your{" "}
            <span className="font-semibold underline">Supabase Project Dashboard → SQL Editor</span>, copy and execute{" "}
            <code className="px-1 py-0.5 bg-amber-100 rounded font-mono font-bold">full_setup.sql</code> in one click (creates all 12 tables, seeds all 14 departments & 19 sports, sets up podium scoring, and locks RLS policies).
          </p>
        </div>
      </div>
    </div>
  );
}
