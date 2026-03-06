"use client";

import { useState, useEffect } from "react";

interface Result {
  weekNumber: number;
  year: number;
  winner: {
    productName: string;
    price: number;
    imageUrl: string;
    amazonUrl: string;
    nominatedBy: string;
    voteCount: number;
  } | null;
}

interface Props {
  office: string;
}

export default function PastResults({ office }: Props) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/results?office=${office}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setLoading(false);
      });
  }, [office]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-slate-500">Loading...</div>;
  }

  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/Reason.svg" alt="" className="h-32 mx-auto mb-4 opacity-40" />
        <p className="text-slate-400">
          No past winners yet. Check back after the first week closes!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="space-y-4">
        {results.map((r) => (
          <div
            key={`${r.year}-${r.weekNumber}`}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {r.winner && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.winner.imageUrl}
                  alt={r.winner.productName}
                  className="h-16 w-16 rounded-lg object-contain bg-slate-50"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-orange-500 mb-1">
                    Week {r.weekNumber}, {r.year}
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 line-clamp-1">
                    {r.winner.productName}
                  </h3>
                  <p className="text-sm text-slate-500">
                    ${r.winner.price.toFixed(2)} · {r.winner.voteCount} votes
                    · nominated by {r.winner.nominatedBy}
                  </p>
                </div>
                <a
                  href={r.winner.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                >
                  Amazon
                </a>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
