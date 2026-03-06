"use client";

import { useState } from "react";

interface Props {
  nomination: {
    id: string;
    productName: string;
    price: number;
    imageUrl: string;
    amazonUrl: string;
    nominatedBy: string;
    voteCount: number;
    userVoted: boolean;
  };
  canVote: boolean;
  canUnvote: boolean;
  onVote: () => void;
  onUnvote: () => void;
  isOwn: boolean;
  isOpen: boolean;
}

export default function ItemCard({
  nomination,
  canVote,
  canUnvote,
  onVote,
  onUnvote,
  isOwn,
  isOpen,
}: Props) {
  const [showHype, setShowHype] = useState(false);
  const [hypeMsg, setHypeMsg] = useState("");
  const [hyping, setHyping] = useState(false);
  const [hyped, setHyped] = useState(false);

  async function handleHype() {
    setHyping(true);
    const res = await fetch("/api/slack/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nominationId: nomination.id,
        type: "hype",
        message: hypeMsg.trim() || undefined,
      }),
    });
    setHyping(false);
    if (res.ok) {
      setHyped(true);
      setHypeMsg("");
      setTimeout(() => { setHyped(false); setShowHype(false); }, 3000);
    }
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition ${
        isOwn ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200"
      }`}
    >
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={nomination.imageUrl}
          alt={nomination.productName}
          className="h-20 w-20 rounded-lg object-contain bg-slate-50"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-slate-900 line-clamp-2">
            {nomination.productName}
          </h3>
          <p className="mt-1 text-lg font-bold text-slate-900">
            ${nomination.price.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">
            by {nomination.nominatedBy}
            {isOwn && " (you)"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-slate-700">
            {nomination.voteCount}
          </span>
          <span className="text-sm text-slate-400">
            vote{nomination.voteCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex gap-2">
          {isOpen && (
            <button
              onClick={() => setShowHype(!showHype)}
              disabled={hyped}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                hyped
                  ? "bg-purple-100 text-purple-600"
                  : "border border-purple-200 text-purple-600 hover:bg-purple-50"
              } disabled:opacity-60`}
            >
              {hyped ? "Sent!" : "Hype it"}
            </button>
          )}
          <a
            href={nomination.amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
          >
            Amazon
          </a>
          {canVote && (
            <button
              onClick={onVote}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              Vote
            </button>
          )}
          {canUnvote && (
            <button
              onClick={onUnvote}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-300"
            >
              Unvote
            </button>
          )}
        </div>
      </div>

      {/* Hype message input */}
      {showHype && !hyped && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={hypeMsg}
            onChange={(e) => setHypeMsg(e.target.value)}
            placeholder="Add a message... (optional)"
            className="flex-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
            onKeyDown={(e) => { if (e.key === "Enter") handleHype(); }}
          />
          <button
            onClick={handleHype}
            disabled={hyping}
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {hyping ? "..." : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}
