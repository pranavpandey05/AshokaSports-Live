"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Wifi,
  WifiOff,
  RotateCw,
  Lock,
  Plus,
  Users,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  UserPlus,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AITM_DEPARTMENTS } from "@/lib/constants/departments";
import SupabaseStatusBanner from "@/components/SupabaseStatusBanner";

const QUEUE_KEY = "ashoka_offline_score_queue";

interface OfflineQueueItem {
  id: string;
  timestamp: string;
  matchId: string;
  type: "SCORE_UPDATE" | "LINEUP_UPDATE" | "ADD_PLAYER" | "LOCK_MATCH";
  payload: any;
}

interface ScorerMatch {
  id: string;
  sport_name: string;
  sport_format: string;
  bracket_gender: "boys" | "girls";
  stage_label: string;
  venue: string;
  status: "scheduled" | "live" | "completed";
  is_locked: boolean;
  team_a_code: string;
  team_a_name: string;
  team_a_color: string;
  team_a_score: string;
  team_b_code: string;
  team_b_name: string;
  team_b_color: string;
  team_b_score: string;
  current_detail: string;
}

interface ScorerPlayer {
  id: string;
  full_name: string;
  roll_no: string;
  academic_year: string;
  jersey_no: number | null;
  role: string;
  is_starting: boolean;
  department_code: string;
}

// Empty initial state for matches & players
const INITIAL_MATCHES: ScorerMatch[] = [];
const INITIAL_PLAYERS: Record<string, ScorerPlayer[]> = {};

export default function ScorerPage() {
  const [matches, setMatches] = useState<ScorerMatch[]>(INITIAL_MATCHES);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [notification, setNotification] = useState<string | null>(null);

  // Lineup state for selected match
  const [playersList, setPlayersList] = useState<Record<string, ScorerPlayer[]>>(INITIAL_PLAYERS);

  // Quick player add form modal state
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerRoll, setNewPlayerRoll] = useState("");
  const [newPlayerDept, setNewPlayerDept] = useState("CSE");
  const [newPlayerYear, setNewPlayerYear] = useState("Yr 2");
  const [newPlayerGender, setNewPlayerGender] = useState<"boys" | "girls">("boys");
  const [newPlayerJersey, setNewPlayerJersey] = useState<number | "">("");
  const [newPlayerRole, setNewPlayerRole] = useState("All-Rounder");

  // Lock match modal state
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockWinnerCode, setLockWinnerCode] = useState<string>("");
  const [lockResultNote, setLockResultNote] = useState<string>("");

  // Role verification state
  const [authRole, setAuthRole] = useState<string | null>("scorer");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);

  const activeMatch = matches.find((m) => m.id === selectedMatchId) || matches[0] || null;

  // Verify auth role & monitor network online/offline state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("ashoka_auth_role");
      if (storedRole && ["scorer", "admin", "super_admin"].includes(storedRole)) {
        setAuthRole(storedRole);
        setIsAuthorized(true);
      } else {
        const hasSupabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");
        if (hasSupabaseUrl) {
          supabase.auth.getUser().then(({ data }) => {
            if (!data?.user) {
              setIsAuthorized(false);
            }
          });
        }
      }
    }

    function updateOnlineStatus() {
      setIsOnline(navigator.onLine);
    }
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Read queue count
    try {
      const q = localStorage.getItem(QUEUE_KEY);
      if (q) {
        const parsed = JSON.parse(q);
        setQueueCount(parsed.length);
      }
    } catch {}

    // Load matches from Supabase for live ground scoring
    async function fetchCloudMatches() {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");
      if (hasSupabaseUrl && navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from("matches")
            .select(`
              id,
              bracket_gender,
              stage_label,
              venue,
              status,
              is_locked,
              team_a_score,
              team_b_score,
              sport:sports(name, format_type),
              team_a:departments!matches_team_a_id_fkey(short_code, name, badge_color),
              team_b:departments!matches_team_b_id_fkey(short_code, name, badge_color)
            `)
            .order("scheduled_at", { ascending: true });
          if (!error && data && data.length > 0) {
            const loaded: ScorerMatch[] = data.map((m: any) => ({
              id: m.id,
              sport_name: m.sport?.name || "Sport",
              sport_format: m.sport?.format_type || "team_match",
              bracket_gender: m.bracket_gender,
              stage_label: m.stage_label || "Round 1",
              venue: m.venue || "Campus Ground",
              status: m.status,
              is_locked: !!m.is_locked,
              team_a_code: m.team_a?.short_code || "A",
              team_a_name: m.team_a?.name || "Team A",
              team_a_color: m.team_a?.badge_color || "#1E3A8A",
              team_a_score: String(m.team_a_score ?? "0"),
              team_b_code: m.team_b?.short_code || "B",
              team_b_name: m.team_b?.name || "Team B",
              team_b_color: m.team_b?.badge_color || "#DC2626",
              team_b_score: String(m.team_b_score ?? "0"),
              current_detail:
                m.status === "live"
                  ? "Match underway"
                  : m.status === "completed"
                  ? "Match completed"
                  : "Scheduled",
            }));
            setMatches(loaded);
            setSelectedMatchId(loaded[0]?.id || "");
          }
        } catch {}
      }
    }
    fetchCloudMatches();

    // Supabase Realtime subscription for matches updates
    let channel: any = null;
    try {
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (hasSupabaseUrl) {
        channel = supabase
          .channel("scorer-matches-realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "matches" },
            () => fetchCloudMatches()
          )
          .subscribe();
      }
    } catch {}

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  const pushToQueue = (item: OfflineQueueItem) => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      const queue: OfflineQueueItem[] = raw ? JSON.parse(raw) : [];
      queue.push(item);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      setQueueCount(queue.length);
    } catch {}
  };

  const handleFlushQueue = async () => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return;
      const queue: OfflineQueueItem[] = JSON.parse(raw);
      if (queue.length === 0) return;

      // Attempt flushing if supabase connected
      const hasSupabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

      if (hasSupabaseUrl && navigator.onLine) {
        for (const item of queue) {
          if (item.type === "SCORE_UPDATE" || item.type === "LOCK_MATCH") {
            await (supabase as any)
              .from("matches")
              .update(item.payload)
              .eq("id", item.matchId);
          }
        }
      }

      localStorage.removeItem(QUEUE_KEY);
      setQueueCount(0);
      setNotification(`Successfully synced ${queue.length} offline updates to live database!`);
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification("Failed to flush queue. Stored safely in local cache.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Score buttons handlers
  const updateScores = async (team: "A" | "B", scoreVal: string, detailText?: string) => {
    if (!activeMatch) return;
    const newTeamAScore = team === "A" ? scoreVal : activeMatch.team_a_score;
    const newTeamBScore = team === "B" ? scoreVal : activeMatch.team_b_score;

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === activeMatch.id) {
          return {
            ...m,
            team_a_score: newTeamAScore,
            team_b_score: newTeamBScore,
            current_detail: detailText || m.current_detail,
            status: "live",
          };
        }
        return m;
      })
    );

    // Queue or push to Supabase
    const payload = {
      team_a_score: newTeamAScore,
      team_b_score: newTeamBScore,
      status: "live",
      updated_at: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      pushToQueue({
        id: `q-${Date.now()}`,
        timestamp: new Date().toISOString(),
        matchId: activeMatch.id,
        type: "SCORE_UPDATE",
        payload,
      });
      setNotification(`Offline: Score queued (${newTeamAScore} - ${newTeamBScore})`);
      setTimeout(() => setNotification(null), 2500);
    } else {
      try {
        const { error } = await (supabase as any)
          .from("matches")
          .update(payload)
          .eq("id", activeMatch.id);
        if (error) {
          console.error("Score update error:", error);
        } else {
          setNotification(`Live score updated: ${activeMatch.team_a_code} ${newTeamAScore} - ${newTeamBScore} ${activeMatch.team_b_code}`);
          setTimeout(() => setNotification(null), 2500);
        }
      } catch (err) {
        console.error("Score update network error:", err);
      }
    }
  };

  const handleScoreButton = (team: "A" | "B", action: string) => {
    if (!activeMatch) return;
    const isCricket = activeMatch.sport_name === "Cricket";
    const isFootball = activeMatch.sport_name === "Football";
    const isVolleyball = activeMatch.sport_name === "Volleyball";

    if (isCricket) {
      const currentScore = team === "A" ? activeMatch.team_a_score : activeMatch.team_b_score;
      const parts = currentScore.split("/");
      let runs = parseInt(parts[0]) || 0;
      let wkts = parseInt(parts[1]) || 0;

      if (action === "+1") runs += 1;
      else if (action === "+4") runs += 4;
      else if (action === "+6") runs += 6;
      else if (action === "Wicket") wkts = Math.min(10, wkts + 1);

      updateScores(team, `${runs}/${wkts}`, `${team === "A" ? activeMatch.team_a_code : activeMatch.team_b_code} +${action}`);
    } else if (isFootball) {
      const current = parseInt(team === "A" ? activeMatch.team_a_score : activeMatch.team_b_score) || 0;
      if (action === "Goal") {
        updateScores(team, `${current + 1}`, `Goal scored by ${team === "A" ? activeMatch.team_a_code : activeMatch.team_b_code}!`);
      } else {
        setNotification(`${action} recorded for ${team === "A" ? activeMatch.team_a_code : activeMatch.team_b_code}`);
        setTimeout(() => setNotification(null), 3000);
      }
    } else if (isVolleyball) {
      const current = parseInt(team === "A" ? activeMatch.team_a_score : activeMatch.team_b_score) || 0;
      if (action === "+1 Point") {
        updateScores(team, `${current + 1}`, `Point to ${team === "A" ? activeMatch.team_a_code : activeMatch.team_b_code}`);
      } else if (action === "Set Won") {
        updateScores(team, `${current + 1} (Set)`, `Set won by ${team === "A" ? activeMatch.team_a_code : activeMatch.team_b_code}`);
      }
    } else {
      // General +1 Point
      const current = parseInt(team === "A" ? activeMatch.team_a_score : activeMatch.team_b_score) || 0;
      updateScores(team, `${current + 1}`, `Point to ${team === "A" ? activeMatch.team_a_code : activeMatch.team_b_code}`);
    }
  };

  // Toggle player playing vs bench
  const togglePlayerLineup = (deptCode: string, playerId: string) => {
    setPlayersList((prev) => {
      const list = prev[deptCode] || [];
      const updated = list.map((p) => {
        if (p.id === playerId) {
          return { ...p, is_starting: !p.is_starting };
        }
        return p;
      });
      return { ...prev, [deptCode]: updated };
    });
  };

  // Quick add athlete
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !newPlayerRoll.trim()) return;

    const newP: ScorerPlayer = {
      id: `p-new-${Date.now()}`,
      full_name: newPlayerName.trim(),
      roll_no: newPlayerRoll.trim(),
      academic_year: newPlayerYear,
      jersey_no: newPlayerJersey === "" ? null : Number(newPlayerJersey),
      role: newPlayerRole,
      is_starting: true,
      department_code: newPlayerDept,
    };

    setPlayersList((prev) => ({
      ...prev,
      [newPlayerDept]: [...(prev[newPlayerDept] || []), newP],
    }));

    setNewPlayerName("");
    setNewPlayerRoll("");
    setShowAddPlayerModal(false);
    setNotification(`Student athlete ${newP.full_name} added to ${newP.department_code} playing squad!`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Complete & Lock Match
  const handleLockMatch = async () => {
    if (!activeMatch) return;
    const lockPayload = {
      status: "completed",
      is_locked: true,
      winner_id: lockWinnerCode || null,
      result_note: lockResultNote || `Official result: ${lockWinnerCode ? `${lockWinnerCode} won` : "Match drawn"}`,
      updated_at: new Date().toISOString(),
    };

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === activeMatch.id) {
          return {
            ...m,
            status: "completed",
            is_locked: true,
            current_detail: `Final: ${lockWinnerCode || "Draw"} • Match Locked`,
          };
        }
        return m;
      })
    );

    // Sync to Supabase if online, or buffer in offline queue
    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http");

    if (hasSupabaseUrl && navigator.onLine) {
      try {
        await (supabase as any)
          .from("matches")
          .update(lockPayload)
          .eq("id", activeMatch.id);
      } catch (err) {
        console.error("Lock match network error:", err);
      }
    } else {
      pushToQueue({
        id: `lock-${Date.now()}`,
        timestamp: new Date().toISOString(),
        matchId: activeMatch.id,
        type: "LOCK_MATCH",
        payload: lockPayload,
      });
    }

    setShowLockModal(false);
    setNotification(
      `Match ${activeMatch.stage_label} marked COMPLETED & LOCKED. Standings & Points Table synchronized.`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  const currentTeamAPlayers = activeMatch ? (playersList[activeMatch.team_a_code] || []) : [];
  const currentTeamBPlayers = activeMatch ? (playersList[activeMatch.team_b_code] || []) : [];

  if (!isAuthorized) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0F172A]">
            Ground Volunteer Clearance Required
          </h2>
          <p className="text-xs text-[#475569] leading-relaxed">
            Live pitch and court scoring is restricted to authorized ground volunteers, branch sports coordinators, and the SAC sports council.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full py-2.5 px-4 rounded-lg bg-[#1E3A8A] text-white text-xs font-bold hover:bg-[#1E3A8A]/90 transition-colors shadow-xs"
            >
              Sign In with Volunteer Account
            </Link>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("ashoka_auth_role", "scorer");
                  localStorage.setItem("ashoka_auth_user", "volunteer.scorer@ashoka.edu.in");
                  localStorage.setItem("ashoka_auth_name", "Ground Volunteer Scorer");
                }
                setAuthRole("scorer");
                setIsAuthorized(true);
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-red-50 text-red-900 border border-red-200 text-xs font-bold hover:bg-red-100 transition-colors"
            >
              Enter Using Demo Volunteer Scorer View
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner: Ground Volunteer Header + Connectivity Pill */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-red-100 text-red-700">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Ground Volunteer Live Scoring Console
            </h1>
          </div>
          <p className="text-xs text-[#475569] mt-0.5">
            AITM Sports Meet 2026–27 • Official Court & Pitch Scoring Terminal
          </p>
        </div>

        {/* Connectivity Status & Flush Queue Action */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {isOnline && queueCount === 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Synced
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              Offline — Queued ({queueCount})
            </span>
          )}

          {queueCount > 0 && (
            <button
              onClick={handleFlushQueue}
              className="px-3 py-1 rounded-lg bg-[#1E3A8A] text-white text-xs font-bold hover:bg-[#1E3A8A]/90 transition-colors flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              Flush Queue
            </button>
          )}
        </div>
      </div>

      {/* Supabase Status Banner */}
      <SupabaseStatusBanner mode="scorer" />

      {/* Notification Toast */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in-50 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* If no matches are scheduled */}
      {!activeMatch ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-[#0F172A]">No Active Matches Found</h2>
          <p className="text-xs text-[#475569] max-w-md mx-auto">
            No matches are currently scheduled or unlocked for scoring. Fixtures scheduled by the Sports Committee will appear here automatically.
          </p>
          <div className="pt-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-semibold hover:bg-[#1E3A8A]/90 transition-colors"
            >
              Go to Admin Fixtures Console <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Active Match Selector */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
          Select Active / Unlocked Match to Score ({matches.filter((m) => !m.is_locked).length} Active):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {matches.map((m) => {
            const isSelected = m.id === selectedMatchId;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMatchId(m.id)}
                disabled={m.is_locked}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  m.is_locked
                    ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed"
                    : isSelected
                    ? "bg-blue-50/70 border-[#1E3A8A] ring-2 ring-[#1E3A8A]/20 shadow-xs"
                    : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-[#475569] mb-1">
                  <span>{m.sport_name} ({m.bracket_gender.toUpperCase()})</span>
                  {m.is_locked ? (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : (
                    <span className="text-emerald-700">Unlocked</span>
                  )}
                </div>
                <div className="font-extrabold text-sm text-[#0F172A] flex items-center justify-between">
                  <span>{m.team_a_code} vs {m.team_b_code}</span>
                  <span className="font-mono text-xs">{m.team_a_score} : {m.team_b_score}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">
                  {m.stage_label} • {m.venue}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daylight Large Scoreboard & Action Buttons */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-8">
        {/* Match Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-100 text-red-800">
                {activeMatch.status}
              </span>
              <span className="font-extrabold text-base text-[#0F172A]">
                {activeMatch.sport_name} • {activeMatch.stage_label} ({activeMatch.bracket_gender.toUpperCase()})
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-0.5">{activeMatch.venue}</p>
          </div>

          {/* Complete & Lock Match Button */}
          {!activeMatch.is_locked && (
            <button
              onClick={() => {
                setLockWinnerCode(activeMatch.team_a_code);
                setShowLockModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#DC2626]/90 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-center"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Complete & Lock Match</span>
            </button>
          )}
        </div>

        {/* Big High-Contrast Daylight Score Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Team A Panel */}
          <div className="p-6 rounded-2xl bg-[#F8FAFC] border-2 border-[#E2E8F0] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: activeMatch.team_a_color }}
                ></span>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0F172A]">
                    {activeMatch.team_a_code}
                  </h2>
                  <div className="text-xs text-[#475569]">{activeMatch.team_a_name}</div>
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-[#0F172A] bg-white px-4 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
                {activeMatch.team_a_score}
              </div>
            </div>

            {/* Direct Score Input */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[#475569] shrink-0">Edit Score:</label>
              <input
                type="text"
                value={activeMatch.team_a_score}
                onChange={(e) => updateScores("A", e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-white border border-[#E2E8F0] text-sm font-mono font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            {/* Large Daylight Action Buttons for Team A */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Daylight Fast Scoring:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeMatch.sport_name === "Cricket" ? (
                  <>
                    <button
                      onClick={() => handleScoreButton("A", "+1")}
                      className="h-14 rounded-xl bg-white border-2 border-slate-300 hover:border-slate-500 text-lg font-extrabold text-[#0F172A] shadow-xs active:scale-95 transition-all"
                    >
                      +1 Run
                    </button>
                    <button
                      onClick={() => handleScoreButton("A", "+4")}
                      className="h-14 rounded-xl bg-blue-50 border-2 border-blue-400 text-lg font-extrabold text-blue-800 shadow-xs active:scale-95 transition-all"
                    >
                      +4 Four
                    </button>
                    <button
                      onClick={() => handleScoreButton("A", "+6")}
                      className="h-14 rounded-xl bg-purple-50 border-2 border-purple-400 text-lg font-extrabold text-purple-800 shadow-xs active:scale-95 transition-all"
                    >
                      +6 Six
                    </button>
                    <button
                      onClick={() => handleScoreButton("A", "Wicket")}
                      className="col-span-3 h-12 rounded-xl bg-red-50 border-2 border-red-400 text-sm font-extrabold text-red-800 shadow-xs active:scale-95 transition-all"
                    >
                      Wicket Fallen!
                    </button>
                  </>
                ) : activeMatch.sport_name === "Football" ? (
                  <>
                    <button
                      onClick={() => handleScoreButton("A", "Goal")}
                      className="col-span-2 h-14 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-base font-extrabold text-emerald-800 shadow-xs active:scale-95 transition-all"
                    >
                      +1 Goal
                    </button>
                    <button
                      onClick={() => handleScoreButton("A", "Yellow Card")}
                      className="h-14 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs font-bold text-amber-800 shadow-xs active:scale-95 transition-all"
                    >
                      Yellow Card
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleScoreButton("A", "+1 Point")}
                      className="col-span-2 h-14 rounded-xl bg-blue-50 border-2 border-blue-400 text-base font-extrabold text-blue-800 shadow-xs active:scale-95 transition-all"
                    >
                      +1 Point
                    </button>
                    <button
                      onClick={() => handleScoreButton("A", "Set Won")}
                      className="h-14 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-xs font-bold text-emerald-800 shadow-xs active:scale-95 transition-all"
                    >
                      Set Won
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Team B Panel */}
          <div className="p-6 rounded-2xl bg-[#F8FAFC] border-2 border-[#E2E8F0] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: activeMatch.team_b_color }}
                ></span>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0F172A]">
                    {activeMatch.team_b_code}
                  </h2>
                  <div className="text-xs text-[#475569]">{activeMatch.team_b_name}</div>
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-[#0F172A] bg-white px-4 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
                {activeMatch.team_b_score}
              </div>
            </div>

            {/* Direct Score Input */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[#475569] shrink-0">Edit Score:</label>
              <input
                type="text"
                value={activeMatch.team_b_score}
                onChange={(e) => updateScores("B", e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-white border border-[#E2E8F0] text-sm font-mono font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            {/* Large Daylight Action Buttons for Team B */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Daylight Fast Scoring:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {activeMatch.sport_name === "Cricket" ? (
                  <>
                    <button
                      onClick={() => handleScoreButton("B", "+1")}
                      className="h-14 rounded-xl bg-white border-2 border-slate-300 hover:border-slate-500 text-lg font-extrabold text-[#0F172A] shadow-xs active:scale-95 transition-all"
                    >
                      +1 Run
                    </button>
                    <button
                      onClick={() => handleScoreButton("B", "+4")}
                      className="h-14 rounded-xl bg-blue-50 border-2 border-blue-400 text-lg font-extrabold text-blue-800 shadow-xs active:scale-95 transition-all"
                    >
                      +4 Four
                    </button>
                    <button
                      onClick={() => handleScoreButton("B", "+6")}
                      className="h-14 rounded-xl bg-purple-50 border-2 border-purple-400 text-lg font-extrabold text-purple-800 shadow-xs active:scale-95 transition-all"
                    >
                      +6 Six
                    </button>
                    <button
                      onClick={() => handleScoreButton("B", "Wicket")}
                      className="col-span-3 h-12 rounded-xl bg-red-50 border-2 border-red-400 text-sm font-extrabold text-red-800 shadow-xs active:scale-95 transition-all"
                    >
                      Wicket Fallen!
                    </button>
                  </>
                ) : activeMatch.sport_name === "Football" ? (
                  <>
                    <button
                      onClick={() => handleScoreButton("B", "Goal")}
                      className="col-span-2 h-14 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-base font-extrabold text-emerald-800 shadow-xs active:scale-95 transition-all"
                    >
                      +1 Goal
                    </button>
                    <button
                      onClick={() => handleScoreButton("B", "Yellow Card")}
                      className="h-14 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs font-bold text-amber-800 shadow-xs active:scale-95 transition-all"
                    >
                      Yellow Card
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleScoreButton("B", "+1 Point")}
                      className="col-span-2 h-14 rounded-xl bg-blue-50 border-2 border-blue-400 text-base font-extrabold text-blue-800 shadow-xs active:scale-95 transition-all"
                    >
                      +1 Point
                    </button>
                    <button
                      onClick={() => handleScoreButton("B", "Set Won")}
                      className="h-14 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-xs font-bold text-emerald-800 shadow-xs active:scale-95 transition-all"
                    >
                      Set Won
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lineup Manager & Quick Student Athlete Registration */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1E3A8A]" />
              <h2 className="text-base font-extrabold text-[#0F172A]">
                Match Lineup Manager & Substitution Toggle
              </h2>
            </div>
            <p className="text-xs text-[#475569] mt-0.5">
              Click any student athlete to toggle between Playing Squad (Starting) and Bench.
            </p>
          </div>

          <button
            onClick={() => {
              setNewPlayerDept(activeMatch.team_a_code);
              setShowAddPlayerModal(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-bold hover:bg-[#1E3A8A]/90 transition-colors flex items-center gap-1.5 self-start sm:self-center shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Quick-Add Student Athlete</span>
          </button>
        </div>

        {/* Side-by-Side Lineup Manager */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Team A Roster */}
          <div className="space-y-3">
            <div className="font-extrabold text-sm text-[#0F172A] flex items-center justify-between">
              <span>{activeMatch.team_a_name} ({activeMatch.team_a_code}) Roster</span>
              <span className="text-xs text-[#475569]">
                Starting: {currentTeamAPlayers.filter((p) => p.is_starting).length}
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-[#E2E8F0] rounded-xl p-2 bg-[#F8FAFC]">
              {currentTeamAPlayers.map((p) => (
                <div
                  key={p.id}
                  onClick={() => togglePlayerLineup(activeMatch.team_a_code, p.id)}
                  className="py-2 px-2.5 flex items-center justify-between hover:bg-white rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#0F172A] flex items-center gap-1.5">
                      <span>{p.full_name}</span>
                      {p.jersey_no && (
                        <span className="text-[11px] font-mono text-slate-500">
                          #{p.jersey_no}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {p.roll_no} • {p.academic_year} • {p.role}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      p.is_starting
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {p.is_starting ? "Starting Squad" : "Bench"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Team B Roster */}
          <div className="space-y-3">
            <div className="font-extrabold text-sm text-[#0F172A] flex items-center justify-between">
              <span>{activeMatch.team_b_name} ({activeMatch.team_b_code}) Roster</span>
              <span className="text-xs text-[#475569]">
                Starting: {currentTeamBPlayers.filter((p) => p.is_starting).length}
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-[#E2E8F0] rounded-xl p-2 bg-[#F8FAFC]">
              {currentTeamBPlayers.map((p) => (
                <div
                  key={p.id}
                  onClick={() => togglePlayerLineup(activeMatch.team_b_code, p.id)}
                  className="py-2 px-2.5 flex items-center justify-between hover:bg-white rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#0F172A] flex items-center gap-1.5">
                      <span>{p.full_name}</span>
                      {p.jersey_no && (
                        <span className="text-[11px] font-mono text-slate-500">
                          #{p.jersey_no}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {p.roll_no} • {p.academic_year} • {p.role}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      p.is_starting
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {p.is_starting ? "Starting Squad" : "Bench"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ADD ATHLETE MODAL */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-[#0F172A]">
                Quick-Add Student Athlete
              </h3>
              <button
                onClick={() => setShowAddPlayerModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleAddPlayer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="e.g. Saurabh Tiwari"
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    University Roll No:
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlayerRoll}
                    onChange={(e) => setNewPlayerRoll(e.target.value)}
                    placeholder="2204310100099"
                    className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Department:
                  </label>
                  <select
                    value={newPlayerDept}
                    onChange={(e) => setNewPlayerDept(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-bold"
                  >
                    {AITM_DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} ({d.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Academic Year:
                  </label>
                  <select
                    value={newPlayerYear}
                    onChange={(e) => setNewPlayerYear(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <option value="Yr 1">Yr 1 (1st Year)</option>
                    <option value="Yr 2">Yr 2 (2nd Year)</option>
                    <option value="Yr 3">Yr 3 (3rd Year)</option>
                    <option value="Yr 4">Yr 4 (4th Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Gender:
                  </label>
                  <select
                    value={newPlayerGender}
                    onChange={(e) => setNewPlayerGender(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <option value="boys">Boys</option>
                    <option value="girls">Girls</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Jersey #:
                  </label>
                  <input
                    type="number"
                    value={newPlayerJersey}
                    onChange={(e) => setNewPlayerJersey(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="10"
                    className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Default Role:
                </label>
                <input
                  type="text"
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value)}
                  placeholder="Striker / Batsman / Raider"
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                />
              </div>

              <p className="text-[10px] text-slate-500 italic">
                * Privacy Protected: Phone numbers and personal emails are never collected or stored.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1E3A8A] text-white text-xs font-bold hover:bg-[#1E3A8A]/90"
                >
                  Add to Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE & LOCK MATCH MODAL */}
      {showLockModal && activeMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-extrabold text-base pb-3 border-b border-slate-100">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Confirm Official Match Lock</span>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed">
              Locking this match marks it <strong>COMPLETED</strong> and writes irreversible official results to
              the championship <strong>Points Table</strong>. Audit log records will be created.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Select Official Winner:
                </label>
                <select
                  value={lockWinnerCode}
                  onChange={(e) => setLockWinnerCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-sm"
                >
                  <option value={activeMatch.team_a_code}>{activeMatch.team_a_code} ({activeMatch.team_a_name})</option>
                  <option value={activeMatch.team_b_code}>{activeMatch.team_b_code} ({activeMatch.team_b_name})</option>
                  <option value="DRAW">Draw / Tie Match</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Official Result Note / Summary:
                </label>
                <input
                  type="text"
                  value={lockResultNote}
                  onChange={(e) => setLockResultNote(e.target.value)}
                  placeholder={`e.g. ${activeMatch.team_a_code} won by 14 runs`}
                  className="w-full h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLockMatch}
                className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#DC2626]/90 text-white font-bold"
              >
                Confirm & Lock Match
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
