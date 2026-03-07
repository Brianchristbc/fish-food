"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import NominationForm from "./NominationForm";
import ItemCard from "./ItemCard";
import PastResults from "./PastResults";
import SlackRally from "./SlackRally";
import ProfileModal from "./ProfileModal";
import FakeCaptcha from "./FakeCaptcha";

interface User {
  id: string;
  email: string;
  name: string | null;
  office: string;
}

interface Nomination {
  id: string;
  productName: string;
  price: number;
  imageUrl: string;
  amazonUrl: string;
  status: string;
  errorMsg: string | null;
  nominatedBy: string;
  voteCount: number;
  userVoted: boolean;
}

interface WeekSummary {
  id: string;
  weekNumber: number;
  year: number;
  status: string;
}

interface WeekData {
  week: {
    id: string;
    weekNumber: number;
    year: number;
    office: string;
    startsAt: string;
    endsAt: string;
    status: string;
  };
  allWeeks: WeekSummary[];
  nominations: Nomination[];
  userNomination: { id: string; productName: string; status: string; errorMsg: string | null } | null;
  userManualVotesUsed: number;
  userOffice: string;
  viewingOffice: string;
  isOpen: boolean;
}

interface Props {
  user: User;
  onLogout: () => void;
}

const OFFICES = [
  { value: "US", label: "US", flag: "🇺🇸", tz: "PT" },
  { value: "VN", label: "Vietnam", flag: "🇻🇳", tz: "GMT+7" },
];

const EMPTY_ILLUSTRATIONS = [
  "/brand/Search.svg",
  "/brand/Navigate.svg",
  "/brand/Observe.svg",
];

export default function Dashboard({ user, onLogout }: Props) {
  const [data, setData] = useState<WeekData | null>(null);
  const [tab, setTab] = useState<"current" | "past">("current");
  const [viewOffice, setViewOffice] = useState(user.office);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>(null);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams({ office: viewOffice });
    if (selectedWeekId) params.set("weekId", selectedWeekId);
    const res = await fetch(`/api/week/current?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [viewOffice, selectedWeekId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Poll while any nomination is PENDING
  useEffect(() => {
    const hasPending = data?.nominations.some((n) => n.status === "PENDING");
    if (hasPending) {
      pollRef.current = setInterval(refresh, 5000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [data, refresh]);

  // Reset week selection when switching offices
  useEffect(() => {
    setSelectedWeekId(null);
  }, [viewOffice]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  async function handleVote(nominationId: string) {
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nominationId }),
    });
    if (res.ok) refresh();
    else {
      const err = await res.json();
      alert(err.error);
    }
  }

  async function handleUnvote(nominationId: string) {
    const res = await fetch("/api/vote", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nominationId }),
    });
    if (res.ok) refresh();
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/fish.png" alt="Loading" className="h-10 w-10 animate-bounce" />
      </div>
    );
  }

  const deadline = new Date(data.week.endsAt);
  const votesRemaining = 2 - data.userManualVotesUsed;
  const readyNominations = data.nominations.filter((n) => n.status === "READY");
  const pendingNominations = data.nominations.filter((n) => n.status === "PENDING");
  const failedNominations = data.nominations.filter((n) => n.status === "FAILED");
  const votableItems = readyNominations.filter((n) => data.userNomination?.id !== n.id);
  const isOwnOffice = viewOffice === user.office;
  const isViewingCurrentWeek = !selectedWeekId || selectedWeekId === data.allWeeks[0]?.id;
  const randomIllustration = EMPTY_ILLUSTRATIONS[Math.floor(Date.now() / 86400000) % EMPTY_ILLUSTRATIONS.length];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/fish.png" alt="TinyFish" className="h-8 w-8" />
            <h1 className="text-lg font-bold text-slate-900">Fish Food</h1>

            {/* Office selector — hidden on small screens, shown in menu */}
            <div className="relative ml-2 hidden sm:block">
              <select
                value={viewOffice}
                onChange={(e) => setViewOffice(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1 pl-3 pr-7 text-sm text-slate-700 hover:border-slate-300 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
              >
                {OFFICES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.flag} {o.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setProfileOpen(true)}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium"
            >
              {user.name}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Sign out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-1 text-slate-500 hover:text-slate-700"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>
              ) : (
                <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-lg p-5 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-slate-900">Menu</h2>
              <button onClick={() => setMenuOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">
                &times;
              </button>
            </div>

            {/* Office selector */}
            <label className="text-xs font-medium text-slate-500 mb-1">Office</label>
            <select
              value={viewOffice}
              onChange={(e) => { setViewOffice(e.target.value); setMenuOpen(false); }}
              className="mb-4 rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-sm text-slate-700"
            >
              {OFFICES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.flag} {o.label}
                </option>
              ))}
            </select>

            {/* Profile */}
            <button
              onClick={() => { setProfileOpen(true); setMenuOpen(false); }}
              className="text-left py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border-t border-slate-100 pt-3"
            >
              My Profile
            </button>

            {/* Sign out */}
            <button
              onClick={() => { handleLogout(); setMenuOpen(false); }}
              className="text-left py-2 text-sm text-red-500 hover:text-red-700 mt-auto"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}

      {/* Viewing other office banner */}
      {!isOwnOffice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-700">
          Viewing {OFFICES.find((o) => o.value === viewOffice)?.label} office ({OFFICES.find((o) => o.value === viewOffice)?.tz})
          {!data.isOpen && " — this week is closed in their timezone"}
          {" — "}
          <button onClick={() => setViewOffice(user.office)} className="font-medium underline">
            switch to your office ({user.office})
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto max-w-4xl px-4 pt-4">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
          <button
            onClick={() => setTab("current")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === "current"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTab("past")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === "past"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Past Winners
          </button>
        </div>
      </div>

      {tab === "current" ? (
        <main className="mx-auto max-w-4xl px-4 py-6">
          {/* Week info bar with week selector */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              {/* Week picker */}
              {data.allWeeks.length > 1 ? (
                <select
                  value={selectedWeekId || data.week.id}
                  onChange={(e) => {
                    const val = e.target.value;
                    // If selecting the first (latest) week, clear the explicit selection
                    setSelectedWeekId(val === data.allWeeks[0]?.id ? null : val);
                  }}
                  className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1 pl-2 pr-6 text-sm font-medium text-slate-700 cursor-pointer focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                >
                  {data.allWeeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      Week {w.weekNumber}, {w.year} {w.status === "OPEN" ? "(current)" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-medium text-slate-700">
                  Week {data.week.weekNumber}, {data.week.year}
                </span>
              )}

              {data.isOpen ? (
                <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Open
                </span>
              ) : (
                <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Closed
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isViewingCurrentWeek && (
                <button
                  onClick={() => setSelectedWeekId(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Back to current week
                </button>
              )}
              <div className="text-sm text-slate-500">
                Deadline: {deadline.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
                {deadline.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}{" "}
                ({OFFICES.find((o) => o.value === viewOffice)?.tz || "PT"})
              </div>
            </div>
          </div>

          {/* Rally button — only on current open week */}
          {data.isOpen && isOwnOffice && isViewingCurrentWeek && data.userNomination && readyNominations.length < 3 && (
            <SlackRally nominationCount={readyNominations.length} />
          )}

          {/* Nomination form — only on current open week in own office */}
          {data.isOpen && isOwnOffice && isViewingCurrentWeek && !data.userNomination && (
            <NominationForm onNominated={refresh} />
          )}

          {/* User nomination status — only on current week */}
          {data.userNomination && data.isOpen && isOwnOffice && isViewingCurrentWeek && (
            <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              data.userNomination.status === "PENDING"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : data.userNomination.status === "FAILED"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-orange-200 bg-orange-50 text-orange-700"
            }`}>
              {data.userNomination.status === "PENDING" && (
                <>Our TinyFish web agent is swimming to Amazon to check your product... hang tight!</>
              )}
              {data.userNomination.status === "FAILED" && (
                <>Nomination failed: {data.userNomination.errorMsg}</>
              )}
              {data.userNomination.status === "READY" && (
                <>
                  You nominated: <strong>{data.userNomination.productName}</strong>
                  {votesRemaining > 0 && votableItems.length > 0 && (
                    <span className="ml-2">
                      — Vote on {votesRemaining} more item{votesRemaining > 1 ? "s" : ""}!
                    </span>
                  )}
                  {votesRemaining > 0 && votableItems.length === 0 && (
                    <span className="ml-2">
                      — Come back to vote once others nominate items!
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {/* Fake captcha while any nomination (yours or others) is pending */}
          {(pendingNominations.length > 0 || data.userNomination?.status === "PENDING") && (
            <div className="mb-4 space-y-4">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/fish.png" alt="" className="h-8 w-8 animate-bounce shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Our TinyFish web agent is fetching product details...
                  </p>
                  <p className="text-xs text-orange-500">
                    Complete the security check below while you wait
                  </p>
                </div>
              </div>
              <FakeCaptcha />
            </div>
          )}

          {/* Failed nominations */}
          {failedNominations.length > 0 && (
            <div className="mb-4 space-y-2">
              {failedNominations.map((nom) => (
                <div
                  key={nom.id}
                  className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <div className="h-20 w-20 rounded-lg bg-red-100 flex items-center justify-center text-red-400 text-2xl">
                    !
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      {nom.errorMsg || "Failed to load"}
                    </p>
                    <p className="text-xs text-red-400">
                      by {nom.nominatedBy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ready nominations grid */}
          {readyNominations.length === 0 && pendingNominations.length === 0 ? (
            <div className="mt-8 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={randomIllustration} alt="" className="h-40 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400">
                No nominations yet this week. Be the first!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {readyNominations
                .sort((a, b) => b.voteCount - a.voteCount)
                .map((nom) => (
                  <ItemCard
                    key={nom.id}
                    nomination={nom}
                    canVote={
                      isOwnOffice &&
                      data.isOpen &&
                      isViewingCurrentWeek &&
                      (!data.userNomination || data.userNomination.id !== nom.id) &&
                      !nom.userVoted &&
                      votesRemaining > 0
                    }
                    canUnvote={isOwnOffice && data.isOpen && isViewingCurrentWeek && nom.userVoted}
                    onVote={() => handleVote(nom.id)}
                    onUnvote={() => handleUnvote(nom.id)}
                    isOwn={data.userNomination?.id === nom.id}
                    isOpen={data.isOpen && isViewingCurrentWeek}
                  />
                ))}
            </div>
          )}
        </main>
      ) : (
        <PastResults office={viewOffice} />
      )}
    </div>
  );
}
