"use client";

import { useState, useEffect } from "react";

interface NominationHistory {
  id: string;
  productName: string;
  price: number;
  imageUrl: string;
  amazonUrl: string;
  voteCount: number;
  weekNumber: number;
  year: number;
  won: boolean;
  weekStatus: string;
}

interface ProfileData {
  user: { name: string; email: string; office: string };
  history: NominationHistory[];
  stats: { totalNominations: number; totalVotesReceived: number; totalWins: number };
  hasNominatedThisWeek: boolean;
  hasOpenWeek: boolean;
}

interface Props {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: Props) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/profile")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-xl p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/fish.png" alt="" className="h-8 w-8 animate-bounce mx-auto" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{data.user.name}</h2>
              <p className="text-xs text-slate-400">{data.user.email}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
              &times;
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4">
            <div className="text-center">
              <div className="text-xl font-bold text-slate-900">{data.stats.totalNominations}</div>
              <div className="text-xs text-slate-400">Nominations</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-slate-900">{data.stats.totalVotesReceived}</div>
              <div className="text-xs text-slate-400">Votes received</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-500">{data.stats.totalWins}</div>
              <div className="text-xs text-slate-400">Wins</div>
            </div>
          </div>

          {/* See who voted */}
          <a
            href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 text-center text-xs text-purple-500 hover:text-purple-700 underline"
          >
            See who voted for you (Premium)
          </a>
        </div>

        {/* Nominate prompt */}
        {data.hasOpenWeek && !data.hasNominatedThisWeek && (
          <div className="mx-5 mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            You haven&apos;t nominated anything this week!{" "}
            <button onClick={onClose} className="font-medium underline">
              Go nominate something
            </button>
          </div>
        )}

        {/* History */}
        <div className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Your nominations</h3>
          {data.history.length === 0 ? (
            <p className="text-sm text-slate-400">No nominations yet.</p>
          ) : (
            <div className="space-y-3">
              {data.history.map((nom) => (
                <div
                  key={nom.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    nom.won ? "border-green-200 bg-green-50" : "border-slate-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={nom.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded object-contain bg-slate-50 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 line-clamp-1">{nom.productName}</p>
                    <p className="text-xs text-slate-400">
                      Week {nom.weekNumber} · ${nom.price.toFixed(2)} · {nom.voteCount} vote{nom.voteCount !== 1 ? "s" : ""}
                      {nom.won && <span className="ml-1 text-green-600 font-medium">Winner!</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
