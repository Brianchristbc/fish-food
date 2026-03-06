"use client";

import { useState, useEffect, useCallback } from "react";

interface NominationInfo {
  id: string;
  productName: string;
  price: number;
  imageUrl: string;
  nominatedBy: string;
  voteCount: number;
  isWinner: boolean;
}

interface WeekInfo {
  id: string;
  weekNumber: number;
  year: number;
  office: string;
  status: string;
  winningNominationId: string | null;
  nominations: NominationInfo[];
}

export default function AdminPage() {
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/weeks");
    if (res.status === 403) {
      setError("unauthorized");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setWeeks(data.weeks || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleWeek(weekId: string, currentStatus: string) {
    setTogglingId(weekId);
    const action = currentStatus === "OPEN" ? "close" : "open";
    await fetch("/api/admin/weeks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId, action }),
    });
    await refresh();
    setTogglingId(null);
  }

  async function createNewWeek() {
    setCreatingNew(true);
    await fetch("/api/admin/reset-week", { method: "POST" });
    await refresh();
    setCreatingNew(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/fish.png" alt="" className="h-10 w-10 animate-bounce" />
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/fish.png" alt="" className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-500 mb-4">You don&apos;t have admin access.</p>
          <a href="/" className="text-sm text-blue-600 hover:text-blue-700">Back to app</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/fish.png" alt="" className="h-8 w-8" />
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={createNewWeek}
            disabled={creatingNew}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creatingNew ? "Creating..." : "+ New Week"}
          </button>
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
            Back to app
          </a>
        </div>
      </div>

      {/* Weeks list */}
      <div className="space-y-4">
        {weeks.map((week) => {
          const isOpen = week.status === "OPEN";
          const isToggling = togglingId === week.id;
          const winnerNom = week.nominations.find((n) => n.isWinner);

          return (
            <div key={week.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Week header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Week {week.weekNumber}
                      <span className="text-slate-400 font-normal ml-1">{week.year}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {week.nominations.length} nomination{week.nominations.length !== 1 ? "s" : ""}
                      {winnerNom && (
                        <span className="ml-2 text-green-600">
                          Winner: {winnerNom.productName.slice(0, 40)}...
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isOpen ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {week.status}
                  </span>
                  <button
                    onClick={() => toggleWeek(week.id, week.status)}
                    disabled={isToggling}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                      isOpen
                        ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        : "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                    }`}
                  >
                    {isToggling ? "..." : isOpen ? "Close" : "Reopen"}
                  </button>
                </div>
              </div>

              {/* Nominations list (collapsed if empty) */}
              {week.nominations.length > 0 && (
                <div className="px-5 py-3">
                  <div className="space-y-1.5">
                    {week.nominations
                      .sort((a, b) => b.voteCount - a.voteCount)
                      .map((nom) => (
                        <div
                          key={nom.id}
                          className={`flex items-center justify-between py-1.5 ${
                            nom.isWinner ? "text-green-700" : "text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {nom.isWinner && <span className="text-xs">&#127942;</span>}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={nom.imageUrl} alt="" className="h-6 w-6 rounded object-contain bg-slate-50 shrink-0" />
                            <span className="text-sm truncate">{nom.productName}</span>
                            <span className="text-xs text-slate-400 shrink-0">by {nom.nominatedBy}</span>
                          </div>
                          <div className="text-sm font-medium shrink-0 ml-3">
                            {nom.voteCount} vote{nom.voteCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {weeks.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No weeks yet. Click &quot;+ New Week&quot; to create one.
          </div>
        )}
      </div>

      {/* Help */}
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">How it works</h3>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li><strong>Close</strong> — picks a winner (random tiebreak) and locks the week</li>
          <li><strong>Reopen</strong> — clears the winner and reopens for nominations & votes</li>
          <li><strong>+ New Week</strong> — closes any open week and creates a fresh one</li>
          <li>The winning item from the most recent closed week is banned from the next open week</li>
        </ul>
      </div>
    </div>
  );
}
