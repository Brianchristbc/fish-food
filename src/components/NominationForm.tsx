"use client";

import { useState } from "react";

interface Props {
  onNominated: () => void;
}

export default function NominationForm({ onNominated }: Props) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/nominate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amazonUrl: url }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setUrl("");
    onNominated();
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/fish.png" alt="" className="h-5 w-5" />
        <h2 className="text-base font-semibold text-slate-900">
          Nominate an item
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Paste an Amazon product URL (max $49.98). Our TinyFish web agent will swim over and fetch the details.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.amazon.com/..."
          required
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
        <button
          type="submit"
          disabled={submitting}
          style={{ backgroundColor: "#f58220" }}
          className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:brightness-90 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Nominate"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
