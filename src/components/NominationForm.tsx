"use client";

import { useState } from "react";
import FakeCaptcha from "./FakeCaptcha";

interface Props {
  onNominated: () => void;
}

export default function NominationForm({ onNominated }: Props) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);
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

    // Show captcha immediately while TFWA works in the background
    setPending(true);
    setUrl("");

    // Poll until the nomination is no longer PENDING
    const pollInterval = setInterval(async () => {
      const weekRes = await fetch("/api/week/current");
      const weekData = await weekRes.json();
      if (weekData.userNomination?.status !== "PENDING") {
        clearInterval(pollInterval);
        setPending(false);
        onNominated();
      }
    }, 3000);
  }

  if (pending) {
    return (
      <div className="mb-6 space-y-4">
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
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900 mb-1">
        Nominate an item
      </h2>
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
